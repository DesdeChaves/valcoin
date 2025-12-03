// valcoin-admin/libs/qualidade/student.js

const db = require('../db');

const getQuestionarioByAplicacao = async (req, res) => {
    const { id } = req.params; // aplicacao_id
    const { id: userId } = req.user;

    try {
        // First, check if the student is a valid recipient of this application
        const recipientCheck = await db.query(
            `SELECT id FROM public.destinatarios_aplicacao 
             WHERE aplicacao_id = $1 AND user_id = $2 AND respondido_em IS NULL`,
            [id, userId]
        );

        if (recipientCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Você não tem permissão para responder a este questionário ou já o respondeu.' });
        }

        const destinatario_id = recipientCheck.rows[0].id;

        // Fetch the questionnaire details
        const { rows: aplicacaoRows } = await db.query(
            `SELECT q.*, aq.id as aplicacao_id, aq.titulo_customizado, aq.mensagem_introducao, aq.mensagem_conclusao, q.permite_anonimo
             FROM public.aplicacoes_questionario aq
             JOIN public.questionarios q ON q.id = aq.questionario_id
             WHERE aq.id = $1 AND aq.ativo = true AND aq.data_abertura <= NOW() AND (aq.data_fecho IS NULL OR aq.data_fecho >= NOW())`,
            [id]
        );

        if (aplicacaoRows.length === 0) {
            return res.status(404).json({ error: 'Questionário não encontrado, ou fora do período de resposta.' });
        }

        const questionario = aplicacaoRows[0];

        // Fetch questions and options
        const { rows: perguntaRows } = await db.query(
            `SELECT * FROM public.perguntas WHERE questionario_id = $1 ORDER BY pagina, ordem`,
            [questionario.id]
        );

        const { rows: opcaoRows } = await db.query(
            `SELECT * FROM public.opcoes_resposta 
             WHERE pergunta_id IN (SELECT id FROM public.perguntas WHERE questionario_id = $1)
             ORDER BY pergunta_id, ordem`,
            [questionario.id]
        );

        // Structure the data
        questionario.perguntas = perguntaRows.map(p => ({
            ...p,
            opcoes: opcaoRows.filter(o => o.pergunta_id === p.id)
        }));

        questionario.destinatario_id = destinatario_id;

        res.json(questionario);

    } catch (err) {
        console.error('Erro ao buscar questionário por aplicação:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};


const getStudentAplications = async (req, res) => {
    const { id: userId } = req.user;

    try {
        const { rows } = await db.query(
            `SELECT 
                aq.id,
                COALESCE(aq.titulo_customizado, q.titulo) as titulo,
                q.descricao,
                aq.data_abertura,
                aq.data_fecho,
                da.respondido_em,
                CASE 
                    WHEN da.respondido_em IS NOT NULL THEN 'respondido'
                    WHEN aq.data_fecho < now() THEN 'expirado'
                    WHEN aq.data_abertura > now() THEN 'agendado'
                    ELSE 'pendente'
                END AS estado
             FROM public.aplicacoes_questionario aq
             JOIN public.questionarios q ON q.id = aq.questionario_id
             JOIN public.destinatarios_aplicacao da ON da.aplicacao_id = aq.id
             WHERE da.user_id = $1 AND da.tipo_destinatario = 'aluno' AND aq.ativo = true
             ORDER BY aq.data_abertura DESC`,
            [userId]
        );

        res.json(rows);

    } catch (err) {
        console.error('Erro ao buscar aplicações do aluno:', err);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
}

const { withTransaction } = require('../db');

//...

const submeterRespostaAutenticada = async (req, res) => {
    const { id: aplicacaoId } = req.params;
    const { id: userId } = req.user;
    const { resposta_questionario, itens_resposta } = req.body;

    if (!resposta_questionario || !itens_resposta) {
        return res.status(400).json({ error: 'Payload inválido' });
    }

    try {
        const ipAddress = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || null;

        const respostaId = await withTransaction(async (client) => {
            // 1. Verificar se o aluno pode responder
            const recipientCheck = await client.query(
                `SELECT id, respondido_em FROM public.destinatarios_aplicacao 
                 WHERE aplicacao_id = $1 AND user_id = $2`,
                [aplicacaoId, userId]
            );

            if (recipientCheck.rows.length === 0) {
                throw { statusCode: 403, message: 'Você não tem permissão para responder a este questionário.' };
            }

            const destinatario = recipientCheck.rows[0];

            if (destinatario.respondido_em) {
                throw { statusCode: 403, message: 'Você já respondeu a este questionário.' };
            }

            // 2. Inserir a resposta principal
            const insertRespostaQuery = `
                INSERT INTO respostas_questionario (
                    aplicacao_id, destinatario_id, user_id, anonimo, tempo_decorrido_segundos, 
                    completado, ip_address, user_agent, submetido_em
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                RETURNING id
            `;
            const respostaValues = [
                aplicacaoId,
                destinatario.id,
                userId,
                !!resposta_questionario.anonimo,
                resposta_questionario.tempo_decorrido_segundos || 0,
                resposta_questionario.completado !== false,
                ipAddress,
                req.headers['user-agent']
            ];
            const respostaResult = await client.query(insertRespostaQuery, respostaValues);
            const newRespostaId = respostaResult.rows[0].id;

            // 3. Inserir os itens de resposta
            for (const item of itens_resposta) {
                const insertItemQuery = `
                    INSERT INTO itens_resposta (
                        resposta_id, pergunta_id, texto, opcoes_selecionadas, valor_numerico,
                        valor_data, valor_hora, ficheiros_url, tempo_resposta_segundos
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `;
                const itemValues = [
                    newRespostaId, item.pergunta_id, item.texto, item.opcoes_selecionadas,
                    item.valor_numerico, item.valor_data, item.valor_hora,
                    item.ficheiros_url, item.tempo_resposta_segundos
                ];
                await client.query(insertItemQuery, itemValues);
            }

            // 4. Atualizar o destinatário
            await client.query('UPDATE destinatarios_aplicacao SET respondido_em = NOW() WHERE id = $1', [destinatario.id]);
            
            // 5. Atualizar o contador na aplicação
            await client.query('UPDATE aplicacoes_questionario SET total_respostas = COALESCE(total_respostas, 0) + 1 WHERE id = $1', [aplicacaoId]);

            return newRespostaId;
        });

        res.status(201).json({ success: true, message: 'Resposta submetida com sucesso.', resposta_id: respostaId });

    } catch (error) {
        console.error('Erro ao submeter resposta:', error);
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ error: 'Erro ao submeter resposta.', details: error.message });
    }
};

module.exports = {
    getQuestionarioByAplicacao,
    getStudentAplications,
    submeterRespostaAutenticada,
};
