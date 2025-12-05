const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');

const db = require('./db');
const redisClient = require('./redis');

const app = express();
const port = process.env.PORT || 4000;

// Middleware de segurança
app.use(helmet());
app.use(compression());

// CORS configurado
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP
    message: { message: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Rate limiting mais restritivo para endpoints críticos
const strictLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 20, // máximo 20 requests
    message: { message: 'Too many attempts, please wait.' }
});

// Body parser com limites
app.use(bodyParser.json({ 
    limit: '50mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Middleware de logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const path = req.originalUrl || req.url || 'unknown';
        console.log(`[${new Date().toISOString()}] ${req.method} ${path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Funções de Cache
const getOrSetCache = async (key, cb) => {
    try {
        const data = await redisClient.get(key);
        if (data) {
            console.log(`[CACHE HIT] Key: ${key}`);
            return JSON.parse(data);
        }
    } catch (err) {
        console.error(`[CACHE GET ERROR] Key: ${key}`, err);
    }
    
    console.log(`[CACHE MISS] Key: ${key}`);
    const freshData = await cb();
    
    try {
        await redisClient.setEx(key, 3600, JSON.stringify(freshData)); // Cache por 1 hora
    } catch (err) {
        console.error(`[CACHE SET ERROR] Key: ${key}`, err);
    }

    return freshData;
};

const clearCache = async (key) => {
    try {
        await redisClient.del(key);
        console.log(`[CACHE CLEARED] Key: ${key}`);
    } catch (err) {
        console.error(`[CACHE DEL ERROR] Key: ${key}`, err);
    }
};

const clearAllProductsCache = async () => {
    try {
        const keys = await redisClient.keys('products:*');
        if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`[CACHE CLEARED] Cleared ${keys.length} product-related keys.`);
        }
    } catch (err) {
        console.error(`[CACHE CLEAR ALL ERROR]`, err);
    }
};

// Constantes
const validTaxRefs = ['isento', 'tipo1', 'tipo2', 'tipo3'];

// Funções utilitárias
const isValidBase64Image = (str) => {
    if (!str || typeof str !== 'string') return false;
    const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
    return base64Regex.test(str);
};

const getBase64Size = (base64String) => {
    if (!base64String) return 0;
    const base64Data = base64String.split(',')[1] || base64String;
    const sizeInBytes = (base64Data.length * 3) / 4;
    return sizeInBytes / (1024 * 1024);
};

const validateProductData = (data) => {
    const { name, price, quantity, category_id, promotion, taxa_iva_ref, image } = data;
    
    if (!name || name.trim().length === 0) return { valid: false, error: 'Product name is required' };
    if (price === undefined || price < 0) return { valid: false, error: 'Invalid price' };
    if (quantity === undefined || quantity < 0) return { valid: false, error: 'Invalid quantity' };
    if (promotion !== undefined && (promotion < 0 || promotion > 100)) return { valid: false, error: 'Promotion must be between 0 and 100' };
    if (!category_id) return { valid: false, error: 'Category is required' };
    if (taxa_iva_ref && !validTaxRefs.includes(taxa_iva_ref)) return { valid: false, error: 'Invalid tax reference' };
    
    if (image && image.startsWith('data:image/')) {
        if (!isValidBase64Image(image)) return { valid: false, error: 'Invalid image format. Only JPEG, PNG, GIF, and WEBP are allowed.' };
        if (getBase64Size(image) > 10) return { valid: false, error: 'Image too large. Maximum size is 10MB.' };
    } else if (image && (image.startsWith('http://') || image.startsWith('https://'))) {
        try { new URL(image); } catch (error) { return { valid: false, error: 'Invalid image URL.' }; }
    } else if (image && image.trim() !== '') {
        return { valid: false, error: 'Image must be a valid URL or Base64 encoded image.' };
    }
    
    return { valid: true };
};

// Middleware de autenticação
const authenticateUser = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Authorization header missing' });

    const token = authHeader.split(' ')[1];
    try {
        const response = await axios.get('http://aurora-admin-server:3001/api/user', {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000
        });
        req.user = response.data;
        next();
    } catch (error) {
        console.error('Authentication failed:', error.message);
        return res.status(401).json({ message: 'Invalid token' });
    }
};



// Adicione este middleware ANTES de todos os endpoints para capturar todas as requisições
app.use((req, res, next) => {
    const start = Date.now();
    console.log(`[DEBUG] === INCOMING REQUEST ===`);
    console.log(`[DEBUG] Method: ${req.method}`);
    console.log(`[DEBUG] URL: ${req.originalUrl}`);
    console.log(`[DEBUG] Path: ${req.path}`);
    console.log(`[DEBUG] Headers:`, req.headers);
    console.log(`[DEBUG] Query:`, req.query);
    console.log(`[DEBUG] Params:`, req.params);
    console.log(`[DEBUG] === END REQUEST INFO ===`);
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const path = req.originalUrl || req.url || 'unknown';
        console.log(`[${new Date().toISOString()}] ${req.method} ${path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});


// Health check
app.get('/health', async (req, res) => {
    try {
        const dbHealth = await db.healthCheck();
        const redisHealth = await redisClient.ping();
        res.json({ status: 'ok', timestamp: new Date().toISOString(), database: dbHealth, redis: redisHealth === 'PONG' ? 'ok' : 'error', uptime: process.uptime() });
    } catch (error) {
        res.status(503).json({ status: 'error', message: error.message, timestamp: new Date().toISOString() });
    }
});

// Login proxy
app.post('/login', strictLimiter, async (req, res) => {
    try {
        const response = await axios.post('http://aurora-admin-server:3001/api/login', req.body, { timeout: 10000 });
        res.json(response.data);
    } catch (error) {
        console.error('Login failed:', error.message);
        res.status(error.response?.status || 500).json({ message: error.response?.data?.error || 'Authentication failed' });
    }
});

// ENDPOINTS DE PRODUTOS

app.get('/products', async (req, res) => {
    try {
        const { category, search, limit = 50, offset = 0 } = req.query;
        const cacheKey = `products:list:${category || 'all'}:${search || ''}:${limit}:${offset}`;

        const data = await getOrSetCache(cacheKey, async () => {
            let query = 'SELECT * FROM active_products_with_discount WHERE 1=1';
            const params = [];
            let paramCount = 0;

            if (category && category !== 'all') {
                query += ` AND category_name = $${++paramCount}`;
                params.push(category);
            }

            if (search) {
                query += ` AND (name ILIKE $${++paramCount} OR description ILIKE $${paramCount})`;
                params.push(`%${search}%`);
            }

            query += ` ORDER BY data_criacao DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
            params.push(parseInt(limit), parseInt(offset));

            const { rows } = await db.query(query, params);

            let countQuery = 'SELECT COUNT(p.id) FROM products p JOIN categories c ON p.category_id = c.id WHERE p.ativo = true';
            const countParams = [];
            let countParamCount = 0;

            if (category && category !== 'all') {
                countQuery += ` AND c.name = $${++countParamCount}`;
                countParams.push(category);
            }

            if (search) {
                countQuery += ` AND (p.name ILIKE $${++countParamCount} OR p.description ILIKE $${countParamCount})`;
                countParams.push(`%${search}%`);
            }

            const { rows: countRows } = await db.query(countQuery, countParams);
            const total = parseInt(countRows[0].count, 10);

            return {
                products: rows,
                pagination: { total, limit: parseInt(limit), offset: parseInt(offset), hasMore: parseInt(offset) + parseInt(limit) < total }
            };
        });
        
        res.json(data);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/products/most-sold', async (req, res) => {
    try {
        const data = await getOrSetCache('products:most-sold', () => db.queries.getMostSoldProducts());
        res.json(data);
    } catch (err) {
        console.error('Error fetching most sold products:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/products/my-purchases', authenticateUser, async (req, res) => {
    try {
        const data = await getOrSetCache(`user:${req.user.id}:purchases`, () => db.queries.getUserPurchases(req.user.id));
        res.json(data);
    } catch (err) {
        console.error('Error fetching user purchases:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/products/my-sales', authenticateUser, async (req, res) => {
    try {
        const data = await getOrSetCache(`user:${req.user.id}:sales`, () => db.queries.getUserSales(req.user.id));
        res.json(data);
    } catch (err) {
        console.error('Error fetching user sales:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/products/:id', async (req, res) => {
    try {
        const product = await getOrSetCache(`products:${req.params.id}`, async () => {
            const { rows } = await db.query('SELECT * FROM active_products_with_discount WHERE id = $1', [req.params.id]);
            return rows.length > 0 ? rows[0] : null;
        });
        if (product) {
            product.category = product.category_name;
            // Opcional: remover a propriedade antiga para evitar redundância no cliente
            delete product.category_name;
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/products/:id/my-purchase', authenticateUser, async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM purchases WHERE product_id = $1 AND buyer_id = $2', [req.params.id, req.user.id]);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching user purchase for product:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/products/:id/purchases', authenticateUser, async (req, res) => {
    try {
        const productId = req.params.id;
        const { rows: productRows } = await db.query('SELECT seller_id FROM products WHERE id = $1', [productId]);

        if (productRows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const product = productRows[0];
        if (product.seller_id !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to view purchases for this product' });
        }

        const { rows: purchaseRows } = await db.query(
            `SELECT p.*, u.nome as buyer_name, u.email as buyer_email
             FROM purchases p
             JOIN users u ON p.buyer_id = u.id
             WHERE p.product_id = $1`,
            [productId]
        );

        res.json(purchaseRows);
    } catch (err) {
        console.error('Error fetching product purchases:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Proxy para buscar detalhes do usuário (vendedor) de forma segura
app.get('/users/:id', authenticateUser, async (req, res) => {
    try {
        const response = await axios.get(`http://aurora-admin-server:3001/api/users/${req.params.id}`, {
            headers: { Authorization: req.headers.authorization },
            timeout: 5000
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching user details from admin server:', error.message);
        res.status(error.response?.status || 500).json({ message: 'Failed to fetch user details' });
    }
});

app.post('/products', authenticateUser, async (req, res) => {
    const { name, price, quantity, description, category_id, promotion, image, taxa_iva_ref, isTicket } = req.body;
    
    if (!name || price === undefined || quantity === undefined || !category_id || !taxa_iva_ref) {
        return res.status(400).json({ message: 'Missing required fields: name, price, quantity, category_id, taxa_iva_ref' });
    }
    
    const validation = validateProductData(req.body);
    if (!validation.valid) return res.status(400).json({ message: validation.error });

    try {
        const { rows } = await db.query(
            `INSERT INTO products (name, price, quantity, description, category_id, promotion, image, seller_id, taxa_iva_ref, is_ticket, ativo) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [name.trim(), parseFloat(price), parseInt(quantity), description?.trim() || '', parseInt(category_id), parseFloat(promotion) || 0, image || null, req.user.id, taxa_iva_ref, isTicket || false, true]
        );
        
        await clearAllProductsCache();
        await clearCache('categories');
        console.log(`New product created: ${rows[0].name} by user ${req.user.id}`);
        res.status(201).json(rows[0]);
    } catch (err) {
        console.error('Error creating product:', err);
        if (err.code === '23503') return res.status(400).json({ error: 'Invalid category ID.' });
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.put('/products/:id', authenticateUser, async (req, res) => {
    const productId = parseInt(req.params.id);
    const { name, price, quantity, description, category_id, promotion, image, ativo } = req.body;

    try {
        const { rows: existingRows } = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
        if (existingRows.length === 0) return res.status(404).json({ message: 'Product not found' });
        
        const product = existingRows[0];
        if (product.seller_id !== req.user.id) return res.status(403).json({ message: 'You are not authorized to edit this product' });

        const validation = validateProductData({ ...product, ...req.body });
        if (!validation.valid) return res.status(400).json({ message: validation.error });

        const { rows: updatedRows } = await db.query(
            `UPDATE products SET name = $1, price = $2, quantity = $3, description = $4, category_id = $5, promotion = $6, image = $7, ativo = $8, data_atualizacao = now() 
             WHERE id = $9 RETURNING *`,
            [name?.trim() || product.name, price !== undefined ? parseFloat(price) : product.price, quantity !== undefined ? parseInt(quantity) : product.quantity, description?.trim() || product.description, category_id ? parseInt(category_id) : product.category_id, promotion !== undefined ? parseFloat(promotion) : product.promotion, image !== undefined ? image : product.image, ativo !== undefined ? ativo : product.ativo, productId]
        );
        
        await clearCache(`products:${productId}`);
        await clearAllProductsCache();
        await clearCache('categories');
        console.log(`Product updated: ${updatedRows[0].name} by user ${req.user.id}`);
        res.json(updatedRows[0]);
    } catch (err) {
        console.error('Error updating product:', err);
        if (err.code === '23503') return res.status(400).json({ error: 'Invalid category ID.' });
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/products/:id/ticket-pdf', authenticateUser, async (req, res) => {
    const { id: productId } = req.params;
    const { id: userId, nome: userName } = req.user;

    try {
        // 1. Validar se o produto é um bilhete e se o usuário o comprou
        const { rows: productRows } = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
        if (productRows.length === 0 || !productRows[0].is_ticket) {
            return res.status(404).json({ message: 'Ticket not found or product is not a ticket' });
        }
        const product = productRows[0];

        const { rows: purchaseRows } = await db.query(
            'SELECT * FROM purchases WHERE product_id = $1 AND buyer_id = $2',
            [productId, userId]
        );

        if (purchaseRows.length === 0) {
            return res.status(403).json({ message: 'You have not purchased this ticket' });
        }
        const purchase = purchaseRows[0];

        // 2. Obter detalhes do bilhete e do vendedor
        const { rows: ticketRows } = await db.query('SELECT * FROM tickets WHERE purchase_id = $1', [purchase.id]);
        if (ticketRows.length === 0) {
            return res.status(404).json({ message: 'Ticket data not found' });
        }
        const ticket = ticketRows[0];
        const validationUrl = ticket.validation_url;
        const ticketCode = ticket.id.split('-')[0].toUpperCase();

        const { rows: sellerRows } = await db.query('SELECT nome FROM users WHERE id = $1', [product.seller_id]);
        const sellerName = sellerRows.length > 0 ? sellerRows[0].nome : 'Desconhecido';

        // 3. Gerar o PDF
        const doc = new PDFDocument({ size: [300, 500], margin: 20 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=bilhete-${product.name.replace(/\s+/g, '-')}.pdf`);
        doc.pipe(res);

        // Background
        doc.rect(0, 0, 300, 500).fill('#f0f0f0');

        // Header
        doc.fillColor('#333').fontSize(24).font('Helvetica-Bold').text('BILHETE DIGITAL', { align: 'center' });
        doc.moveDown(0.5);

        // Event Name
        doc.fillColor('#00529B').fontSize(18).text(product.name, { align: 'center' });
        doc.moveDown(1);

        // Buyer Name
        doc.fillColor('#333').fontSize(14).font('Helvetica-Bold').text(userName, { align: 'center' });
        doc.moveDown(0.5);

        // Details
        doc.fillColor('#333').fontSize(10).font('Helvetica');
        doc.text(`Vendido por: ${sellerName}`, { align: 'center' });
        doc.text(`Data da Compra: ${new Date(purchase.data_compra).toLocaleDateString('pt-PT')}`, { align: 'center' });
        doc.text(`Preço: ${product.price} ValCoins`, { align: 'center' });
        doc.moveDown(1);

        // Ticket Code
        doc.fillColor('#333').fontSize(12).font('Helvetica-Bold').text('CÓDIGO DO BILHETE:', { align: 'center' });
        doc.fillColor('#00529B').fontSize(16).text(ticketCode, { align: 'center' });
        doc.moveDown(1);

        // QR Code
        const qrCodeImage = await QRCode.toDataURL(validationUrl, { errorCorrectionLevel: 'H', width: 150 });
        const qrCodeWidth = 150;
        const docWidth = 300;
        const xPos = (docWidth - qrCodeWidth) / 2;
        doc.image(qrCodeImage, xPos, doc.y, { width: qrCodeWidth });

        // Move Y position to be below the QR code for the footer
        doc.y = doc.y + 170; // Adjust this value as needed

        // Footer
        doc.fillColor('#999').fontSize(8).text('Este bilhete é único e intransferível. Apresente o QR code na entrada do evento.', {
            align: 'center',
            width: 260
        });

        doc.end();

    } catch (err) {
        console.error('Error generating ticket PDF:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.delete('/products/:id', authenticateUser, async (req, res) => {
    const productId = parseInt(req.params.id);
    try {
        const { rows: existingRows } = await db.query('SELECT * FROM products WHERE id = $1', [productId]);
        if (existingRows.length === 0) return res.status(404).json({ message: 'Product not found' });
        
        const product = existingRows[0];
        if (product.seller_id !== req.user.id) return res.status(403).json({ message: 'You are not authorized to delete this product' });

        await db.query('UPDATE products SET ativo = false, data_atualizacao = now() WHERE id = $1', [productId]);
        
        await clearCache(`products:${productId}`);
        await clearAllProductsCache();
        await clearCache('categories');
        console.log(`Product deactivated: ${product.name} by user ${req.user.id}`);
        res.json({ message: 'Product deactivated successfully' });
    } catch (err) {
        console.error('Error deactivating product:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/products/:id/feedback', authenticateUser, async (req, res) => {
    const { id: productId } = req.params;
    const { feedback } = req.body;
    const { id: userId } = req.user;

    if (!feedback) {
        return res.status(400).json({ message: 'Feedback text is required' });
    }

    try {
        // Verificar se o usuário comprou este produto
        const { rows: purchaseRows } = await db.query(
            'SELECT id FROM purchases WHERE product_id = $1 AND buyer_id = $2',
            [productId, userId]
        );

        if (purchaseRows.length === 0) {
            return res.status(403).json({ message: 'You can only give feedback on products you have purchased' });
        }

        const purchaseId = purchaseRows[0].id;

        // Adicionar o feedback
        await db.query(
            'UPDATE purchases SET feedback = $1 WHERE id = $2',
            [feedback, purchaseId]
        );

        // Limpar caches relevantes, se necessário
        await clearCache(`user:${userId}:purchases`);

        res.json({ message: 'Feedback submitted successfully' });
    } catch (err) {
        console.error('Error submitting feedback:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Adicione este endpoint ANTES do endpoint real para testar se a rota funciona
app.get('/products/:id/ticket-pdf-test', (req, res) => {
    console.log(`[TEST] Test endpoint hit with ID: ${req.params.id}`);
    res.json({ 
        message: 'Test endpoint working', 
        productId: req.params.id,
        timestamp: new Date().toISOString(),
        path: req.path,
        originalUrl: req.originalUrl
    });
});

// Adicione também um endpoint sem parâmetros para testar
app.get('/test-ticket-pdf', (req, res) => {
    console.log(`[TEST] Simple test endpoint hit`);
    res.json({ 
        message: 'Simple test endpoint working',
        timestamp: new Date().toISOString()
    });
});


// ENDPOINT DE COMPRA - VERSÃO CORRIGIDA
app.post('/buy', authenticateUser, async (req, res) => {
    const { productId } = req.body;
    if (!productId || isNaN(productId)) return res.status(400).json({ message: 'Valid product ID is required' });

    const parsedProductId = parseInt(productId);
    let product; // Declare a variável aqui fora da transaction
    
    try {
        await db.transaction(async (client) => {
            const { rows: productRows } = await client.query('SELECT * FROM products WHERE id = $1 AND ativo = true FOR UPDATE', [parsedProductId]);
            if (productRows.length === 0) throw new Error('Product not found or inactive');
            
            product = productRows[0]; // Atribui à variável declarada fora
            console.log('[BUY ENDPOINT] product.is_ticket:', product.is_ticket, 'type:', typeof product.is_ticket);
            if (product.seller_id === req.user.id) throw new Error('You cannot buy your own product');
            if (product.quantity <= 0) throw new Error('Product out of stock');

            const finalPrice = product.promotion > 0 ? product.price * (1 - product.promotion / 100) : product.price;
            const transactionPayload = { 
                utilizador_destino_id: product.seller_id, 
                montante: finalPrice, 
                descricao: `Compra de ${product.name}`, 
                taxa_iva_ref: product.taxa_iva_ref 
            };

            await axios.post('http://aurora-admin-server:3001/api/store/buy', transactionPayload, { 
                headers: { Authorization: req.headers.authorization }, 
                timeout: 10000 
            });

            await client.query('UPDATE products SET quantity = quantity - 1, sold_count = sold_count + 1 WHERE id = $1', [parsedProductId]);
            const { rows: purchaseRows } = await client.query('INSERT INTO purchases (product_id, buyer_id) VALUES ($1, $2) RETURNING id', [parsedProductId, req.user.id]);

            if (product.is_ticket) {
                const ticketId = uuidv4();
                const validationUrl = `/validate-ticket/${ticketId}`;
                await client.query('INSERT INTO tickets (id, purchase_id, validation_url) VALUES ($1, $2, $3)', [ticketId, purchaseRows[0].id, validationUrl]);
            }
        });

        // Agora 'product' está disponível aqui
        await clearCache(`products:${parsedProductId}`);
        await clearAllProductsCache();
        await clearCache(`user:${req.user.id}:purchases`);
        await clearCache(`user:${product.seller_id}:sales`); // ✅ Agora funciona!
        
        console.log(`Purchase completed: ${product.name} bought by user ${req.user.id}`);
        res.json({ message: 'Compra efetuada com sucesso!' });
        
    } catch (error) {
        console.error('Purchase failed:', error.message);
        if (error.message.includes('out of stock')) return res.status(400).json({ message: 'Produto esgotado' });
        if (error.message.includes('cannot buy your own')) return res.status(400).json({ message: 'Você não pode comprar seu próprio produto' });
        if (error.message.includes('Product not found')) return res.status(404).json({ message: 'Produto não encontrado' });
        if (error.response?.status) return res.status(error.response.status).json({ message: error.response.data?.message || 'Falha na transação' });
        res.status(500).json({ message: 'Falha ao completar a compra', details: error.message });
    }
});


// Endpoint de validação de bilhetes corrigido
app.get('/validate-ticket/:ticketId', async (req, res) => {
    const { ticketId } = req.params;
    console.log(`[VALIDATE TICKET] Received ticketId: ${ticketId}`);

    try {
        // 1. Buscar o bilhete pelo ID (usando LIKE para IDs encurtados)
        const { rows: ticketRows } = await db.query('SELECT * FROM tickets WHERE id::text LIKE $1', [`${ticketId}%`]);
        console.log(`[VALIDATE TICKET] Found ${ticketRows.length} tickets matching '${ticketId}%'`);

        if (ticketRows.length === 0) {
            console.warn(`[VALIDATE TICKET] Ticket not found: ${ticketId}`);
            return res.status(404).json({ 
                success: false,
                message: 'Bilhete não encontrado',
                valid: false 
            });
        }

        if (ticketRows.length > 1) {
            console.warn(`[VALIDATE TICKET] Ambiguous ticket code: ${ticketId}`);
            return res.status(400).json({ 
                success: false,
                message: 'Código de bilhete ambíguo. Contacte o suporte.',
                valid: false 
            });
        }

        const ticket = ticketRows[0];
        console.log(`[VALIDATE TICKET] Ticket found:`, {
            id: ticket.id,
            is_valid: ticket.is_valid,
            used_at: ticket.used_at,
            purchase_id: ticket.purchase_id
        });

        // 2. Verificar se o bilhete já foi usado/validado
        // Verificar ambos os campos para garantir compatibilidade
        const isAlreadyValidated = ticket.is_valid === true || ticket.used_at !== null;
        
        if (isAlreadyValidated) {
            console.warn(`[VALIDATE TICKET] Ticket already validated:`, {
                id: ticket.id,
                used_at: ticket.used_at,
                is_valid: ticket.is_valid
            });
            return res.status(400).json({ 
                success: false,
                message: 'Este bilhete já foi validado anteriormente',
                valid: false,
                used_at: ticket.used_at
            });
        }

        // 3. Buscar informações da compra e produto
        const { rows: purchaseRows } = await db.query(
            'SELECT * FROM purchases WHERE id = $1', 
            [ticket.purchase_id]
        );

        if (purchaseRows.length === 0) {
            console.error(`[VALIDATE TICKET] Purchase not found for ticket: ${ticket.id}`);
            return res.status(500).json({ 
                success: false,
                message: 'Dados da compra não encontrados',
                valid: false 
            });
        }

        const purchase = purchaseRows[0];

        const { rows: productRows } = await db.query(
            'SELECT * FROM products WHERE id = $1', 
            [purchase.product_id]
        );

        if (productRows.length === 0) {
            console.error(`[VALIDATE TICKET] Product not found for purchase: ${purchase.id}`);
            return res.status(500).json({ 
                success: false,
                message: 'Produto não encontrado',
                valid: false 
            });
        }

        const product = productRows[0];

        // 4. Buscar informações do comprador
        const { rows: buyerRows } = await db.query(
            'SELECT nome, email FROM users WHERE id = $1', 
            [purchase.buyer_id]
        );

        const buyerName = buyerRows.length > 0 ? buyerRows[0].nome : 'Desconhecido';

        // 5. Marcar o bilhete como validado
        await db.query(
            'UPDATE tickets SET is_valid = true, used_at = now() WHERE id = $1', 
            [ticket.id]
        );

        console.log(`[VALIDATE TICKET] Ticket validated successfully: ${ticket.id}`);

        // 6. Resposta de sucesso
        const response = {
            success: true,
            message: 'Bilhete validado com sucesso',
            valid: true,
            ticket: {
                id: ticket.id,
                validated_at: new Date().toISOString()
            },
            product: {
                name: product.name,
                description: product.description
            },
            purchase: {
                date: purchase.data_compra,
                buyer_name: buyerName
            }
        };

        console.log(`[VALIDATE TICKET] Sending response:`, response);
        res.json(response);

    } catch (err) {
        console.error('[VALIDATE TICKET] Error validating ticket:', err);
        res.status(500).json({ 
            success: false,
            message: 'Erro interno do servidor',
            valid: false,
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});


app.get('/admin/tickets', authenticateUser, async (req, res) => {
    try {
        console.log(`[ADMIN TICKETS] Request by user: ${req.user.id} (${req.user.tipo_utilizador})`);
        
        const cacheKey = req.user.tipo_utilizador === 'PROFESSOR' 
            ? 'admin:all-tickets' 
            : `user:${req.user.id}:created-tickets`;
        
        const data = await getOrSetCache(cacheKey, async () => {
            let query, params;
            
                // Outros users veem apenas bilhetes dos seus produtos
                query = `
                    SELECT 
                        t.id as ticket_id,
                        t.is_valid,
                        t.used_at,
                        t.validation_url,
                        p.name as product_name,
                        p.description as product_description,
                        pu.data_compra as issued_at,
                        u.nome as buyer_name,
                        u.email as buyer_email,
                        seller.nome as seller_name
                    FROM tickets t
                    JOIN purchases pu ON t.purchase_id = pu.id
                    JOIN products p ON pu.product_id = p.id
                    JOIN users u ON pu.buyer_id = u.id
                    JOIN users seller ON p.seller_id = seller.id
                    WHERE p.is_ticket = true AND p.seller_id = $1
                    ORDER BY pu.data_compra DESC
                `;
                params = [req.user.id];
            

            const { rows } = await db.query(query, params);

            return rows.map(row => ({
                ticketId: row.ticket_id,
                isValid: row.is_valid,
                usedAt: row.used_at,
                validationUrl: row.validation_url,
                productName: row.product_name,
                productDescription: row.product_description,
                issuedAt: row.issued_at,
                buyerName: row.buyer_name,
                buyerEmail: row.buyer_email,
                sellerName: row.seller_name
            }));
        });

        console.log(`[ADMIN TICKETS] Returning ${data.length} tickets for user ${req.user.id}`);
        res.json(data);
        
    } catch (err) {
        console.error('[ADMIN TICKETS] Error fetching tickets:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Endpoint para marcar bilhete como usado (para professores ou vendedores)
app.post('/use-ticket/:ticketId', authenticateUser, async (req, res) => {
    const { ticketId } = req.params;
    
    try {
        console.log(`[USE TICKET] Request by user: ${req.user.id} for ticket: ${ticketId}`);
        
        // Buscar o bilhete e verificar permissões
        const { rows: ticketRows } = await db.query(`
            SELECT 
                t.*,
                p.seller_id,
                pu.buyer_id
            FROM tickets t
            JOIN purchases pu ON t.purchase_id = pu.id
            JOIN products p ON pu.product_id = p.id
            WHERE t.id::text LIKE $1
        `, [`${ticketId}%`]);

        if (ticketRows.length === 0) {
            return res.status(404).json({ message: 'Bilhete não encontrado' });
        }

        if (ticketRows.length > 1) {
            return res.status(400).json({ message: 'ID de bilhete ambíguo' });
        }

        const ticket = ticketRows[0];

        // Verificar permissões: deve ser professor, vendedor do produto ou comprador
        const hasPermission = 
            req.user.tipo_utilizador === 'PROFESSOR' || 
            req.user.id === ticket.seller_id || 
            req.user.id === ticket.buyer_id;

        if (!hasPermission) {
            return res.status(403).json({ message: 'Sem permissão para marcar este bilhete' });
        }

        // Verificar se já foi usado
        if (!ticket.is_valid || ticket.used_at) {
            return res.status(400).json({ message: 'Este bilhete já foi utilizado' });
        }

        // Marcar como usado
        await db.query(
            'UPDATE tickets SET is_valid = false, used_at = now() WHERE id = $1',
            [ticket.id]
        );

        // Limpar cache
        await clearCache('admin:all-tickets');

        console.log(`[USE TICKET] Ticket ${ticket.id} marked as used by ${req.user.id}`);
        res.json({ message: 'Bilhete marcado como utilizado com sucesso' });

    } catch (err) {
        console.error('[USE TICKET] Error marking ticket as used:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// OUTROS ENDPOINTS

app.get('/categories', async (req, res) => {
    try {
        const data = await getOrSetCache('categories', async () => {
            const { rows } = await db.query('SELECT id, name FROM categories ORDER BY name');
            return rows;
        });
        res.json(data);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ... (Error handling, graceful shutdown, etc. - assuming they are correct from previous steps)

// MIDDLEWARE DE TRATAMENTO DE ERROS
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint not found' });
});

app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Payload too large.' });
    if (error.code === 'ECONNREFUSED') return res.status(503).json({ message: 'Service temporarily unavailable' });
    res.status(500).json({ message: 'Internal server error', ...(process.env.NODE_ENV === 'development' && { stack: error.stack }) });
});

// Graceful shutdown
const gracefulShutdown = async () => {
    console.log('Shutting down gracefully...');
    try {
        await db.closePool();
        console.log('Database connections closed');
        await redisClient.quit();
        console.log('Redis client closed');
    } catch (error) {
        console.error('Error during graceful shutdown:', error);
    }
    process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

app.listen(port, () => {
    console.log(`🚀 Store server listening at http://localhost:${port}`);
});
