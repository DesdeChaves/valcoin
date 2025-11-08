import csv
import psycopg2
import psycopg2.extras
import os
import re
from urllib.parse import urlparse
from collections import defaultdict

def get_db_connection_params():
    """Extrai os parâmetros de conexão da DATABASE_URL."""
    database_url = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/valcoin")
    try:
        result = urlparse(database_url)
        db_name = result.path.lstrip('/')
        return {
            "host": result.hostname, "dbname": db_name, "user": result.username,
            "password": result.password, "port": result.port
        }
    except Exception as e:
        print(f"Aviso: Não foi possível analisar a DATABASE_URL ({e}). Usando valores padrão.")
        return {
            "host": "localhost", "dbname": "valcoin", "user": "user",
            "password": "password", "port": "5432"
        }

def load_teacher_emails(csv_path='dados/profs.csv'):
    """Carrega o mapeamento de nome de professor para email a partir do profs.csv."""
    teacher_map = {}
    print(f"A carregar emails dos professores de '{csv_path}'...")
    try:
        with open(csv_path, mode='r', encoding='utf-8-sig') as infile:
            reader = csv.reader(infile, delimiter=';')
            header = next(reader)
            name_idx, email_idx = header.index('Nome Completo'), header.index('E-mail')
            
            for row in reader:
                nome = row[name_idx].strip()
                email = row[email_idx].strip()
                if nome and email:
                    teacher_map[nome] = email
        print(f"{len(teacher_map)} emails de professores carregados.")
        return teacher_map
    except FileNotFoundError:
        print(f"Erro: Ficheiro de professores '{csv_path}' não encontrado. Não é possível mapear professores.")
        return None
    except (ValueError, IndexError) as e:
        print(f"Erro ao ler o ficheiro de professores: {e}")
        return None

def normalize_class_name(raw_name):
    """Normaliza o nome da turma para um formato consistente (ex: '10ºA' -> '10A')."""
    return raw_name.replace('º', '').replace('(','').replace(')','')

