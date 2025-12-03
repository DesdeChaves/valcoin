// routes/qualidade.js

const express = require('express');
const router = express.Router();
const qualidadeService = require('./forms');
const respostasService = require('./responses');
const db = require('../db');
const crypto = require('crypto');
const { getQuestionarioByAplicacao, getStudentAplications, submeterRespostaAutenticada } = require('./student.js');
const qualidadeController = require('./controllers/qualidadeController');

// Helper function to generate a secure random token
function generateAccessToken() {
  return crypto.randomBytes(32).toString('hex'); // 32 bytes = 64 hex characters
}

// ========================================================
// ROTA PÚBLICA (não requer autenticação)
// ========================================================

const publicRouter = express.Router();

// ROTA PÚBLICA PARA RESPONDER VIA TOKEN
publicRouter.get('/responder/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log('🔓 Public route accessed - token:', token);

    // 1. Buscar a aplicação pelo token_acesso
    const appResult = await db.query(`
      SELECT 
        a.id AS aplicacao_id,
        a.questionario_id,
        a.titulo_customizado,
        COALESCE(a.titulo_customizado, q.titulo) AS titulo,
        a.mensagem_introducao,
        a.data_abertura,
        a.data_fecho,
        q.permite_anonimo
      FROM public.aplicacoes_questionario a
      JOIN public.questionarios q ON q.id = a.questionario_id
      WHERE a.token_acesso = $1
        AND a.ativo = true
        AND (a.data_abertura IS NULL OR a.data_abertura <= NOW())
        AND (a.data_fecho IS NULL OR a.data_fecho >= NOW())
      LIMIT 1
    `, [token]);

    if (appResult.rows.length === 0) {
      return res.status(404).json({ 
        message: 'Link inválido, expirado ou questionário desativado.' 
      });
    }

    const aplicacao = appResult.rows[0];

    // 2. Buscar perguntas + opções
    const perguntasResult = await db.query(`
      SELECT 
        p.id,
        p.enunciado,
        p.descricao,
        p.tipo,
        p.obrigatoria,
        p.ordem,
        p.pagina,
        p.config,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', o.id,
              'texto', o.texto,
              'ordem', o.ordem,
              'e_correta', o.e_correta
            )
            ORDER BY o.ordem
          )
          FROM public.opcoes_resposta o 
          WHERE o.pergunta_id = p.id
          ), '[]'
        ) AS opcoes
      FROM public.perguntas p
      WHERE p.questionario_id = $1
      ORDER BY p.ordem
    `, [aplicacao.questionario_id]);

    console.log('✅ Found', perguntasResult.rows.length, 'questions');

    res.json({
      aplicacao: {
        id: aplicacao.aplicacao_id,
        titulo: aplicacao.titulo,
        mensagem_introducao: aplicacao.mensagem_introducao,
        permite_anonimo: aplicacao.permite_anonimo
      },
      perguntas: perguntasResult.rows
    });

  } catch (error) {
    console.error('❌ Error in /responder/:token:', error);
    res.status(500).json({ message: 'Erro interno do servidor.' });
  }
});




// ============================================================
// ROTAS PÚBLICAS - Responder questionários (não requer auth)
// ============================================================




publicRouter.get('/responder/:token', qualidadeController.getQuestionarioByToken);
publicRouter.post('/responder/:token', qualidadeController.submeterRespostaQuestionario);

publicRouter.post('/responder/:token', qualidadeController.submeterRespostaQuestionario);

// ========================================================
// ROTAS PROTEGIDAS (requerem autenticação)
// ========================================================

// ============================================================
// ROTAS PROTEGIDAS - Ver respostas (requer auth)
// ============================================================


router.get('/aplicacoes/:id/respostas', qualidadeController.getRespostasByAplicacao);
router.get('/respostas/:id', qualidadeController.getRespostaById);
router.get('/aplicacoes/:id/estatisticas', qualidadeController.getEstatisticasAplicacao);
router.get('/aplicacoes/:id/respostas', qualidadeController.getRespostasByAplicacao);
// LISTAR TODOS OS QUESTIONÁRIOS
router.get('/questionarios', async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.tipo_utilizador === 'ADMIN';

    const query = `
      SELECT 
        q.id,
        q.titulo,
        q.descricao,
        q.categoria,
        q.visibilidade,
        q.data_criacao,
        u.nome AS criador_nome,
        COUNT(p.id) AS total_perguntas
      FROM public.questionarios q
      JOIN public.users u ON u.id = q.criador_id
      LEFT JOIN public.perguntas p ON p.questionario_id = q.id
      WHERE ${isAdmin} OR q.criador_id = $1 OR q.visibilidade IN ('escola', 'publico')
      GROUP BY q.id, u.nome
      ORDER BY q.data_criacao DESC
    `;

    const result = await db.query(query, isAdmin ? [] : [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar questionários:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});


// OBTER TEMPLATES DE QUESTIONÁRIOS
router.get('/questionarios/templates', async (req, res) => {
  try {
    const templates = await qualidadeService.getQuestionariosTemplates();
    res.json(templates);
  } catch (error) {
    console.error('Erro ao obter templates de questionários:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao obter templates.' });
  }
});

// ... (resto das rotas protegidas permanecem iguais)

