const db = require('../db.js');

const getProfessorFeedbackDashboard = async (req, res) => {
  try {
    const professorId = req.user.id;

    // 1. Get professor's disciplines
    const disciplinesQuery = `
      SELECT
          pdt.id AS professor_disciplina_turma_id,
          s.id AS subject_id,
          s.nome AS subject_name,
          s.codigo AS subject_code,
          c.id AS class_id,
          c.nome AS class_name,
          c.codigo AS class_code,
          pdt.ativo AS active
      FROM
          professor_disciplina_turma pdt
      JOIN
          disciplina_turma dt ON pdt.disciplina_turma_id = dt.id
      JOIN
          subjects s ON dt.disciplina_id = s.id
      JOIN
          classes c ON dt.turma_id = c.id
      WHERE
          pdt.professor_id = $1;
    `;
    const { rows: disciplines } = await db.query(disciplinesQuery, [professorId]);

    const professorDisciplinaTurmaIds = disciplines.map(d => d.professor_disciplina_turma_id);

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

    res.json({
      disciplines,
      totalDisciplinas: disciplines.length,
      totalDossiers,
      totalCriterios,
      totalInstrumentos,
      totalContadores,
    });

  } catch (err) {
    console.error('Error fetching professor feedback dashboard data:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getProfessorFeedbackDashboard };
