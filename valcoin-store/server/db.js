const { Pool } = require('pg');

// Configuração de conexão flexível para Docker e Desenvolvimento Local
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set.');
}
const connectionConfig = {
    connectionString: process.env.DATABASE_URL,
};

// Pool de conexões com a configuração decidida e settings otimizados
const pool = new Pool({
    ...connectionConfig, // Usa a configuração de conexão definida acima

    // Configurações de pool otimizadas
    max: 10, // Reduzido de 20 para 10 - evita sobrecarga
    min: 1,  // Reduzido para 1 conexão mínima
    idleTimeoutMillis: 300000, // Aumentado para 5 minutos (era 30s)
    connectionTimeoutMillis: 10000, // Aumentado para 10s (era 2s)
    acquireTimeoutMillis: 10000,    // Aumentado para 10s (era 5s)
    statement_timeout: 30000,
    query_timeout: 30000,
});

// Event listeners para monitorização (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
    pool.on('connect', (client) => {
        console.log(`[DB] New client connected. Total: ${pool.totalCount}, Idle: ${pool.idleCount}`);
    });

    pool.on('error', (err, client) => {
        console.error('[DB] Unexpected error on idle client:', err.message);
    });
}

// Função principal de query com retry melhorado
const query = async (text, params = []) => {
    const start = Date.now();
    let retries = 0;
    const maxRetries = 2; // Reduzido de 3 para 2
    
    while (retries <= maxRetries) {
        let client;
        try {
            client = await pool.connect();
            const result = await client.query(text, params);
            const duration = Date.now() - start;
            
            // Log apenas queries muito lentas
            if (duration > 2000) {
                console.warn(`[DB] Slow query (${duration}ms):`, text.substring(0, 50));
            }
            
            return result;
        } catch (error) {
            console.error(`[DB] Query error (attempt ${retries + 1}/${maxRetries + 1}):`, {
                error: error.message,
                query: text.substring(0, 50)
            });
            
            retries++;
            
            // Só retry em erros específicos de conexão
            if (retries <= maxRetries && isRetryableError(error)) {
                console.log(`[DB] Retrying in ${retries * 500}ms...`);
                await sleep(retries * 500); // Delay menor
                continue;
            }
            
            throw error;
        } finally {
            if (client) {
                client.release();
            }
        }
    }
};

// Função para transações com timeout
const transaction = async (callback, timeoutMs = 30000) => {
    const client = await pool.connect();
    let timeoutId;
    
    try {
        await client.query('BEGIN');
        
        // Timeout para transações longas
        const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error('Transaction timeout'));
            }, timeoutMs);
        });
        
        const result = await Promise.race([
            callback(client),
            timeoutPromise
        ]);
        
        clearTimeout(timeoutId);
        await client.query('COMMIT');
        
        return result;
    } catch (error) {
        clearTimeout(timeoutId);
        await client.query('ROLLBACK');
        console.error('[DB] Transaction rolled back:', error.message);
        throw error;
    } finally {
        client.release();
    }
};

// Função melhorada para verificar erros que podem ser refeitos
const isRetryableError = (error) => {
    const retryableCodes = [
        'ECONNRESET',
        'ENOTFOUND', 
        'ECONNREFUSED',
        'ETIMEDOUT',
        '53300', // TOO_MANY_CONNECTIONS
        '08006', // CONNECTION_FAILURE
        '08003', // CONNECTION_DOES_NOT_EXIST
    ];
    
    return retryableCodes.includes(error.code) || 
           retryableCodes.includes(error.errno) ||
           (error.message && error.message.toLowerCase().includes('connection'));
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Health check simplificado
const healthCheck = async () => {
    try {
        const start = Date.now();
        await query('SELECT 1 as health');
        const responseTime = Date.now() - start;
        
        return {
            healthy: true,
            responseTime,
            connections: {
                total: pool.totalCount,
                idle: pool.idleCount,
                waiting: pool.waitingCount
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};

// Fechar pool graciosamente
const closePool = async () => {
    console.log('[DB] Closing connection pool...');
    try {
        await pool.end();
        console.log('[DB] Pool closed successfully');
    } catch (error) {
        console.error('[DB] Error closing pool:', error.message);
    }
};

// Queries otimizadas com prepared statements onde aplicável
const queries = {
    getActiveProducts: () => query(
        'SELECT * FROM active_products_with_discount ORDER BY data_criacao DESC'
    ),
    
    getMostSoldProducts: () => query(
        'SELECT * FROM active_products_with_discount ORDER BY sold_count DESC LIMIT 50'
    ),
    
    getUserPurchases: (userId) => query(
        `SELECT p.*, pu.data_compra, pu.feedback 
         FROM products p 
         JOIN purchases pu ON p.id = pu.product_id 
         WHERE pu.buyer_id = $1 AND p.ativo = true
         ORDER BY pu.data_compra DESC
         LIMIT 100`, 
        [userId]
    ),
    
    getUserSales: (userId) => query(
        `SELECT * FROM products 
         WHERE seller_id = $1 AND ativo = true 
         ORDER BY data_criacao DESC
         LIMIT 100`, 
        [userId]
    ),
    
    getValidTicket: (ticketId) => query(
        'SELECT * FROM valid_tickets_info WHERE ticket_id = $1', 
        [ticketId]
    ),
    
    // Otimizada com LIMIT
    getSellerTickets: async (userId) => {
        const queryText = `
            SELECT t.id AS ticket_id, 
                   t.is_valid, 
                   t.used_at, 
                   pu.data_compra AS issued_at, 
                   prod.name AS product_name, 
                   u.nome AS buyer_name, 
                   prod.seller_id
            FROM tickets t
            JOIN purchases pu ON t.purchase_id = pu.id
            JOIN products prod ON pu.product_id = prod.id
            JOIN users u ON pu.buyer_id = u.id
            WHERE prod.seller_id = $1
            ORDER BY pu.data_compra DESC
            LIMIT 200
        `;
        const { rows } = await query(queryText, [userId]);
        return rows.map(row => ({
            ticketId: row.ticket_id,
            productName: row.product_name,
            buyerName: row.buyer_name,
            isValid: row.is_valid,
            issuedAt: row.issued_at,
            usedAt: row.used_at,
            sellerId: row.seller_id
        }));
    }
};

// Keep alive apenas em produção e com intervalo maior
if (process.env.NODE_ENV === 'production') {
    setInterval(async () => {
        try {
            await query('SELECT 1');
        } catch (error) {
            console.error('[DB] Keep alive failed:', error.message);
        }
    }, 600000); // 10 minutos em vez de 5
}

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    console.log(`[DB] ${signal} received, closing pool...`);
    await closePool();
    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = {
    query,
    transaction,
    healthCheck,
    closePool,
    queries,
    pool
};