def process_assignments():
    """Lê o ficheiro de C.T.s, cria as disciplinas e associações, e inscreve os alunos."""
    print("\nA iniciar o script de atribuição de disciplinas...")
    teacher_email_map = load_teacher_emails()
    if not teacher_email_map:
        return

    # --- Configuração ---
    cts_csv_path = 'dados/cts.csv'
    ano_letivo_default = '2025/26'
    stats = defaultdict(int)
    conn = None
    
    # Caches para evitar queries repetidas
    teacher_id_cache, subject_id_cache, class_id_cache = {}, {}, {}

    try:
        # --- Conexão e Preparação ---
        db_params = get_db_connection_params()
        conn = psycopg2.connect(**db_params)
        cur = conn.cursor()
        print(f"Conectado à base de dados '{db_params['dbname']}'.")

        # --- 1. Ler e processar o ficheiro CSV para obter um conjunto único de tarefas ---
        unique_assignments = set()
        print(f"A ler e a processar o ficheiro de atribuições: {cts_csv_path}")
        with open(cts_csv_path, mode='r', encoding='utf-8-sig') as infile:
            reader = csv.reader(infile, delimiter=';')
            for row in reader:
                if len(row) < 3 or not all(row):
                    stats["linhas_csv_ignoradas"] += 1
                    continue
                
                teacher_name, subject_code, classes_str = [item.strip() for item in row]
                
                # Lidar com múltiplas turmas na mesma linha
                raw_class_names = [c.strip() for c in classes_str.split(',')]
                
                for raw_class_name in raw_class_names:
                    if not raw_class_name:
                        continue
                    
                    # Criar um nome de disciplina único por ano
                    year_match = re.search(r'\d+', raw_class_name)
                    if not year_match:
                        stats["turmas_sem_ano"] += 1
                        continue
                    
                    year = year_match.group(0)
                    unique_subject_name = f"{subject_code} {year}"
                    normalized_class = normalize_class_name(raw_class_name)
                    
                    unique_assignments.add((teacher_name, unique_subject_name, normalized_class, subject_code, year))

        print(f"{len(unique_assignments)} atribuições únicas encontradas para processar.")

        # --- 2. Iterar sobre as atribuições únicas e popular a base de dados ---
        for teacher_name, subject_name, class_name, subject_code, year in unique_assignments:
            
            # -- Obter ID do Professor --
            if teacher_name not in teacher_id_cache:
                teacher_email = teacher_email_map.get(teacher_name)
                if not teacher_email:
                    print(f"AVISO: Email para o professor '{teacher_name}' não encontrado. A ignorar atribuições.")
                    stats["professores_nao_encontrados"] += 1
                    teacher_id_cache[teacher_name] = None # Cache para não repetir o erro
                    continue
                cur.execute("SELECT id FROM users WHERE email = %s;", (teacher_email,))
                result = cur.fetchone()
                teacher_id_cache[teacher_name] = result[0] if result else None
            
            professor_id = teacher_id_cache[teacher_name]
            if not professor_id:
                continue

            # -- Obter/Criar ID da Disciplina --
            if subject_name not in subject_id_cache:
                cur.execute("SELECT id FROM subjects WHERE nome = %s AND ano_letivo = %s;", (subject_name, ano_letivo_default))
                result = cur.fetchone()
                if result:
                    subject_id_cache[subject_name] = result[0]
                else:
                    # CORREÇÃO: Usar o nome único da disciplina (ex: 'POR 10') também como código
                    cur.execute("INSERT INTO subjects (nome, codigo, ano_letivo) VALUES (%s, %s, %s) RETURNING id;", 
                                (subject_name, subject_name, ano_letivo_default))
                    subject_id_cache[subject_name] = cur.fetchone()[0]
                    stats["disciplinas_criadas"] += 1
            disciplina_id = subject_id_cache[subject_name]

            # -- Obter ID da Turma --
            if class_name not in class_id_cache:
                cur.execute("SELECT id FROM classes WHERE nome = %s AND ano_letivo = %s;", (class_name, ano_letivo_default))
                result = cur.fetchone()
                class_id_cache[class_name] = result[0] if result else None
            
            turma_id = class_id_cache[class_name]
            if not turma_id:
                print(f"AVISO: Turma '{class_name}' não encontrada na base de dados. A ignorar esta atribuição.")
                stats["turmas_nao_encontradas"] += 1
                continue

            # -- Criar associação disciplina-turma-professor --
            cur.execute(
                """INSERT INTO disciplina_turma (disciplina_id, turma_id, professor_id, ano_letivo)
                   VALUES (%s, %s, %s, %s) ON CONFLICT (disciplina_id, turma_id, ano_letivo) 
                   DO UPDATE SET professor_id = EXCLUDED.professor_id RETURNING id;""",
                (disciplina_id, turma_id, professor_id, ano_letivo_default)
            )
            disciplina_turma_id = cur.fetchone()[0]
            stats["disciplina_turma_associacoes"] += 1

            # -- Criar associação professor_disciplina_turma --
            cur.execute(
                """INSERT INTO professor_disciplina_turma (professor_id, disciplina_turma_id)
                   VALUES (%s, %s) ON CONFLICT (professor_id, disciplina_turma_id) DO NOTHING;""",
                (professor_id, disciplina_turma_id)
            )
            stats["professor_disciplina_turma_associacoes"] += 1

            # -- Inscrever alunos da turma na disciplina --
            cur.execute("SELECT aluno_id FROM aluno_turma WHERE turma_id = %s AND ano_letivo = %s AND ativo = true;", (turma_id, ano_letivo_default))
            students_in_class = {row[0] for row in cur.fetchall()}
            
            cur.execute("SELECT aluno_id FROM aluno_disciplina WHERE disciplina_turma_id = %s;", (disciplina_turma_id,))
            already_enrolled = {row[0] for row in cur.fetchall()}

            students_to_enroll = list(students_in_class - already_enrolled)

            if students_to_enroll:
                # Usar execute_values para uma inserção em massa eficiente
                insert_query = "INSERT INTO aluno_disciplina (aluno_id, disciplina_turma_id, ativo) VALUES %s ON CONFLICT DO NOTHING;"
                psycopg2.extras.execute_values(
                    cur, insert_query, [(student_id, disciplina_turma_id, True) for student_id in students_to_enroll]
                )
                # print(f"{len(students_to_enroll)} alunos da turma '{class_name}' inscritos em '{subject_name}'.")
                stats["inscricoes_alunos"] += len(students_to_enroll)

        conn.commit()
        print("\n--- Script concluído com sucesso! ---")

    except (Exception, psycopg2.Error) as e:
        print(f"Ocorreu um erro: {e}")
        if conn: conn.rollback()
    finally:
        if conn: cur.close(); conn.close(); print("Conexão à base de dados fechada.")
        print("\n--- Resumo da Operação ---")
        for key, value in stats.items():
            print(f"{key.replace('_', ' ').capitalize()}: {value}")

if __name__ == '__main__':
    process_assignments()