const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'dtf_editor.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        company TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        is_admin BOOLEAN DEFAULT 0,
        stripe_customer_id TEXT,
        subscription_status TEXT DEFAULT 'free',
        subscription_plan TEXT DEFAULT 'free',
        subscription_end_date DATETIME,
        credits_remaining INTEGER DEFAULT 0,
        credits_used INTEGER DEFAULT 0,
        total_credits_purchased INTEGER DEFAULT 0
    )`);

    // Subscription plans table
    db.run(`CREATE TABLE IF NOT EXISTS subscription_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        stripe_price_id TEXT UNIQUE,
        monthly_price DECIMAL(10,2),
        yearly_price DECIMAL(10,2),
        credits_per_month INTEGER DEFAULT 0,
        credits_per_year INTEGER DEFAULT 0,
        features TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Subscriptions table
    db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        stripe_subscription_id TEXT UNIQUE,
        plan_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        current_period_start DATETIME,
        current_period_end DATETIME,
        cancel_at_period_end BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (plan_id) REFERENCES subscription_plans (id)
    )`);

    // Images table
    db.run(`CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        original_filename TEXT NOT NULL,
        processed_filename TEXT NOT NULL,
        file_size INTEGER,
        image_type TEXT NOT NULL,
        tool_used TEXT NOT NULL,
        credits_used INTEGER DEFAULT 1,
        processing_time_ms INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Credit transactions table
    db.run(`CREATE TABLE IF NOT EXISTS credit_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        transaction_type TEXT NOT NULL,
        credits_amount INTEGER NOT NULL,
        description TEXT,
        stripe_payment_intent_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Admin logs table
    db.run(`CREATE TABLE IF NOT EXISTS admin_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        target_user_id INTEGER,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_user_id) REFERENCES users (id),
        FOREIGN KEY (target_user_id) REFERENCES users (id)
    )`);

    // Insert default subscription plans
    db.run(`INSERT OR IGNORE INTO subscription_plans (name, stripe_price_id, monthly_price, yearly_price, credits_per_month, credits_per_year, features) VALUES 
        ('Free', NULL, 0, 0, 5, 60, 'Basic vectorization and background removal'),
        ('Starter', 'price_starter_monthly', 9.99, 99.99, 50, 600, 'Professional tools with priority processing'),
        ('Professional', 'price_professional_monthly', 29.99, 299.99, 200, 2400, 'Advanced features with unlimited processing'),
        ('Enterprise', 'price_enterprise_monthly', 99.99, 999.99, 1000, 12000, 'Custom solutions with dedicated support')
    `);

    // Insert default admin user (password: admin123)
    const adminPasswordHash = '$2b$10$rQZ8K9vX2mN3pL4qR5sT6uV7wX8yZ9aA0bB1cC2dE3fF4gG5hH6iI7jJ8kK9lL';
    db.run(`INSERT OR IGNORE INTO users (email, password_hash, first_name, last_name, is_admin, subscription_status, subscription_plan, credits_remaining) VALUES 
        ('admin@dtfeditor.com', '${adminPasswordHash}', 'Admin', 'User', 1, 'active', 'enterprise', 999999)
    `);

    console.log('Database initialized successfully');
}

// Helper functions for database operations
const dbHelpers = {
    // User operations
    createUser: (userData) => {
        return new Promise((resolve, reject) => {
            const { email, password_hash, first_name, last_name, company } = userData;
            db.run(
                'INSERT INTO users (email, password_hash, first_name, last_name, company) VALUES (?, ?, ?, ?, ?)',
                [email, password_hash, first_name, last_name, company],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    },

    getUserByEmail: (email) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    getUserById: (id) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    updateUser: (id, updates) => {
        return new Promise((resolve, reject) => {
            const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = Object.values(updates);
            values.push(id);
            
            db.run(`UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values, function(err) {
                if (err) reject(err);
                else resolve(this.changes);
            });
        });
    },

    getAllUsers: () => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM users ORDER BY created_at DESC', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Subscription operations
    createSubscription: (subscriptionData) => {
        return new Promise((resolve, reject) => {
            const { user_id, stripe_subscription_id, plan_id, status, current_period_start, current_period_end } = subscriptionData;
            db.run(
                'INSERT INTO subscriptions (user_id, stripe_subscription_id, plan_id, status, current_period_start, current_period_end) VALUES (?, ?, ?, ?, ?, ?)',
                [user_id, stripe_subscription_id, plan_id, status, current_period_start, current_period_end],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    },

    getSubscriptionPlans: () => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY monthly_price', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Image operations
    saveImage: (imageData) => {
        return new Promise((resolve, reject) => {
            const { user_id, original_filename, processed_filename, file_size, image_type, tool_used, credits_used, processing_time_ms } = imageData;
            db.run(
                'INSERT INTO images (user_id, original_filename, processed_filename, file_size, image_type, tool_used, credits_used, processing_time_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [user_id, original_filename, processed_filename, file_size, image_type, tool_used, credits_used, processing_time_ms],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    },

    getUserImages: (userId) => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM images WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Credit operations
    addCreditTransaction: (transactionData) => {
        return new Promise((resolve, reject) => {
            const { user_id, transaction_type, credits_amount, description, stripe_payment_intent_id } = transactionData;
            db.run(
                'INSERT INTO credit_transactions (user_id, transaction_type, credits_amount, description, stripe_payment_intent_id) VALUES (?, ?, ?, ?, ?)',
                [user_id, transaction_type, credits_amount, description, stripe_payment_intent_id],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    },

    getUserCreditTransactions: (userId) => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM credit_transactions WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Admin operations
    addAdminLog: (logData) => {
        return new Promise((resolve, reject) => {
            const { admin_user_id, action, target_user_id, details, ip_address } = logData;
            db.run(
                'INSERT INTO admin_logs (admin_user_id, action, target_user_id, details, ip_address) VALUES (?, ?, ?, ?, ?)',
                [admin_user_id, action, target_user_id, details, ip_address],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    },

    getAdminLogs: () => {
        return new Promise((resolve, reject) => {
            db.all('SELECT al.*, u.email as admin_email, tu.email as target_email FROM admin_logs al LEFT JOIN users u ON al.admin_user_id = u.id LEFT JOIN users tu ON al.target_user_id = tu.id ORDER BY al.created_at DESC LIMIT 100', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    // Analytics
    getRevenueStats: () => {
        return new Promise((resolve, reject) => {
            db.get(`
                SELECT 
                    COUNT(*) as total_subscribers,
                    SUM(CASE WHEN subscription_status = 'active' THEN 1 ELSE 0 END) as active_subscribers,
                    SUM(CASE WHEN subscription_status = 'canceled' THEN 1 ELSE 0 END) as canceled_subscribers
                FROM users 
                WHERE subscription_status != 'free'
            `, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }
};

module.exports = { db, dbHelpers };
