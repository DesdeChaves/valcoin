const db = require('../db.js');

const getProfessorFeedbackDashboard = async (req, res) => {
  try {
    const professorId = req.user.id;

    const disciplinesQuery = `
      SELECT
          d.id AS subject_id,
          d.nome AS subject_name,
          d.codigo AS subject_code,
          json_agg(
              json_build_object(
                  'professor_disciplina_turma_id', dt.id,
                  'disciplina_turma_id', dt.id,
                  'class_name', c.nome,
                  'class_code', c.codigo
              )
          ) AS turmas
      FROM
          disciplina_turma dt
      JOIN
          subjects d ON dt.disciplina_id = d.id
      JOIN
          classes c ON dt.turma_id = c.id
      WHERE
          dt.professor_id = $1 AND dt.ativo = true
      GROUP BY
          d.id, d.nome, d.codigo;
    `;
    const { rows: disciplines } = await db.query(disciplinesQuery, [professorId]);

    const professorDisciplinaTurmaIds = disciplines.flatMap(d => d.turmas.map(t => t.professor_disciplina_turma_id));

    if (professorDisciplinaTurmaIds.length === 0) {
      return res.json({
        disciplines: [],
        totalDisciplinas: 0,
        totalDossiers: 0,
        totalCriterios: 0,
        totalInstrumentos: 0,
        totalContadores: 0,
      });
    }

    // 2. Get counts
    const dossiersQuery = `SELECT COUNT(*) FROM dossie WHERE professor_disciplina_turma_id = ANY($1::uuid[]) AND ativo = true`;
    const { rows: dossierRows } = await db.query(dossiersQuery, [professorDisciplinaTurmaIds]);
    const totalDossiers = parseInt(dossierRows[0].count, 10);

    const criteriosQuery = `
      SELECT COUNT(c.*) 
      FROM criterio c
      JOIN dossie d ON c.dossie_id = d.id
      WHERE d.professor_disciplina_turma_id = ANY($1::uuid[]) AND c.ativo = true AND d.ativo = true
    `;
    const { rows: criterioRows } = await db.query(criteriosQuery, [professorDisciplinaTurmaIds]);
    const totalCriterios = parseInt(criterioRows[0].count, 10);

    const instrumentosQuery = `
      SELECT COUNT(e.*)
      FROM elemento_avaliacao e
      JOIN criterio c ON e.criterio_id = c.id
      JOIN dossie d ON c.dossie_id = d.id
      WHERE d.professor_disciplina_turma_id = ANY($1::uuid[]) AND e.ativo = true AND c.ativo = true AND d.ativo = true
    `;
    const { rows: instrumentoRows } = await db.query(instrumentosQuery, [professorDisciplinaTurmaIds]);
    const totalInstrumentos = parseInt(instrumentoRows[0].count, 10);

    const contadoresQuery = `
      SELECT COUNT(co.*)
      FROM contador co
      JOIN dossie d ON co.dossie_id = d.id
      WHERE d.professor_disciplina_turma_id = ANY($1::uuid[]) AND co.ativo = true AND d.ativo = true
    `;
    const { rows: contadorRows } = await db.query(contadoresQuery, [professorDisciplinaTurmaIds]);
    const totalContadores = parseInt(contadorRows[0].count, 10);

    const disciplinaIds = disciplines.map(d => d.subject_id);

    const competenciasQuery = `
      SELECT COUNT(DISTINCT csp.criterio_sucesso_id)
      FROM criterio_sucesso_professor csp
      WHERE csp.professor_id = $1 AND csp.disciplina_id = ANY($2::uuid[]);
    `;
    const { rows: competenciasRows } = await db.query(competenciasQuery, [professorId, disciplinaIds]);
    const totalCompetencias = parseInt(competenciasRows[0].count, 10);

    const avaliacoesQuery = `
      SELECT COUNT(*) 
      FROM avaliacao_criterio_sucesso 
      WHERE professor_id = $1;
    `;
    const { rows: avaliacoesRows } = await db.query(avaliacoesQuery, [professorId]);
    const totalAvaliacoesCriterios = parseInt(avaliacoesRows[0].count, 10);

    res.json({
      disciplines,
      totalDisciplinas: disciplines.length,
      totalDossiers,
      totalCriterios,
      totalInstrumentos,
      totalContadores,
      totalCompetencias,
      totalAvaliacoesCriterios,
    });

  } catch (err) {
    console.error('Error fetching professor feedback dashboard data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getProfessorFeedbackDashboard };