// CRIAR QUESTIONÁRIO
router.post('/questionarios', async (req, res) => {
  try {
    const { titulo, descricao = '', categoria = 'quiz', visibilidade = 'privado', perguntas = [] } = req.body;

    const qRes = await db.query(`
      INSERT INTO public.questionarios (titulo, descricao, criador_id, visibilidade, categoria)
      VALUES ($1, $2, $3, $4, $5) RETURNING id
    `, [titulo, descricao, req.user.id, visibilidade, categoria]);

    const questionarioId = qRes.rows[0].id;

    for (const p of perguntas) {
      const pRes = await db.query(`
        INSERT INTO public.perguntas (questionario_id, enunciado, tipo, obrigatoria, ordem, pagina, descricao)
        VALUES ($1, $2, $3, $4, $5, 1, $6) RETURNING id
      `, [questionarioId, p.enunciado, p.tipo, p.obrigatoria, p.ordem, p.descricao]);

      const perguntaId = pRes.rows[0].id;

      if (p.opcoes && p.opcoes.length > 0) {
        for (const op of p.opcoes) {
          await db.query(`
            INSERT INTO public.opcoes_resposta (pergunta_id, texto, ordem, e_correta)
            VALUES ($1, $2, $3, $4)
          `, [perguntaId, op.texto, op.ordem, op.e_correta]);
        }
      }
    }

    res.status(201).json({ id: questionarioId });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
});

// LISTAR APLICAÇÕES (INSTÂNCIAS DE QUESTIONÁRIOS)
router.get('/aplicacoes', async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.tipo_utilizador === 'ADMIN';

    const filters = {};
    if (!isAdmin) {
      filters.aplicador_id = userId;
    }

    const aplicacoes = await qualidadeService.getAplicacoes(filters);
    res.json(aplicacoes);
  } catch (error) {
    console.error('Erro ao listar aplicações:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao listar aplicações.' });
  }
});

// CRIAR APLICAÇÃO (INSTANCIA DE QUESTIONARIO)
router.post('/aplicacoes', async (req, res) => {
  try {
    const {
      questionario_id,
      tipo_aplicacao,
      // ... outras propriedades da aplicação
      ...restOfData
    } = req.body;

    let token_acesso = null;
    if (tipo_aplicacao === 'link_aberto') {
      token_acesso = generateAccessToken();
      console.log('Generated token for open link:', token_acesso);
    }

    const newAplicacao = await qualidadeService.createAplicacaoQuestionario({
      questionario_id,
      aplicador_id: req.user.id, // O usuário autenticado é o aplicador
      tipo_aplicacao,
      token_acesso, // Passa o token gerado (será null se não for link_aberto)
      ...restOfData
    });

    res.status(201).json(newAplicacao);

  } catch (error) {
    console.error('Erro ao criar aplicação:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao criar aplicação.' });
  }
});

// ATUALIZAR UMA APLICAÇÃO
router.put('/aplicacoes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // TODO: Adicionar verificação de permissão. O utilizador pode atualizar esta aplicação?
    // Ex: req.user.id deve ser o aplicador_id ou o user deve ser admin.

    const updatedAplicacao = await qualidadeService.updateAplicacao(id, updateData);

    if (!updatedAplicacao) {
      return res.status(404).json({ message: 'Aplicação não encontrada.' });
    }

    res.json(updatedAplicacao);
  } catch (error) {
    console.error('Erro ao atualizar aplicação:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao atualizar aplicação.' });
  }
});

// APAGAR APLICAÇÃO (SOFT-DELETE)
router.delete('/aplicacoes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await qualidadeService.deleteAplicacao(id);
    res.status(204).send(); // No Content
  } catch (error) {
    console.error('Erro ao apagar aplicação:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao apagar aplicação.' });
  }
});

// OBTER UMA APLICAÇÃO POR ID
router.get('/aplicacoes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Buscar detalhes da aplicação
    const appResult = await db.query(`
        SELECT a.*, q.titulo as questionario_titulo 
        FROM public.aplicacoes_questionario a
        JOIN public.questionarios q ON q.id = a.questionario_id
        WHERE a.id = $1
    `, [id]);

    if (appResult.rows.length === 0) {
        return res.status(404).json({ message: 'Aplicação não encontrada.' });
    }
    const aplicacao = appResult.rows[0];

    // 2. Buscar perguntas e opções
    const perguntasResult = await db.query(`
        SELECT 
            p.id, p.enunciado, p.descricao, p.tipo, p.obrigatoria, p.ordem, p.pagina, p.config,
            COALESCE(
              (SELECT json_agg(
                json_build_object('id', o.id, 'texto', o.texto, 'ordem', o.ordem)
                ORDER BY o.ordem
              )
              FROM public.opcoes_resposta o 
              WHERE o.pergunta_id = p.id
              ), '[]'
            ) AS opcoes
        FROM public.perguntas p
        WHERE p.questionario_id = $1
        ORDER BY p.ordem
    `, [aplicacao.questionario_id]);

    aplicacao.perguntas = perguntasResult.rows;

    res.json(aplicacao);
    
  } catch (error) {
    console.error('Erro ao obter aplicação com perguntas:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao obter aplicação.' });
  }
});



// ... (resto das rotas)

const studentRouter = express.Router();

// Student routes
studentRouter.get('/aplicacoes', getStudentAplications);
studentRouter.get('/aplicacoes/:id/questionario', getQuestionarioByAplicacao);
studentRouter.post('/aplicacoes/:id/responder', submeterRespostaAutenticada);


// EXPORTAR AMBOS OS ROUTERS
module.exports = {
  protectedRouter: router,
  publicRouter: publicRouter,
  studentRouter: studentRouter
};
