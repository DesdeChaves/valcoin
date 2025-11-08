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

    // Configurações do pool - mais restritivas para evitar conexões órfãs
    max: 5, // Máximo 5 conexões (reduzido de 20)
    min: 1, // Mínimo 1 conexão sempre ativa
    idleTimeoutMillis: 300000, // 5 minutos para fechar conexões idle
    connectionTimeoutMillis: 2000, // Timeout para nova conexão
    acquireTimeoutMillis: 5000, // Timeout para obter conexão do pool
    statement_timeout: 30000, // Timeout para statements SQL (30s)
    query_timeout: 30000, // Timeout para queries (30s)
    
    // Configurações avançadas para limpeza
    allowExitOnIdle: false, // Permite fechar o pool quando idle
    maxUses: 7500, // Máximo de usos por conexão antes de renovar
});

// Event listeners para monitorização e debug
pool.on('connect', (client) => {
    const processId = client.processID;
    console.log(`✅ Nova conexão estabelecida: PID ${processId}`);
    console.log(`📊 Pool stats: Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
});

pool.on('acquire', (client) => {
    if (client && client.processID) {
        console.log(`🔒 Conexão adquirida: PID ${client.processID}`);
    } else {
        console.log(`🔒 Conexão adquirida: (cliente interno do pool)`);
    }
});

pool.on('release', (client) => {
    if (client && client.processID) {
        console.log(`🔓 Conexão libertada: PID ${client.processID}`);
    } else {
        console.log(`🔓 Conexão libertada: (cliente interno do pool)`);
    }
});

pool.on('remove', (client) => {
    if (client && client.processID) {
        console.log(`❌ Conexão removida do pool: PID ${client.processID}`);
    } else {
        console.log(`❌ Conexão removida do pool: (cliente interno)`);
    }
});

pool.on('error', (err, client) => {
    console.error('🚨 Erro no pool de conexões:', err);
    if (client && client.processID) {
        console.error(`Cliente com erro: PID ${client.processID}`);
    } else if (client) {
        console.error('Cliente com erro: (sem PID disponível)');
    }
});

// Função utilitária para usar conexões de forma segura
const withClient = async (callback) => {
    const client = await pool.connect();
    try {
        if (client && client.processID) {
            console.log(`🔧 Usando cliente: PID ${client.processID}`);
        } else {
            console.log(`🔧 Usando cliente: (PID não disponível)`);
        }
        return await callback(client);
    } catch (error) {
        console.error(`❌ Erro ao executar callback: ${error.message}`);
        throw error;
    } finally {
        client.release();
        if (client && client.processID) {
            console.log(`✅ Cliente libertado: PID ${client.processID}`);
        } else {
            console.log(`✅ Cliente libertado: (PID não disponível)`);
        }
    }
};

// Função para transações seguras
const withTransaction = async (callback) => {
    const client = await pool.connect();
    try {
        if (client && client.processID) {
            console.log(`🔄 Iniciando transação: PID ${client.processID}`);
        } else {
            console.log(`🔄 Iniciando transação: (PID não disponível)`);
        }
        await client.query('BEGIN');
        
        const result = await callback(client);
        
        await client.query('COMMIT');
        if (client && client.processID) {
            console.log(`✅ Transação committed: PID ${client.processID}`);
        } else {
            console.log(`✅ Transação committed: (PID não disponível)`);
        }
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        if (client && client.processID) {
            console.error(`🔄 Transação rollback: PID ${client.processID} - ${error.message}`);
        } else {
            console.error(`🔄 Transação rollback: (PID não disponível) - ${error.message}`);
        }
        throw error;
    } finally {
        client.release();
        if (client && client.processID) {
            console.log(`✅ Cliente libertado após transação: PID ${client.processID}`);
        } else {
            console.log(`✅ Cliente libertado após transação: (PID não disponível)`);
        }
    }
};

// Função básica para queries simples (usa o pool interno)
const query = (text, params) => {
    console.log(`🔍 Executando query: ${text.substring(0, 50)}...`);
    return pool.query(text, params);
};

// Função para obter cliente (USE COM CUIDADO - sempre fazer release!)
const getClient = () => {
    console.log('⚠️  getClient() chamado - LEMBRE-SE de fazer client.release()!');
    return pool.connect();
};

// Função para obter estatísticas do pool
const getPoolStats = () => {
    return {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
        connectedClients: pool.totalCount - pool.idleCount
    };
};

// Função para limpar conexões idle antigas
const cleanIdleConnections = async () => {
    try {
        const result = await query(`
            SELECT count(*) as idle_connections
            FROM pg_stat_activity 
            WHERE datname = $1 
            AND state = 'idle' 
            AND now() - state_change > interval '5 minutes'
        `, ['valcoin']);
        
        if (result.rows[0].idle_connections > 0) {
            console.log(`🧹 Encontradas ${result.rows[0].idle_connections} conexões idle antigas`);
        }
    } catch (error) {
        console.error('Erro ao verificar conexões idle:', error.message);
    }
};

// Função para fechar o pool graciosamente
const closePool = async () => {
    try {
        console.log('🔌 Fechando pool de conexões...');
        await pool.end();
        console.log('✅ Pool fechado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao fechar pool:', error.message);
        throw error;
    }
};

// Monitorização periódica do pool (a cada 2 minutos)
const startPoolMonitoring = () => {
    setInterval(() => {
        const stats = getPoolStats();
        console.log(`📊 Pool Monitor - Total: ${stats.totalCount}, Idle: ${stats.idleCount}, Ativas: ${stats.connectedClients}, Waiting: ${stats.waitingCount}`);
        
        // Alerta se muitas conexões estão sendo usadas
        if (stats.connectedClients > 3) {
            console.log('⚠️  Alerta: Muitas conexões ativas simultâneas!');
        }
    }, 120000); // 2 minutos
};

// Verificação periódica de conexões idle (a cada 10 minutos)
const startIdleConnectionsCleanup = () => {
    setInterval(() => {
        cleanIdleConnections();
    }, 600000); // 10 minutos
};

// Tratar encerramento da aplicação
process.on('SIGINT', async () => {
    console.log('🛑 Recebido SIGINT, fechando pool...');
    await closePool();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🛑 Recebido SIGTERM, fechando pool...');
    await closePool();
    process.exit(0);
});

// Iniciar monitorização se não estamos em ambiente de teste
if (process.env.NODE_ENV !== 'test') {
    startPoolMonitoring();
    startIdleConnectionsCleanup();
    
    // Log inicial
    console.log('🚀 Pool PostgreSQL inicializado com sucesso!');
    console.log(`📋 Configuração: max=${pool.options.max}, min=${pool.options.min}, idleTimeout=${pool.options.idleTimeoutMillis}ms`);
}

module.exports = {
    // Métodos recomendados (seguros)
    query,
    withClient,
    withTransaction,
    
    // Métodos de utilidade
    getPoolStats,
    cleanIdleConnections,
    closePool,
    
    // Métodos legados (usar com cuidado)
    getClient, // ⚠️ SEMPRE fazer client.release()
    pool       // ⚠️ Acesso direto ao pool
};
