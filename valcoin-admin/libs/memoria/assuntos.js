// valcoin-admin/libs/memoria/assuntos.js
const db = require('../db');

const getAssuntosByDisciplina = async (discipline_id) => {
  const result = await db.query(
    'SELECT * FROM assuntos WHERE discipline_id = $1 ORDER BY name',
    [discipline_id]
  );
  return result.rows;
};

const findOrCreateAssunto = async (name, discipline_id) => {
  // First, try to find the subject
  let result = await db.query(
    'SELECT * FROM assuntos WHERE name = $1 AND discipline_id = $2',
    [name, discipline_id]
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  // If not found, create it
  result = await db.query(
    'INSERT INTO assuntos (name, discipline_id) VALUES ($1, $2) RETURNING *',
    [name, discipline_id]
  );
  return result.rows[0];
};

module.exports = {
  getAssuntosByDisciplina,
  findOrCreateAssunto,
};
