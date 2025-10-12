const { v4: uuidv4 } = require('uuid');
const db = require('./db');

// --- Helper Functions ---

const enrichHousesWithStats = async (houses, client = db) => {
    if (!houses || houses.length === 0) {
        return [];
    }
    const houseIds = houses.map(h => h.house_id);

    const statsQuery = `
        SELECT
            hm.house_id,
            COALESCE(SUM(u.saldo), 0) AS total_balance,
            COUNT(DISTINCT hm.user_id) FILTER (WHERE u.tipo_utilizador = 'ALUNO') AS member_count,
            (
                SELECT COUNT(DISTINCT ssa.student_id)
                FROM student_savings_accounts ssa
                JOIN house_members hmsa ON ssa.student_id = hmsa.user_id
                WHERE hmsa.house_id = hm.house_id AND ssa.maturity_date >= CURRENT_DATE
            ) AS savings_account_count,
            (
                SELECT COALESCE(SUM(sl.amount - sl.paid_amount), 0)
                FROM student_loans sl
                JOIN house_members hmsl ON sl.student_id = hmsl.user_id
                WHERE hmsl.house_id = hm.house_id AND sl.status = 'ACTIVE'
            ) AS total_debt
        FROM house_members hm
        JOIN users u ON hm.user_id = u.id
        WHERE hm.house_id = ANY($1::uuid[]) AND hm.data_saida IS NULL
        GROUP BY hm.house_id;
    `;

    const { rows: stats } = await client.query(statsQuery, [houseIds]);
    const statsMap = new Map(stats.map(s => [s.house_id, s]));

    return houses.map(house => {
        const houseStats = statsMap.get(house.house_id) || {};
        const memberCount = parseInt(houseStats.member_count || 0, 10);
        const savingsCount = parseInt(houseStats.savings_account_count || 0, 10);
        return {
            ...house,
            total_balance: parseFloat(houseStats.total_balance || 0),
            member_count: memberCount,
            savings_percentage: memberCount > 0 ? (savingsCount / memberCount) * 100 : 0,
            total_debt: parseFloat(houseStats.total_debt || 0),
        };
    });
};


// --- API Handlers ---

const getHouses = async (req, res) => {
    try {
        // The view returns a single row with a JSON array named 'houses_array'
        const { rows } = await db.query('SELECT houses_array FROM houses_overview');
        // The result is inside the first row, or an empty array if the view is empty
        const houses = rows.length > 0 ? rows[0].houses_array : [];
        res.json(houses || []); // Ensure we send an array even if houses is null
    } catch (err) {
        console.error('Error getting houses from houses_overview:', err);
        res.status(500).json({ error: 'Internal server error while fetching from houses_overview' });
    }
};

