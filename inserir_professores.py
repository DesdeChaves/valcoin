import csv
import psycopg2
import bcrypt
import os
from urllib.parse import urlparse

def get_db_connection_params():
    """
    Extrai os parâmetros de conexão da variável de ambiente DATABASE_URL usando urllib.
    Usa valores padrão se a variável não estiver definida.
    """
    # Alterado 'postgres' para 'localhost' para permitir a execução fora do Docker.
    database_url = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/valcoin")
    
    try:
        result = urlparse(database_url)
        
        # O nome da base de dados é o 'path' da URL, sem a barra inicial.
        db_name = result.path.lstrip('/')

        # Garantir que quaisquer parâmetros de query (como ?sslmode=) são removidos
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
            "host": "localhost",
            "dbname": "valcoin",
            "user": "user",
            "password": "password",
            "port": "5432"
        }

def insert_professors():
    """
    Lê o ficheiro CSV de professores e insere-os na base de dados.
    """
    print("A iniciar o script de inserção de professores...")

    # --- Verificação de dependências ---
    try:
        import psycopg2
        import bcrypt
    except ImportError as e:
        print(f"Erro: Biblioteca necessária não encontrada - {e.name}.")
        print("Por favor, instale as bibliotecas necessárias executando:")
        print("pip install psycopg2-binary bcrypt")
        return

    # --- Configuração ---
    csv_file_path = 'dados/profs.csv'
    password_to_hash = b'password123'
    
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
    try:
        db_params = get_db_connection_params()
        print(f"A conectar à base de dados '{db_params['dbname']}' no host '{db_params['host']}'...")
        conn = psycopg2.connect(**db_params)
        cur = conn.cursor()
        print("Conexão estabelecida com sucesso.")

        # --- Leitura e Inserção de Dados ---
        print(f"A ler o ficheiro CSV: {csv_file_path}")
        
        # Usar 'utf-8-sig' para lidar com o BOM (Byte Order Mark)
        with open(csv_file_path, mode='r', encoding='utf-8-sig') as infile:
            reader = csv.reader(infile, delimiter=';')
            header = next(reader)  # Ignorar o cabeçalho

            # Mapeamento de colunas (ajuste se os nomes no CSV mudarem)
            try:
                name_idx = header.index('Nome Completo')
                email_idx = header.index('E-mail')
                num_proc_idx = header.index('BI/Nº Processo')
            except ValueError as e:
                print(f"Erro: Coluna esperada não encontrada no cabeçalho do CSV: {e}")
                return

            inserted_count = 0
            skipped_count = 0
            for row in reader:
                # Extrair dados da linha
                nome_completo = row[name_idx].strip()
                email = row[email_idx].strip()
                numero_mecanografico = row[num_proc_idx].strip()

                # Validar dados essenciais
                if not email:
                    print(f"Aviso: E-mail em falta para o professor '{nome_completo}'. A ignorar este registo.")
                    skipped_count += 1
                    continue
                
                if not numero_mecanografico:
                    print(f"Aviso: Nº de Processo em falta para o professor '{nome_completo}'. A ignorar este registo.")
                    skipped_count += 1
                    continue

                # Inserir na base de dados
                try:
                    cur.execute(
                        '''
                        INSERT INTO public.users (numero_mecanografico, nome, email, tipo_utilizador, password_hash)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (email) DO NOTHING;
                        ''',
                        (numero_mecanografico, nome_completo, email, 'PROFESSOR', hashed_password)
                    )
                    # Se a linha foi afetada, a inserção (ou o conflito) ocorreu
                    if cur.rowcount > 0:
                        print(f"Professor '{nome_completo}' inserido com sucesso.")
                        inserted_count += 1
                    else:
                        print(f"Aviso: Professor com e-mail '{email}' já existe. A ignorar.")
                        skipped_count += 1

                except psycopg2.Error as e:
                    print(f"Erro na base de dados ao inserir '{nome_completo}': {e}")
                    conn.rollback() # Reverter a transação atual em caso de erro
                    skipped_count += 1

        # Commit das transações bem-sucedidas
        conn.commit()
        print("\nResumo da operação:")
        print(f"  - {inserted_count} professores inseridos com sucesso.")
        print(f"  - {skipped_count} registos ignorados (e-mail/nº processo em falta ou duplicados).")

    except FileNotFoundError:
        print(f"Erro: O ficheiro '{csv_file_path}' não foi encontrado.")
    except psycopg2.Error as e:
        print(f"Erro de conexão com a base de dados: {e}")
    except Exception as e:
        print(f"Ocorreu um erro inesperado: {e}")
    finally:
        if conn:
            cur.close()
            conn.close()
            print("Conexão à base de dados fechada.")

if __name__ == '__main__':
    insert_professors()
