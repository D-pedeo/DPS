const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dpedro-solucoes-jwt-secret-2023';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Inicializar banco de dados
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Erro ao conectar com o banco de dados:', err);
    } else {
        console.log('Conectado ao banco de dados SQLite');
        initializeDatabase();
    }
});

function initializeDatabase() {
    // Criar tabelas se não existirem
    db.serialize(() => {
        // Tabela de usuários
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Tabela de produtos
        db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                category TEXT NOT NULL,
                image TEXT,
                badge TEXT,
                rating REAL DEFAULT 0,
                description TEXT,
                stock INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Tabela de pedidos
        db.run(`
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                products TEXT NOT NULL,
                total REAL NOT NULL,
                status TEXT DEFAULT 'pending',
                customer_name TEXT NOT NULL,
                customer_email TEXT NOT NULL,
                customer_phone TEXT,
                customer_address TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);
        
        // Tabela de campanhas de marketing
        db.run(`
            CREATE TABLE IF NOT EXISTS campaigns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                platform TEXT NOT NULL,
                budget REAL DEFAULT 0,
                status TEXT DEFAULT 'draft',
                start_date DATE,
                end_date DATE,
                results TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Verificar se precisa inserir dados iniciais
        db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            if (err) {
                console.error('Erro ao verificar usuários:', err);
                return;
            }
            
            if (row.count === 0) {
                console.log('Inserindo dados iniciais...');
                
                // Inserir usuário admin
                const hashedPassword = bcrypt.hashSync('admin123', 10);
                db.run(
                    "INSERT INTO users (username, email, password, name, role) VALUES (?, ?, ?, ?, ?)",
                    ['admin', 'admin@dpedro.com', hashedPassword, 'Administrador', 'admin']
                );
                
                // Inserir produtos de exemplo
                const products = [
                    {
                        name: "Sistema de Segurança Completo",
                        price: 250000,
                        category: "security",
                        image: "https://i.postimg.cc/8z3Q0y0t/security-system.jpg",
                        badge: "new",
                        rating: 4.8,
                        description: "Sistema completo de segurança com CFTV, alarme e monitoramento 24h",
                        stock: 15
                    },
                    {
                        name: "Software de Gestão Empresarial",
                        price: 150000,
                        category: "software",
                        image: "https://i.postimg.cc/8C2nHv0c/erp-software.jpg",
                        badge: "sale",
                        rating: 4.5,
                        description: "Sistema integrado de gestão para pequenas e médias empresas",
                        stock: 23
                    },
                    {
                        name: "Pacote Office 365 Business",
                        price: 75000,
                        category: "software",
                        image: "https://i.postimg.cc/8C2nHv0c/erp-software.jpg",
                        badge: "popular",
                        rating: 4.3,
                        description: "Suite completa de produtividade com 1 ano de licença",
                        stock: 42
                    },
                    {
                        name: "Servidor Cloud Premium",
                        price: 350000,
                        category: "cloud",
                        image: "https://i.postimg.cc/8C2nHv0c/erp-software.jpg",
                        badge: "new",
                        rating: 4.9,
                        description: "Servidor em nuvem com alta disponibilidade e backup automático",
                        stock: 8
                    }
                ];
                
                products.forEach(product => {
                    db.run(
                        "INSERT INTO products (name, price, category, image, badge, rating, description, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        [product.name, product.price, product.category, product.image, product.badge, product.rating, product.description, product.stock]
                    );
                });
                
                console.log('Dados iniciais inseridos com sucesso');
            }
        });
    });
}

// Middleware de autenticação
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token de acesso necessário' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        req.user = user;
        next();
    });
}

// Rotas da API
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'connected', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Autenticação
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }
    
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) {
            console.error('Erro ao buscar usuário:', err);
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                role: user.role,
                name: user.name
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role,
                token
            }
        });
    });
});

// Produtos
app.get('/api/products', (req, res) => {
    const { category, featured } = req.query;
    let query = "SELECT * FROM products";
    let params = [];
    
    if (category && category !== 'all') {
        query += " WHERE category = ?";
        params.push(category);
    }
    
    if (featured === 'true') {
        query += params.length ? " AND rating >= 4.5" : " WHERE rating >= 4.5";
    }
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Erro ao buscar produtos:', err);
            return res.status(500).json({ error: 'Erro ao buscar produtos' });
        }
        res.json({ success: true, products: rows });
    });
});

app.get('/api/products/:id', (req, res) => {
    const { id } = req.params;
    
    db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error('Erro ao buscar produto:', err);
            return res.status(500).json({ error: 'Erro ao buscar produto' });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Produto não encontrado' });
        }
        
        res.json({ success: true, product: row });
    });
});

// Pedidos
app.post('/api/orders', authenticateToken, (req, res) => {
    const { products, total, customer } = req.body;
    const userId = req.user.id;
    
    if (!products || !total || !customer) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }
    
    db.run(
        `INSERT INTO orders (user_id, products, total, customer_name, customer_email, customer_phone, customer_address, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, JSON.stringify(products), total, customer.name, customer.email, customer.phone, customer.address, 'pending'],
        function(err) {
            if (err) {
                console.error('Erro ao criar pedido:', err);
                return res.status(500).json({ error: 'Erro ao criar pedido' });
            }
            
            res.json({ 
                success: true, 
                orderId: this.lastID,
                message: 'Pedido criado com sucesso' 
            });
        }
    );
});

app.get('/api/orders', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    
    let query = "SELECT * FROM orders";
    let params = [];
    
    if (!isAdmin) {
        query += " WHERE user_id = ?";
        params.push(userId);
    }
    
    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Erro ao buscar pedidos:', err);
            return res.status(500).json({ error: 'Erro ao buscar pedidos' });
        }
        
        // Parse dos produtos
        const orders = rows.map(order => ({
            ...order,
            products: JSON.parse(order.products)
        }));
        
        res.json({ success: true, orders });
    });
});

// Campanhas de Marketing
app.get('/api/campaigns', authenticateToken, (req, res) => {
    db.all("SELECT * FROM campaigns ORDER BY created_at DESC", (err, rows) => {
        if (err) {
            console.error('Erro ao buscar campanhas:', err);
            return res.status(500).json({ error: 'Erro ao buscar campanhas' });
        }
        
        res.json({ success: true, campaigns: rows });
    });
});

app.post('/api/campaigns', authenticateToken, (req, res) => {
    const { name, platform, budget, start_date, end_date } = req.body;
    
    if (!name || !platform) {
        return res.status(400).json({ error: 'Nome e plataforma são obrigatórios' });
    }
    
    db.run(
        `INSERT INTO campaigns (name, platform, budget, start_date, end_date, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, platform, budget || 0, start_date, end_date, 'draft'],
        function(err) {
            if (err) {
                console.error('Erro ao criar campanha:', err);
                return res.status(500).json({ error: 'Erro ao criar campanha' });
            }
            
            res.json({ 
                success: true, 
                campaignId: this.lastID,
                message: 'Campanha criada com sucesso' 
            });
        }
    );
});

// Rota padrão para servir o frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});

module.exports = app;