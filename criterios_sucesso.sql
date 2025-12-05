-- View: Critérios ainda não atingidos por aluno
CREATE VIEW v_criterios_pendentes_aluno AS
SELECT 
    cs.id AS criterio_id,
    cs.codigo AS criterio_codigo,
    cs.nome AS criterio_nome,
    cs.ano_escolaridade_inicial,
    cs.nivel_aceitavel,
    d.nome AS departamento_nome,
    u.id AS aluno_id,
    u.nome AS aluno_nome,
    u.ano_escolar AS ano_atual_aluno,
    ultima_aval.pontuacao AS ultima_pontuacao,
    ultima_aval.ano_letivo AS ultima_avaliacao_ano,
    ultima_aval.created_at AS ultima_avaliacao_data,
    COUNT(todas_aval.id) AS total_avaliacoes,
    -- Quantos anos o aluno está "atrasado" neste critério
    (u.ano_escolar - cs.ano_escolaridade_inicial) AS anos_desde_introducao
FROM criterio_sucesso cs
JOIN departamento d ON d.id = cs.departamento_id
CROSS JOIN users u
LEFT JOIN LATERAL (
    SELECT *
    FROM avaliacao_criterio_sucesso
    WHERE criterio_sucesso_id = cs.id AND aluno_id = u.id
    ORDER BY created_at DESC
    LIMIT 1
) ultima_aval ON true
LEFT JOIN avaliacao_criterio_sucesso todas_aval ON (
    todas_aval.criterio_sucesso_id = cs.id AND todas_aval.aluno_id = u.id
)
WHERE u.tipo_utilizador = 'ALUNO'
    AND u.ativo = true
    AND cs.ativo = true
    AND u.ano_escolar >= cs.ano_escolaridade_inicial
    AND (cs.ano_escolaridade_limite IS NULL OR u.ano_escolar <= cs.ano_escolaridade_limite)
    AND (ultima_aval.atingiu_sucesso IS NULL OR ultima_aval.atingiu_sucesso = false)
GROUP BY cs.id, cs.codigo, cs.nome, cs.ano_escolaridade_inicial, cs.nivel_aceitavel,
         d.nome, u.id, u.nome, u.ano_escolar, 
         ultima_aval.pontuacao, ultima_aval.ano_letivo, ultima_aval.created_at;

-- View: Dashboard para Coordenador de Departamento
CREATE VIEW v_dashboard_departamento AS
SELECT 
    d.id AS departamento_id,
    d.nome AS departamento_nome,
    COUNT(DISTINCT cs.id) AS total_criterios,
    COUNT(DISTINCT s.id) AS total_disciplinas,
    COUNT(DISTINCT csp.professor_id) AS professores_envolvidos,
    COUNT(DISTINCT acs.aluno_id) AS alunos_avaliados,
    COUNT(DISTINCT CASE WHEN acs.atingiu_sucesso = true THEN acs.aluno_id END) AS alunos_com_sucesso,
    ROUND(AVG(acs.pontuacao), 2) AS media_pontuacoes
FROM departamento d
LEFT JOIN criterio_sucesso cs ON cs.departamento_id = d.id AND cs.ativo = true
LEFT JOIN subjects s ON s.departamento_id = d.id AND s.ativo = true
LEFT JOIN criterio_sucesso_professor csp ON csp.criterio_sucesso_id = cs.id AND csp.ativo = true
LEFT JOIN avaliacao_criterio_sucesso acs ON acs.criterio_sucesso_id = cs.id
WHERE d.ativo = true
GROUP BY d.id, d.nome;
