// libs/memoria/memoria.middleware.js

const db = require('../db');

/**
 * Middleware: validarProfessorDisciplina
 * 
 * Verifica se o utilizador autenticado (professor) leciona a disciplina
 * especificada no body (discipline_id) ou nos params (ex: flashcard_id).
 * 
 * Usado em:
 * - POST /api/memoria/flashcards (body.discipline_id)
 * - PUT /api/memoria/flashcards/:id
 * - DELETE /api/memoria/flashcards/:id
 * 
 * Se válido, passa para o próximo handler.
 * Se não, retorna 403 Forbidden.
 */
const validarProfessorDisciplina = async (req, res, next) => {
  try {
    const professor_id = req.user.id;
    let discipline_id = null;

    // 1. Tentativa: body.discipline_id (usado em criação)
    if (req.body && req.body.discipline_id) {
      discipline_id = req.body.discipline_id;
    }

    // 2. Tentativa: params.flashcard_id → buscar discipline_id do flashcard
    if (!discipline_id && req.params && req.params.id) {
      const flashcardResult = await db.query(
        `SELECT discipline_id 
         FROM flashcards 
         WHERE id = $1 AND active = true`,
        [req.params.id]
      );

      if (flashcardResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Flashcard não encontrado ou inativo'
        });
      }

      discipline_id = flashcardResult.rows[0].discipline_id;
    }

    // Se ainda não encontrou discipline_id
    if (!discipline_id) {
      return res.status(400).json({
        success: false,
        message: 'discipline_id não fornecido ou não encontrado'
      });
    }

    // Verificar se o professor leciona essa disciplina (via disciplina_turma ativa)
    const acessoResult = await db.query(`
      SELECT dt.id
      FROM disciplina_turma dt
      JOIN professor_disciplina_turma pdt ON pdt.disciplina_turma_id = dt.id
      WHERE dt.disciplina_id = $1
        AND pdt.professor_id = $2
        AND dt.ativo = true
        AND pdt.ativo = true
      LIMIT 1
    `, [discipline_id, professor_id]);

    if (acessoResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado: você não leciona esta disciplina'
      });
    }

    // Tudo ok → guardar discipline_id para uso posterior se necessário
    req.disciplina_verificada = discipline_id;
    next();

  } catch (error) {
    console.error('Erro no middleware validarProfessorDisciplina:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno na validação de acesso'
    });
  }
};

/**
 * Middleware opcional: validarOwnershipFlashcard
 * 
 * Verifica se o flashcard foi criado pelo próprio professor (para edição/apagamento extra seguro)
 */
const validarOwnershipFlashcard = async (req, res, next) => {
  try {
    const professor_id = req.user.id;
    const { id } = req.params; // flashcard_id

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID do flashcard não fornecido'
      });
    }

    const result = await db.query(
      `SELECT creator_id 
       FROM flashcards 
       WHERE id = $1 AND active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Flashcard não encontrado'
      });
    }

    if (result.rows[0].creator_id !== professor_id) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado: você não é o criador deste flashcard'
      });
    }

    next();

  } catch (error) {
    console.error('Erro no middleware validarOwnershipFlashcard:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno na validação de propriedade'
    });
  }
};

module.exports = {
  validarProfessorDisciplina,
  validarOwnershipFlashcard
};
