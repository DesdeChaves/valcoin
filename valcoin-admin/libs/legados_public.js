const express = require('express');
const db = require('./db'); // Assuming db.js is in the parent directory

module.exports = () => {
    const router = express.Router();

    router.get('/stats', async (req, res) => {
        try {
            // Stats gerais
            const totalLegadosQuery = `
                SELECT 
                    COUNT(*) as total_legados,
                    COUNT(DISTINCT aluno_id) as alunos_distintos
                FROM legados;
            `;
            const totalLegados = await db.query(totalLegadosQuery);

            // Por categoria
            const porCategoriaQuery = `
                SELECT 
                    tr.categoria,
                    tr.icon,
                    COUNT(*) as count
                FROM legados l
                JOIN transaction_rules tr ON l.regra_id = tr.id
                WHERE tr.categoria = 'LEGADO'
                GROUP BY tr.categoria, tr.icon
                ORDER BY count DESC;
            `;
            const porCategoria = await db.query(porCategoriaQuery);

            // Top alunos
            const topAlunosQuery = `
                SELECT 
                    u.nome as nome,
                    COUNT(*) as legados,
                    ARRAY_AGG(DISTINCT tr.categoria) as categorias
                FROM legados l
                JOIN users u ON l.aluno_id = u.id
                JOIN transaction_rules tr ON l.regra_id = tr.id
                GROUP BY u.id, u.nome
                ORDER BY legados DESC
                LIMIT 5;
            `;
            const topAlunos = await db.query(topAlunosQuery);

            // Recentes
            const recentesQuery = `
                SELECT 
                    u.nome as aluno,
                    tr.categoria,
                    l.descricao,
                    l.data_atribuicao,
                    prof.nome as atribuidor
                FROM legados l
                JOIN users u ON l.aluno_id = u.id
                JOIN users prof ON l.atribuidor_id = prof.id
                JOIN transaction_rules tr ON l.regra_id = tr.id
                ORDER BY l.data_atribuicao DESC
                LIMIT 3;
            `;
            const recentes = await db.query(recentesQuery);

            res.json({
                totalLegados: totalLegados.rows[0],
                porCategoria: porCategoria.rows,
                topAlunos: topAlunos.rows,
                recentes: recentes.rows
            });

        } catch (err) {
            console.error('Error fetching public legados stats:', err);
            res.status(500).json({ error: 'Erro interno do servidor ao obter estatísticas públicas de legados.' });
        }
    });

    return router;
};
