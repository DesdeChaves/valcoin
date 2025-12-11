-- migration_add_responsavel_id_to_eqavet_ciclos_formativos.sql

-- NOTA IMPORTANTE:
-- Execute este script manualmente no seu ambiente de base de dados (e.g., pgAdmin, psql).
-- Certifique-se de fazer um backup da sua base de dados antes de executar qualquer migração.

-- Adiciona a coluna 'responsavel_id' à tabela 'eqavet_ciclos_formativos'
-- Esta coluna irá armazenar o UUID do utilizador (professor) responsável pelo ciclo formativo.
-- 'ON DELETE SET NULL' garante que se um utilizador for apagado, a associação ao ciclo é removida (NULL),
-- em vez de apagar o próprio ciclo.
ALTER TABLE eqavet_ciclos_formativos
ADD COLUMN responsavel_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Adiciona um índice para a nova coluna 'responsavel_id'
-- Isso otimizará as consultas que filtram ou fazem JOIN por esta coluna.
CREATE INDEX idx_eqavet_ciclos_responsavel_id ON eqavet_ciclos_formativos(responsavel_id);

-- Exemplo de como povoar a nova coluna se já tiver dados existentes
-- Este passo é apenas um EXEMPLO e deve ser adaptado à sua lógica de negócio
-- Se não houver dados existentes a migrar para esta coluna, pode ignorar esta secção.
-- UPDATE eqavet_ciclos_formativos
-- SET responsavel_id = (SELECT id FROM users WHERE numero_mecanografico = 'professor_existente_nm')
-- WHERE designacao = 'Designacao do Ciclo Formativo Existente';
