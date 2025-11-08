const db = require('./valcoin-admin/libs/db.js');

async function getProfessorDisciplineCount(professorId) {
    try {
        const query = `
            SELECT COUNT(*)
            FROM professor_disciplina_turma
            WHERE professor_id = $1 AND ativo = true;
        `;
        const { rows } = await db.query(query, [professorId]);
        console.log(`Professor ${professorId} has ${rows[0].count} active disciplines.`);
    } catch (error) {
        console.error('Error fetching discipline count:', error);
    } finally {
        // It's important to close the pool when done with the script
        // However, in a real application, the pool would be managed by the server.
        // For a one-off script, we can close it.
        // If the pool is already closed or not yet connected, this might throw an error.
        // For this specific case, we'll let the process exit naturally.
        // await db.pool.end(); 
    }
}

// Get professor ID from command line arguments or hardcode it
const professorId = process.argv[2] || 681;
getProfessorDisciplineCount(professorId);
