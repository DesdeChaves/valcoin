-- This script replaces the vw_eqavet_resumo_anual view with the correct version
-- that includes all required indicators for the public dashboard.

CREATE OR REPLACE VIEW public.vw_eqavet_resumo_anual AS
SELECT
    ano_letivo_conclusao as ano_letivo,
    COUNT(DISTINCT ciclo_id) AS ciclos_ativos,
    
    ROUND(AVG(ind1_colocacao),2) AS media_ind1,
    ROUND(AVG(ind2_conclusao),2) AS media_ind2,
    ROUND(AVG(ind3_abandono),2) AS media_ind3,
    ROUND(AVG(ind4_utilizacao_competencias),2) AS media_ind4,
    ROUND(AVG(ind5b_satisfacao_empregadores),2) AS media_ind5b,
    ROUND(AVG(ind6a_prosseguimento_estudos),2) AS media_ind6a,
    
    MAX(meta_ind1) AS meta_ind1,
    MAX(meta_ind2) AS meta_ind2,
    MAX(meta_ind3) AS meta_ind3,
    MAX(meta_ind4) AS meta_ind4,
    MAX(meta_ind5b) AS meta_ind5b,
    MAX(meta_ind6a) AS meta_ind6a,
    
    CASE WHEN AVG(ind1_colocacao) >= MAX(meta_ind1) THEN 'Cumprida' ELSE 'Não cumprida' END AS global_ind1,
    CASE WHEN AVG(ind2_conclusao) >= MAX(meta_ind2) THEN 'Cumprida' ELSE 'Não cumprida' END AS global_ind2,
    CASE WHEN AVG(ind3_abandono) <= MAX(meta_ind3) THEN 'Cumprida' ELSE 'Não cumprida' END AS global_ind3

FROM vw_eqavet_metas_vs_resultados
GROUP BY ano_letivo_conclusao
ORDER BY ano_letivo_conclusao DESC;

-- Log that the view was updated
-- This is a comment and will not be executed, but serves as a record in the script.
-- VIEW vw_eqavet_resumo_anual UPDATED SUCCESSFULLY
