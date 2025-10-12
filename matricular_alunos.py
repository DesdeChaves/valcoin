
import csv
import psycopg2
import bcrypt
import os
import re
from urllib.parse import urlparse

def get_db_connection_params():
    """
    Extrai os parâmetros de conexão da variável de ambiente DATABASE_URL usando urllib.
    Usa valores padrão se a variável não estiver definida.
    """
    database_url = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/valcoin")
    
    try:
        result = urlparse(database_url)
        db_name = result.path.lstrip('/')
        if '?' in db_name:
            db_name = db_name.split('?')[0]

        return {
            "host": result.hostname,
            "dbname": db_name,
            "user": result.username,
            "password": result.password,
            "port": result.port
        }
    except Exception as e:
        print(f"Aviso: Não foi possível analisar a DATABASE_URL ({e}). A usar valores padrão.")
        return {
            "host": "localhost", "dbname": "valcoin", "user": "user",
            "password": "password", "port": "5432"
        }

def process_enrollments():
    """
    Lê um ficheiro CSV de alunos, cria as turmas e os alunos na BD, 
    e efetua a matrícula na turma correspondente.
    """
    print("A iniciar o script de matrícula de alunos...")

    # --- Configuração ---
    csv_file_path = 'dados/alunos_rita.csv'
    password_to_hash = b'password123'
    ano_letivo_default = '2025/26'
    
    # --- Hashing da Password ---
    print("A gerar o hash da password...")
    try:
        salt = bcrypt.gensalt()
        hashed_password = bcrypt.hashpw(password_to_hash, salt).decode('utf-8')
        print("Hash da password gerado com sucesso.")
    except Exception as e:
        print(f"Erro ao gerar o hash da password: {e}")
        return

    # --- Conexão à Base de Dados ---
    conn = None
    class_cache = {}
    stats = {"alunos_processed": 0, "turmas_created": 0, "enrollments_made": 0, "skipped": 0}

    try:
        db_params = get_db_connection_params()
        print(f"A conectar à base de dados '{db_params['dbname']}' no host '{db_params['host']}'...")
        conn = psycopg2.connect(**db_params)
        cur = conn.cursor()
        print("Conexão estabelecida com sucesso.")

        # --- Leitura e Inserção de Dados ---
        print(f"A ler o ficheiro CSV: {csv_file_path}")
        with open(csv_file_path, mode='r', encoding='utf-8-sig') as infile:
            reader = csv.reader(infile, delimiter=';')
            header = next(reader)

            # Mapeamento de colunas
            col_map = {name: idx for idx, name in enumerate(header)}

            for row in reader:
                # Extrair dados da linha
                num_processo = row[col_map['N.º Processo']].strip()
                nome_aluno = row[col_map['Nome']].strip()
                turma_ano_str = row[col_map['Turma - Ano']].strip()
                turma_sigla = row[col_map['Turma - Sigla']].strip()

                # Validar dados essenciais
                if not num_processo or not nome_aluno or not turma_ano_str or not turma_sigla:
                    print(f"Aviso: Dados em falta na linha para o aluno '{nome_aluno or num_processo}'. A ignorar.")
                    stats["skipped"] += 1
                    continue
                
                stats["alunos_processed"] += 1

                # --- 1. Criar ou Obter Turma ---
                ano_turma_num = re.search(r'\d+', turma_ano_str)
                if not ano_turma_num:
                    print(f"Aviso: Não foi possível extrair o ano da turma '{turma_ano_str}' para o aluno {nome_aluno}. A ignorar.")
                    stats["skipped"] += 1
                    continue
                
                turma_nome = f"{ano_turma_num.group(0)}{turma_sigla}"
                turma_id = class_cache.get(turma_nome)

                if not turma_id:
                    cur.execute("SELECT id FROM classes WHERE nome = %s AND ano_letivo = %s;", (turma_nome, ano_letivo_default))
                    result = cur.fetchone()
                    if result:
                        turma_id = result[0]
                    else:
                        print(f"Turma '{turma_nome}' não encontrada. A criar...")
                        cur.execute(
                            "INSERT INTO classes (nome, codigo, ano_letivo, ativo) VALUES (%s, %s, %s, true) RETURNING id;",
                            (turma_nome, turma_nome, ano_letivo_default)
                        )
                        turma_id = cur.fetchone()[0]
                        stats["turmas_created"] += 1
                        print(f"Turma '{turma_nome}' criada com ID: {turma_id}")
                    class_cache[turma_nome] = turma_id

                # --- 2. Criar Aluno (User) ---
                email_aluno = f"aluno.{num_processo}@aeviseu.edu.pt"
                cur.execute(
                    """INSERT INTO users (numero_mecanografico, nome, email, tipo_utilizador, password_hash, ativo)
                       VALUES (%s, %s, %s, 'ALUNO', %s, true)
                       ON CONFLICT (numero_mecanografico) DO UPDATE SET nome = EXCLUDED.nome, email = EXCLUDED.email, ativo = true
                       RETURNING id;""",
                    (num_processo, nome_aluno, email_aluno, hashed_password)
                )
                aluno_id = cur.fetchone()[0]

                # --- 3. Matricular Aluno na Turma ---
                cur.execute(
                    """INSERT INTO aluno_turma (aluno_id, turma_id, ano_letivo, ativo)
                       VALUES (%s, %s, %s, true)
                       ON CONFLICT (aluno_id, turma_id, ano_letivo) DO NOTHING;""",
                    (aluno_id, turma_id, ano_letivo_default)
                )
                if cur.rowcount > 0:
                    stats["enrollments_made"] += 1
                    print(f"Aluno '{nome_aluno}' matriculado na turma '{turma_nome}'.")
                else:
                    print(f"Aviso: Aluno '{nome_aluno}' já se encontra matriculado na turma '{turma_nome}'.")

        # Commit das transações
        conn.commit()
        print("\n--- Script concluído com sucesso! ---")

    except FileNotFoundError:
        print(f"Erro: O ficheiro '{csv_file_path}' não foi encontrado.")
    except psycopg2.Error as e:
        print(f"Erro de base de dados: {e}")
        if conn: conn.rollback()
    except Exception as e:
        print(f"Ocorreu um erro inesperado: {e}")
        if conn: conn.rollback()
    finally:
        if conn:
            cur.close()
            conn.close()
            print("Conexão à base de dados fechada.")
        
        print("\n--- Resumo da Operação ---")
        print(f"Alunos processados: {stats['alunos_processed']}")
        print(f"Turmas novas criadas: {stats['turmas_created']}")
        print(f"Matrículas novas realizadas: {stats['enrollments_made']}")
        print(f"Registos ignorados (dados em falta): {stats['skipped']}")

if __name__ == '__main__':
    process_enrollments()
