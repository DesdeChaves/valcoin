const redis = require('redis');
const { URL } = require('url');

if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL environment variable is not set.');
}

console.log('REDIS_URL:', process.env.REDIS_URL);

// Parse manual da URL para evitar problemas com IPv6
const redisUrl = new URL(process.env.REDIS_URL);
const redisHost = redisUrl.hostname;
const redisPort = parseInt(redisUrl.port) || 6379;

console.log('Parsed Redis host:', redisHost);
console.log('Parsed Redis port:', redisPort);

const redisClient = redis.createClient({
    socket: {
        host: redisHost,
        port: redisPort,
        family: 4, // Force IPv4
        reconnectStrategy: (retries) => {
            console.log(`Redis reconnect attempt ${retries}`);
            if (retries > 10) {
                return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 1000, 10000);
        }
    }
});

redisClient.on('error', (err) => {
    console.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
    console.log(`Connected to Redis at ${redisHost}:${redisPort}`);
});

// Conectar
async function connectWithRetry() {
    try {
        await redisClient.connect();
        console.log('Redis connection established');
    } catch (err) {
        console.error('Failed to connect to Redis:', err.message);
        setTimeout(connectWithRetry, 5000);
    }
}

connectWithRetry();

module.exports = redisClient;
