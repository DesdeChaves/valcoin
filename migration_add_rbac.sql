-- migration_add_rbac.sql

-- NOTA IMPORTANTE:
-- Execute este script manualmente no seu ambiente de base de dados (e.g., pgAdmin, psql).
-- Certifique-se de fazer um backup da sua base de dados antes de executar qualquer migração.

-- 1. Criação da tabela 'roles'
--    Esta tabela define todas as funções (roles) possíveis no sistema.
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- Ex: 'admin', 'professor', 'aluno', 'coordenador_departamento', 'responsavel_ciclo'
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Coluna para ativar/desativar funções globalmente
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Criação da tabela 'user_roles'
--    Esta tabela de ligação (muitos-para-muitos) atribui funções a utilizadores.
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Garante que um utilizador só pode ter uma função específica uma vez
    PRIMARY KEY (user_id, role_id)
);

-- 3. Adição de índices para otimização de performance
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- 4. Povoar com funções iniciais
--    Adicione mais funções conforme necessário.
INSERT INTO roles (name, description, is_active) VALUES
('admin', 'Administrador do sistema com acesso total.', TRUE),
('professor', 'Professor com permissões de ensino e avaliação.', TRUE),
('aluno', 'Aluno com acesso às suas informações e recursos.', TRUE),
('coordenador_departamento', 'Professor que coordena um departamento.', TRUE),
('responsavel_ciclo', 'Professor responsável por um ciclo formativo.', TRUE)
ON CONFLICT (name) DO NOTHING; -- Previne erros se as funções já existirem

-- 5. Migrar funções implícitas existentes para o novo sistema RBAC
--    Este exemplo migra os coordenadores de departamento existentes.
--    ASSUME-SE que 'departamento.coordenador_id' é um UUID válido que referencia a tabela 'users'.
--    Se existirem coordenadores na tabela 'users' sem um 'departamento.coordenador_id',
--    terá que os atribuir manualmente.
INSERT INTO user_roles (user_id, role_id)
SELECT
    d.coordenador_id,
    (SELECT id FROM roles WHERE name = 'coordenador_departamento')
FROM
    departamento d
WHERE
    d.coordenador_id IS NOT NULL
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 6. Função para atualizar automaticamente a coluna 'updated_at' (boa prática)
--    Cria uma função PL/pgSQL para ser usada por triggers.
CREATE OR REPLACE FUNCTION update_updated_at_column_roles()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Criar triggers para atualizar 'updated_at' nas novas tabelas
CREATE TRIGGER update_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column_roles();

CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON user_roles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column_roles();

-- 8. Limpeza de campos de funções implícitas antigas (OPCIONAL - SOMENTE APÓS TESTES COMPLETOS)
--    Após a migração e testes exaustivos para garantir que a sua aplicação
--    está a usar o novo sistema RBAC para verificar estas funções, pode remover
--    as colunas antigas para evitar redundância e confusão.
-- ALTER TABLE departamento DROP COLUMN coordenador_id;

--    Para 'ciclos_formativos', se for adicionar um 'responsavel_id', comece já
--    a usar o sistema RBAC e a tabela 'user_roles' em vez de adicionar um campo
--    diretamente à tabela 'ciclos_formativos' para a função.

-- Exemplo de como associar um responsável de ciclo formativo a um ciclo,
-- mantendo a atribuição na tabela 'ciclos_formativos' mas usando a função RBAC:
-- CREATE TABLE ciclos_formativos (
--     ...
--     responsavel_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Apenas se for um responsável único
--     ...
-- );
-- Note que o 'responsavel_id' na ciclos_formativos associa um user a um *ciclo*,
-- enquanto a função 'responsavel_ciclo' em user_roles indica que o user *tem a capacidade*
-- de ser responsável por um ciclo.