const getHouseById = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, tipo_utilizador: userType } = req.user;

        // Authorization Check
        let isAuthorized = false;
        if (userType === 'ADMIN') {
            isAuthorized = true;
        } else if (userType === 'PROFESSOR') {
            const { rows: membership } = await db.query(
                'SELECT 1 FROM house_members WHERE house_id = $1 AND user_id = $2 AND role = $3',
                [id, userId, 'professor']
            );
            if (membership.length > 0) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ error: 'Permission denied to access this resource.' });
        }

        const { rows: houses } = await db.query('SELECT * FROM houses WHERE house_id = $1', [id]);
        if (houses.length === 0) {
            return res.status(404).json({ error: 'House not found' });
        }

        const { rows: members } = await db.query(`
            SELECT u.id, u.nome, u.tipo_utilizador, hm.role, hm.data_entrada
            FROM house_members hm
            JOIN users u ON hm.user_id = u.id
            WHERE hm.house_id = $1 AND hm.data_saida IS NULL
            ORDER BY hm.role, u.nome
        `, [id]);

        const [enrichedHouse] = await enrichHousesWithStats(houses);
        enrichedHouse.members = members;

        res.json(enrichedHouse);
    } catch (err) {
        console.error(`Error getting house ${req.params.id}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getMyHouse = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const { rows } = await db.query(
            'SELECT house_info FROM user_houses_overview WHERE user_id = $1',
            [userId]
        );

        if (rows.length === 0) {
            // User is not in any house
            return res.json({ inHouse: false });
        }

        // The view returns the complete house object with all necessary stats
        res.json(rows[0].house_info);

    } catch (err) {
        console.error('Error getting user house from view:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const createHouse = async (req, res) => {
    if (req.user.tipo_utilizador !== 'ADMIN') {
        return res.status(403).json({ error: 'Permission denied' });
    }

    const { nome, cor, valor_associado, descricao, logo_url, professor_id, leader_id, members } = req.body;
    if (!nome) {
        return res.status(400).json({ error: 'House name is required' });
    }

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const { rows: houseRows } = await client.query(
            'INSERT INTO houses (nome, cor, valor_associado, descricao, logo_url) VALUES ($1, $2, $3, $4, $5) RETURNING house_id',
            [nome, cor, valor_associado, descricao, logo_url]
        );
        const houseId = houseRows[0].house_id;

        if (professor_id) {
            await client.query(
                'INSERT INTO house_members (user_id, house_id, role, metodo_adesao) VALUES ($1, $2, $3, $4)',
                [professor_id, houseId, 'professor', 'atribuição']
            );
        }
        
        if (leader_id) {
            await client.query(
                'INSERT INTO house_members (user_id, house_id, role, metodo_adesao) VALUES ($1, $2, $3, $4)',
                [leader_id, houseId, 'lider', 'atribuição']
            );
        }

        if (members && members.length > 0) {
            for (const memberId of members) {
                // Ensure we don't re-add the leader as a regular student
                if (memberId !== leader_id) {
                     await client.query(
                        'INSERT INTO house_members (user_id, house_id, role, metodo_adesao) VALUES ($1, $2, $3, $4)',
                        [memberId, houseId, 'aluno', 'atribuição']
                    );
                }
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ house_id: houseId, nome });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating house:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
};

const updateHouse = async (req, res) => {
    const { id } = req.params;
    const { nome, cor, valor_associado, descricao, logo_url, leader_id, professor_id } = req.body;
    const userId = req.user.id;
    const client = await db.getClient();

    try {
        await client.query('BEGIN');

        const { rows: memberRows } = await client.query(
            "SELECT role FROM house_members WHERE house_id = $1 AND user_id = $2",
            [id, userId]
        );

        if (memberRows.length === 0 && req.user.tipo_utilizador !== 'ADMIN') {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Permission denied: Not a member or admin.' });
        }
        
        const userRole = memberRows.length > 0 ? memberRows[0].role : null;
        const isLeader = userRole === 'lider';
        const isProfessor = userRole === 'professor';
        const isAdmin = req.user.tipo_utilizador === 'ADMIN';

        if (!isLeader && !isAdmin && !isProfessor) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Permission denied: Not a house leader, professor or admin.' });
        }

        // If the user is a leader but not an admin, they cannot change the professor
        if (isLeader && !isAdmin && professor_id) {
            const { rows: currentProfessor } = await client.query(
                "SELECT user_id FROM house_members WHERE house_id = $1 AND role = 'professor'",
                [id]
            );
            if (currentProfessor.length > 0 && currentProfessor[0].user_id !== professor_id) {
                await client.query('ROLLBACK');
                return res.status(403).json({ error: 'Permission denied: Leaders cannot change the house professor.' });
            }
        }

        const { rows } = await client.query(
            'UPDATE houses SET nome = $1, cor = $2, valor_associado = $3, descricao = $4, logo_url = $5 WHERE house_id = $6 RETURNING *',
            [nome, cor, valor_associado, descricao, logo_url, id]
        );

        if (isAdmin || isProfessor) {
            if (leader_id) {
                // Demote current leader
                await client.query(
                    "UPDATE house_members SET role = 'aluno' WHERE house_id = $1 AND role = 'lider'",
                    [id]
                );
                // Promote new leader
                await client.query(
                    "UPDATE house_members SET role = 'lider' WHERE house_id = $1 AND user_id = $2",
                    [id, leader_id]
                );
            }
        }
        
        if (isAdmin) {
            if (professor_id) {
                // Remove current professor
                await client.query(
                    "DELETE FROM house_members WHERE house_id = $1 AND role = 'professor'",
                    [id]
                );
                // Add new professor
                await client.query(
                    'INSERT INTO house_members (user_id, house_id, role, metodo_adesao) VALUES ($1, $2, $3, $4)',
                    [professor_id, id, 'professor', 'atribuição']
                );
            }
        }

        await client.query('COMMIT');
        res.json(rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error updating house ${id}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
};

const manageHouseMembers = async (req, res) => {
    const { id: houseId } = req.params;
    const { members_to_add, members_to_remove, new_leader_id } = req.body;
    const userId = req.user.id;

    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const { rows: memberRows } = await client.query(
            "SELECT role FROM house_members WHERE house_id = $1 AND user_id = $2",
            [houseId, userId]
        );

        if (memberRows.length === 0 && req.user.tipo_utilizador !== 'ADMIN') {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Permission denied: Not a member or admin.' });
        }

        const userRole = memberRows.length > 0 ? memberRows[0].role : null;
        const isLeader = userRole === 'lider';
        const isProfessor = userRole === 'professor';
        const isAdmin = req.user.tipo_utilizador === 'ADMIN';

        if (!isLeader && !isAdmin && !isProfessor) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Permission denied: Not a house leader, professor or admin.' });
        }

        if (members_to_add && members_to_add.length > 0) {
            for (const memberId of members_to_add) {
                // End any existing active membership for this user
                await client.query(
                    'UPDATE house_members SET data_saida = NOW() WHERE user_id = $1 AND data_saida IS NULL',
                    [memberId]
                );

                const { rows } = await client.query(
                    'SELECT * FROM house_members WHERE user_id = $1 AND house_id = $2',
                    [memberId, houseId]
                );

                if (rows.length > 0) {
                    // Member was previously in this house, reactivate them
                    await client.query(
                        'UPDATE house_members SET data_saida = NULL WHERE user_id = $1 AND house_id = $2',
                        [memberId, houseId]
                    );
                } else {
                    // Member is new to this house, insert a new row
                    await client.query(
                        'INSERT INTO house_members (user_id, house_id, role, metodo_adesao) VALUES ($1, $2, \'aluno\', \'atribuição\')',
                        [memberId, houseId]
                    );
                }
            }
        }

        if (members_to_remove && members_to_remove.length > 0) {
            await client.query(
                'UPDATE house_members SET data_saida = NOW() WHERE house_id = $1 AND user_id = ANY($2::uuid[])',
                [houseId, members_to_remove]
            );
        }

        if (new_leader_id) {
            await client.query(
                "UPDATE house_members SET role = 'aluno' WHERE house_id = $1 AND role = 'lider'",
                [houseId]
            );
            await client.query(
                "UPDATE house_members SET role = 'lider' WHERE house_id = $1 AND user_id = $2",
                [houseId, new_leader_id]
            );
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'House members updated successfully.' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error managing members for house ${houseId}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
};

const getAvailableStudents = async (req, res) => {
    try {
        const { rows } = await db.query(`
            SELECT u.*
            FROM users u
            WHERE u.tipo_utilizador = 'ALUNO'
            AND NOT EXISTS (
                SELECT 1
                FROM house_members hm
                WHERE hm.user_id = u.id
                AND hm.data_saida IS NULL
            );
        `);
        res.json(rows);
    } catch (err) {
        console.error('Error getting available students:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getStudentHouseHistory = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { rows } = await db.query(`
            SELECT h.nome, hm.data_entrada, hm.data_saida
            FROM house_members hm
            JOIN houses h ON hm.house_id = h.house_id
            WHERE hm.user_id = $1
            ORDER BY hm.data_entrada DESC;
        `, [studentId]);
        res.json(rows);
    } catch (err) {
        console.error('Error getting student house history:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteHouse = async (req, res) => {
    if (req.user.tipo_utilizador !== 'ADMIN') {
        return res.status(403).json({ error: 'Permission denied' });
    }
    const { id } = req.params;
    const client = await db.getClient();
    try {
        await client.query('BEGIN');
        // Remove all members from the house
        await client.query('DELETE FROM house_members WHERE house_id = $1', [id]);
        // Delete the house itself
        const { rowCount } = await client.query('DELETE FROM houses WHERE house_id = $1', [id]);
        
        if (rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'House not found' });
        }

        await client.query('COMMIT');
        res.status(204).send(); // 204 No Content for successful deletion
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error deleting house ${id}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
};


module.exports = {
    getHouses,
    getHouseById,
    getMyHouse,
    createHouse,
    updateHouse,
    manageHouseMembers,
    deleteHouse,
    getAvailableStudents,
    getStudentHouseHistory,
};
