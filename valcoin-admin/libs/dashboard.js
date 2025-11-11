const db = require('./db');
const { redisClient } = require('./redis');

const CACHE_KEY = 'dashboard:admin';
const CACHE_EXPIRATION = 60; // 60 seconds

const getDashboardMetrics = async (req, res) => {
    try {
        // 1. Try to fetch from cache
        const cachedData = await redisClient.get(CACHE_KEY);
        if (cachedData) {
            console.log(`[CACHE HIT] Serving admin dashboard from cache.`);
            return res.json(JSON.parse(cachedData));
        }

        console.log(`[CACHE MISS] Fetching admin dashboard from DB.`);
        // 2. If not in cache, fetch from DB in batches
        const [users, transactions, subjects, classes] = await Promise.all([
            db.query('SELECT * FROM users'),
            db.query('SELECT * FROM transactions'),
            db.query('SELECT * FROM subjects'),
            db.query('SELECT * FROM classes')
        ]);

        const [enrollments, transactionRules, settings, schoolRevenues, legados] = await Promise.all([
            db.query('SELECT * FROM aluno_turma'),
            db.query('SELECT * FROM transaction_rules'),
            db.query('SELECT * FROM settings'),
            db.query('SELECT * FROM school_revenues'),
            db.query('SELECT * FROM legados')
        ]);

        const settingsData = settings.rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});

        const totalUsers = users.rows.length;
        const activeUsers = users.rows.filter(user => user.ativo).length;
        const totalTransactions = transactions.rows.length;
        const completedTransactions = transactions.rows.filter(t => t.status === 'CONCLUIDA').length;
        const pendingTransactions = transactions.rows.filter(t => t.status === 'PENDENTE').length;
        const rejectedTransactions = transactions.rows.filter(t => t.status === 'REJEITADA').length;
        const creditTransactions = transactions.rows.filter(t => t.tipo === 'CREDITO').length;
        const debitTransactions = transactions.rows.filter(t => t.tipo === 'DEBITO').length;
        const totalVCFromBalances = users.rows.reduce((sum, user) => sum + (parseFloat(user.saldo) || 0), 0);
        const totalVCFromDebits = transactions.rows.filter(t => t.tipo === 'DEBITO' && t.status === 'CONCLUIDA').reduce((sum, t) => sum + (parseFloat(t.montante) || 0), 0);
        const totalVC = totalVCFromBalances + totalVCFromDebits;
        
        const totalTransactionVolume = transactions.rows.reduce((sum, t) => sum + (parseFloat(t.montante) || 0), 0);
        const valCoinEuroRate = settingsData.valCoinEuroRate || 0.01;
        const totalVCInEuros = totalVCFromBalances * valCoinEuroRate;
        const totalSchoolRevenues = schoolRevenues.rows.reduce((sum, revenue) => sum + (parseFloat(revenue.montante) || 0), 0);
        const valCoinDynamicEuroRate = totalVC > 0 ? parseFloat((totalSchoolRevenues / totalVC).toFixed(4)) : 0;
        const activeRules = transactionRules.rows.filter(rule => rule.ativo).length;
        
        const approvalRate = totalTransactions > 0 ? parseFloat(((completedTransactions / totalTransactions) * 100).toFixed(1)) : 0;
        const totalSubjects = subjects.rows.length;
        const totalClasses = classes.rows.length;
        const studentCount = users.rows.filter(u => u.tipo_utilizador === 'ALUNO').length;
        const teacherCount = users.rows.filter(u => u.tipo_utilizador === 'PROFESSOR').length;
        const adminCount = users.rows.filter(u => u.tipo_utilizador === 'ADMIN').length;

        // Legacy points calculation
        const rulesMap = transactionRules.rows.reduce((map, rule) => {
            map[rule.id] = rule;
            return map;
        }, {});

        let totalLegacyPoints = 0;
        let currentMonthLegacyPoints = 0;
        let previousMonthLegacyPoints = 0;
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        legados.rows.forEach(legado => {
            const rule = rulesMap[legado.regra_id];
            if (rule) {
                const points = parseFloat(rule.montante) || 0;
                totalLegacyPoints += points;
                const legadoDate = new Date(legado.data_atribuicao);
                if (legadoDate >= startOfCurrentMonth) {
                    currentMonthLegacyPoints += points;
                }
                if (legadoDate >= startOfPreviousMonth && legadoDate <= endOfPreviousMonth) {
                    previousMonthLegacyPoints += points;
                }
            }
        });

        const legacyPointsMonthlyGrowth = previousMonthLegacyPoints > 0 
            ? parseFloat((((currentMonthLegacyPoints - previousMonthLegacyPoints) / previousMonthLegacyPoints) * 100).toFixed(1))
            : (currentMonthLegacyPoints > 0 ? 100.0 : 0.0);


        const metrics = {
            totalUsers,
            activeUsers,
            totalTransactions,
            completedTransactions,
            pendingTransactions,
            rejectedTransactions,
            creditTransactions,
            debitTransactions,
            totalVC,
            totalVCInWallets: totalVCFromBalances,
            activeWallets: totalLegacyPoints, // Replaced
            totalTransactionVolume,
            valCoinEuroRate,
            totalVCInEuros,
            totalSchoolRevenues,
            valCoinDynamicEuroRate,
            activeRules,
            monthlyGrowth: legacyPointsMonthlyGrowth, // Replaced
            approvalRate,
            totalSubjects,
            totalClasses,
            studentCount,
            teacherCount,
            adminCount,
            settings: settingsData
        };

        // 3. Store in cache
        await redisClient.set(CACHE_KEY, JSON.stringify(metrics), { EX: CACHE_EXPIRATION });
        console.log(`[CACHE SET] Admin dashboard stored in cache.`);

        res.json(metrics);
    } catch (err) {
        console.error('Error computing dashboard metrics:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const clearAdminDashboardCache = async () => {
    try {
        await redisClient.del(CACHE_KEY);
        console.log(`[CACHE DEL] Cleared admin dashboard cache.`);
    } catch (err) {
        console.error('Error clearing admin dashboard cache:', err);
    }
};

module.exports = { getDashboardMetrics, clearAdminDashboardCache };