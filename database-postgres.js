const { Pool } = require('pg');
require('dotenv').config();

// Database configuration - Support Supabase, Railway DATABASE_URL, and individual variables
let dbConfig;

if (process.env.SUPABASE_DB_URL) {
    // Use Supabase connection string
    dbConfig = {
        connectionString: process.env.SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false }, // Supabase requires SSL
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    };
} else if (process.env.DATABASE_URL) {
    // Use Railway's DATABASE_URL format
    dbConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    };
} else {
    // Use individual environment variables (local development)
    dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'dtf_editor',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    };
}

let pool = null;
let isInitialized = false;

// Initialize database connection and tables
async function initializeDatabase() {
    try {
        console.log('Connecting to PostgreSQL database...');
        console.log('Database config type:', process.env.SUPABASE_DB_URL ? 'Supabase' : process.env.DATABASE_URL ? 'Railway' : 'Local');
        console.log('Environment check - SUPABASE_DB_URL:', process.env.SUPABASE_DB_URL ? 'SET' : 'NOT SET');
        console.log('Environment check - DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
        console.log('Environment check - DB_HOST:', process.env.DB_HOST || 'NOT SET');
        
        pool = new Pool(dbConfig);
        
        // Test connection
        const client = await pool.connect();
        console.log('Connected to PostgreSQL database');
        client.release();
        
        // Initialize tables
        await createTables();
        console.log('Database initialized successfully');
        isInitialized = true;
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}

// Create all database tables
async function createTables() {
    const client = await pool.connect();
    
    try {
        // Users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                first_name VARCHAR(100),
                last_name VARCHAR(100),
                company VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                is_admin BOOLEAN DEFAULT FALSE,
                subscription_status VARCHAR(50) DEFAULT 'free',
                subscription_plan VARCHAR(50) DEFAULT 'free',
                subscription_end_date TIMESTAMP,
                stripe_customer_id VARCHAR(255),
                credits_remaining INTEGER DEFAULT 5,
                credits_used INTEGER DEFAULT 0,
                total_credits_purchased INTEGER DEFAULT 5
            )
        `);

        // Subscription plans table
        await client.query(`
            CREATE TABLE IF NOT EXISTS subscription_plans (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                stripe_price_id VARCHAR(255) UNIQUE,
                stripe_product_id VARCHAR(255),
                monthly_price DECIMAL(10,2),
                yearly_price DECIMAL(10,2),
                credits_per_month INTEGER DEFAULT 0,
                credits_per_year INTEGER DEFAULT 0,
                features TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Add stripe_product_id column if it doesn't exist
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'subscription_plans' 
                    AND column_name = 'stripe_product_id'
                ) THEN
                    ALTER TABLE subscription_plans ADD COLUMN stripe_product_id VARCHAR(255);
                END IF;
            END $$;
        `);

        // Subscriptions table
        await client.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                stripe_subscription_id VARCHAR(255) UNIQUE,
                plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
                status VARCHAR(50) NOT NULL,
                current_period_start TIMESTAMP,
                current_period_end TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Images table
        await client.query(`
            CREATE TABLE IF NOT EXISTS images (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                original_filename VARCHAR(255) NOT NULL,
                processed_filename VARCHAR(255) NOT NULL,
                storage_path VARCHAR(500), -- Supabase Storage path
                file_size INTEGER,
                image_type VARCHAR(50) NOT NULL,
                tool_used VARCHAR(50) NOT NULL,
                credits_used INTEGER DEFAULT 1,
                processing_time_ms INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Add storage_path column if it doesn't exist
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'images' 
                    AND column_name = 'storage_path'
                ) THEN
                    ALTER TABLE images ADD COLUMN storage_path VARCHAR(500);
                END IF;
            END $$;
        `);

        // Credit transactions table
        await client.query(`
            CREATE TABLE IF NOT EXISTS credit_transactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                transaction_type VARCHAR(50) NOT NULL,
                credits_amount INTEGER NOT NULL,
                description TEXT,
                stripe_payment_intent_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Admin logs table
        await client.query(`
            CREATE TABLE IF NOT EXISTS admin_logs (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                action VARCHAR(100) NOT NULL,
                target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // API costs tracking table
        await client.query(`
            CREATE TABLE IF NOT EXISTS api_costs (
                id SERIAL PRIMARY KEY,
                service_name VARCHAR(50) NOT NULL,
                operation_type VARCHAR(50) NOT NULL,
                cost_amount DECIMAL(10,6) NOT NULL,
                currency VARCHAR(3) DEFAULT 'USD',
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                image_id INTEGER REFERENCES images(id) ON DELETE SET NULL,
                request_id VARCHAR(255),
                response_time_ms INTEGER,
                success BOOLEAN DEFAULT TRUE,
                error_message TEXT,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Cost summaries table for daily/weekly/monthly aggregations
        await client.query(`
            CREATE TABLE IF NOT EXISTS cost_summaries (
                id SERIAL PRIMARY KEY,
                period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
                period_start DATE NOT NULL,
                period_end DATE NOT NULL,
                service_name VARCHAR(50) NOT NULL,
                total_cost DECIMAL(10,6) NOT NULL,
                total_requests INTEGER NOT NULL,
                successful_requests INTEGER NOT NULL,
                failed_requests INTEGER NOT NULL,
                average_response_time_ms DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(period_type, period_start, service_name)
            )
        `);

        // Create indexes for better performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
            CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);
            CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at);
            CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
            CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
            CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON admin_logs(admin_id);
            CREATE INDEX IF NOT EXISTS idx_api_costs_service_name ON api_costs(service_name);
            CREATE INDEX IF NOT EXISTS idx_api_costs_created_at ON api_costs(created_at);
            CREATE INDEX IF NOT EXISTS idx_api_costs_user_id ON api_costs(user_id);
            CREATE INDEX IF NOT EXISTS idx_cost_summaries_period ON cost_summaries(period_type, period_start);
            CREATE INDEX IF NOT EXISTS idx_cost_summaries_service ON cost_summaries(service_name);
        `);

        // Insert default data
        await insertDefaultData(client);
        
    } finally {
        client.release();
    }
}

// Insert default data
async function insertDefaultData(client) {
    // Insert default subscription plans
    await client.query(`
        INSERT INTO subscription_plans (name, stripe_price_id, stripe_product_id, monthly_price, yearly_price, credits_per_month, credits_per_year, features) 
        VALUES 
            ('Free', NULL, NULL, 0, 0, 5, 60, 'Basic vectorization and background removal'),
            ('Basic', 'price_basic_monthly', 'prod_Sh2uT3rKKH78hU', 9.99, 99.99, 20, 240, 'Professional vectorization and background removal'),
            ('Starter', 'price_starter_monthly', 'prod_Sh2vUAOgkSKVTT', 24.99, 249.99, 60, 720, 'Professional tools with priority processing'),
            ('Professional', 'price_professional_monthly', 'prod_Sh2wEde5Me5q9d', 49.99, 499.99, 120, 1440, 'Advanced features with unlimited processing')
        ON CONFLICT (stripe_price_id) DO UPDATE SET 
            stripe_product_id = EXCLUDED.stripe_product_id,
            monthly_price = EXCLUDED.monthly_price,
            yearly_price = EXCLUDED.yearly_price,
            credits_per_month = EXCLUDED.credits_per_month,
            credits_per_year = EXCLUDED.credits_per_year,
            features = EXCLUDED.features
    `);

    // Insert default admin user (password: admin123)
    const adminPasswordHash = '$2b$10$9Tr04G6uJGGoG8My2shK6.DPI2vvWwAPozoOsN2q923uyt85b2Phm';
    await client.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, is_admin, subscription_status, subscription_plan, credits_remaining) 
        VALUES ('admin@dtfeditor.com', $1, 'Admin', 'User', TRUE, 'active', 'enterprise', 999999)
        ON CONFLICT (email) DO UPDATE SET password_hash = $1
    `, [adminPasswordHash]);
}

// Helper functions for database operations
const dbHelpers = {
    // Check if database is initialized
    isReady: () => isInitialized && pool !== null,

    // Get a client from the pool
    getClient: () => {
        if (!dbHelpers.isReady()) {
            throw new Error('Database not initialized');
        }
        return pool.connect();
    },

    // User operations
    createUser: async (userData) => {
        const client = await dbHelpers.getClient();
        try {
            const { email, password_hash, first_name, last_name, company } = userData;
            const result = await client.query(
                'INSERT INTO users (email, password_hash, first_name, last_name, company) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [email, password_hash, first_name, last_name, company]
            );
            return result.rows[0].id;
        } finally {
            client.release();
        }
    },

    getUserByEmail: async (email) => {
        const client = await dbHelpers.getClient();
        try {
            const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    },

    getUserById: async (id) => {
        const client = await dbHelpers.getClient();
        try {
            const result = await client.query('SELECT * FROM users WHERE id = $1', [id]);
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    },

    updateUser: async (id, updates) => {
        const client = await dbHelpers.getClient();
        try {
            const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
            const values = Object.values(updates);
            values.unshift(id);
            
            await client.query(
                `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                values
            );
        } finally {
            client.release();
        }
    },

    // Image operations
    saveImage: async (imageData) => {
        const client = await dbHelpers.getClient();
        try {
            const { user_id, original_filename, processed_filename, storage_path, file_size, image_type, tool_used, credits_used, processing_time_ms } = imageData;
            const result = await client.query(
                'INSERT INTO images (user_id, original_filename, processed_filename, storage_path, file_size, image_type, tool_used, credits_used, processing_time_ms) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
                [user_id, original_filename, processed_filename, storage_path, file_size, image_type, tool_used, credits_used, processing_time_ms]
            );
            return result.rows[0].id;
        } finally {
            client.release();
        }
    },

    getUserImages: async (userId, limit = 50, offset = 0) => {
        const client = await dbHelpers.getClient();
        try {
            const result = await client.query(
                'SELECT * FROM images WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
                [userId, limit, offset]
            );
            return result.rows;
        } finally {
            client.release();
        }
    },

    getImageById: async (imageId) => {
        const client = await dbHelpers.getClient();
        try {
            const result = await client.query(
                'SELECT * FROM images WHERE id = $1',
                [imageId]
            );
            return result.rows[0] || null;
        } finally {
            client.release();
        }
    },

    deleteImage: async (imageId) => {
        const client = await dbHelpers.getClient();
        try {
            await client.query(
                'DELETE FROM images WHERE id = $1',
                [imageId]
            );
        } finally {
            client.release();
        }
    },

    getOldImagesForCleanup: async () => {
        const client = await dbHelpers.getClient();
        try {
            const result = await client.query(`
                SELECT i.*, u.subscription_status 
                FROM images i 
                JOIN users u ON i.user_id = u.id 
                ORDER BY i.created_at ASC
            `);
            return result.rows;
        } finally {
            client.release();
        }
    },

    // Credit operations
    addCreditTransaction: async (userId, transactionType, creditsAmount, description, stripePaymentIntentId = null) => {
        const client = await dbHelpers.getClient();
        try {
            await client.query(
                'INSERT INTO credit_transactions (user_id, transaction_type, credits_amount, description, stripe_payment_intent_id) VALUES ($1, $2, $3, $4, $5)',
                [userId, transactionType, creditsAmount, description, stripePaymentIntentId]
            );
        } finally {
            client.release();
        }
    },

    getCreditTransactions: async (userId, limit = 50, offset = 0) => {
        const client = await dbHelpers.getClient();
        try {
            const result = await client.query(
                'SELECT * FROM credit_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
                [userId, limit, offset]
            );
            return result.rows;
        } finally {
            client.release();
        }
    },

    getUserCreditTransactions: async (userId) => {
        const client = await dbHelpers.getClient();
        try {
            const result = await client.query(
                'SELECT * FROM credit_transactions WHERE user_id = $1 ORDER BY created_at DESC',
                [userId]
            );
            return result.rows;
        } finally {
            client.release();
        }
    },

    // Admin operations
    getAllUsers: async (limit = 100, offset = 0) => {
        const client = await dbHelpers.getClient();
        try {
            const result = await client.query(
                'SELECT id, email, first_name, last_name, company, created_at, is_active, is_admin, subscription_status, credits_remaining FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
                [limit, offset]
            );
            return result.rows;
        } finally {
            client.release();
        }
    },

    getUsersCount: async () => {
        const client = await dbHelpers.getClient();
        try {
            const result = await client.query('SELECT COUNT(*) as count FROM users');
            return parseInt(result.rows[0].count);
        } finally {
            client.release();
        }
    },

    addAdminLog: async (logData) => {
        const client = await dbHelpers.getClient();
        try {
            const { admin_user_id, action, target_user_id, details, ip_address } = logData;
            await client.query(
                'INSERT INTO admin_logs (admin_id, action, target_user_id, details) VALUES ($1, $2, $3, $4)',
                [admin_user_id, action, target_user_id, details]
            );
        } finally {
            client.release();
        }
    },

    getAdminLogs: async (limit = 100, offset = 0) => {
        const client = await dbHelpers.getClient();
        try {
            const result = await client.query(`
                SELECT 
                    al.*,
                    u.email as admin_email,
                    tu.email as target_email
                FROM admin_logs al
                LEFT JOIN users u ON al.admin_id = u.id
                LEFT JOIN users tu ON al.target_user_id = tu.id
                ORDER BY al.created_at DESC
                LIMIT $1 OFFSET $2
            `, [limit, offset]);
            return result.rows;
        } finally {
            client.release();
        }
    },

    getSubscriptionPlans: async () => {
        const client = await dbHelpers.getClient();
        try {
            const result = await client.query('SELECT * FROM subscription_plans WHERE is_active = true ORDER BY monthly_price ASC');
            return result.rows;
        } finally {
            client.release();
        }
    },

    // Statistics
    getStats: async () => {
        const client = await dbHelpers.getClient();
        try {
            const stats = {};
            
            // Total users
            const usersResult = await client.query('SELECT COUNT(*) as count FROM users');
            stats.totalUsers = parseInt(usersResult.rows[0].count);
            
            // Total images processed
            const imagesResult = await client.query('SELECT COUNT(*) as count FROM images');
            stats.totalImages = parseInt(imagesResult.rows[0].count);
            
            // Total credits used
            const creditsResult = await client.query('SELECT SUM(credits_used) as total FROM images');
            stats.totalCreditsUsed = parseInt(creditsResult.rows[0].total) || 0;
            
            // Recent activity (last 7 days)
            const recentResult = await client.query(
                'SELECT COUNT(*) as count FROM images WHERE created_at >= NOW() - INTERVAL \'7 days\''
            );
            stats.recentActivity = parseInt(recentResult.rows[0].count);
            
            return stats;
        } finally {
            client.release();
        }
    },

    // Cost tracking operations
    logApiCost: async (costData) => {
        const client = await dbHelpers.getClient();
        try {
            const {
                service_name,
                operation_type,
                cost_amount,
                currency = 'USD',
                user_id = null,
                image_id = null,
                request_id = null,
                response_time_ms = null,
                success = true,
                error_message = null,
                metadata = null
            } = costData;

            const result = await client.query(
                `INSERT INTO api_costs (
                    service_name, operation_type, cost_amount, currency, user_id, image_id, 
                    request_id, response_time_ms, success, error_message, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
                [service_name, operation_type, cost_amount, currency, user_id, image_id, 
                 request_id, response_time_ms, success, error_message, metadata ? JSON.stringify(metadata) : null]
            );
            return result.rows[0].id;
        } finally {
            client.release();
        }
    },

    getCostAnalytics: async (period = '30d', service = null) => {
        const client = await dbHelpers.getClient();
        try {
            let periodFilter = '';
            switch (period) {
                case '7d':
                    periodFilter = "WHERE created_at >= NOW() - INTERVAL '7 days'";
                    break;
                case '30d':
                    periodFilter = "WHERE created_at >= NOW() - INTERVAL '30 days'";
                    break;
                case '90d':
                    periodFilter = "WHERE created_at >= NOW() - INTERVAL '90 days'";
                    break;
                case '1y':
                    periodFilter = "WHERE created_at >= NOW() - INTERVAL '1 year'";
                    break;
                default:
                    periodFilter = "WHERE created_at >= NOW() - INTERVAL '30 days'";
            }

            const serviceFilter = service ? `AND service_name = '${service}'` : '';
            
            // Get total costs by service
            const costsResult = await client.query(`
                SELECT 
                    service_name,
                    SUM(cost_amount) as total_cost,
                    COUNT(*) as total_requests,
                    COUNT(CASE WHEN success = true THEN 1 END) as successful_requests,
                    COUNT(CASE WHEN success = false THEN 1 END) as failed_requests,
                    AVG(response_time_ms) as avg_response_time
                FROM api_costs 
                ${periodFilter} ${serviceFilter}
                GROUP BY service_name
                ORDER BY total_cost DESC
            `);

            // Get daily breakdown
            const dailyResult = await client.query(`
                SELECT 
                    DATE(created_at) as date,
                    service_name,
                    SUM(cost_amount) as daily_cost,
                    COUNT(*) as daily_requests
                FROM api_costs 
                ${periodFilter} ${serviceFilter}
                GROUP BY DATE(created_at), service_name
                ORDER BY date DESC
            `);

            // Get cost vs revenue comparison (if revenue data available)
            const revenueResult = await client.query(`
                SELECT 
                    DATE(ct.created_at) as date,
                    SUM(CASE WHEN ct.transaction_type = 'purchase' THEN ct.credits_amount ELSE 0 END) as credits_purchased,
                    SUM(CASE WHEN ct.transaction_type = 'usage' THEN ct.credits_amount ELSE 0 END) as credits_used
                FROM credit_transactions ct
                ${periodFilter.replace('api_costs', 'ct')}
                GROUP BY DATE(ct.created_at)
                ORDER BY date DESC
            `);

            return {
                costs_by_service: costsResult.rows,
                daily_breakdown: dailyResult.rows,
                revenue_data: revenueResult.rows,
                period: period
            };
        } finally {
            client.release();
        }
    },

    getCostSummary: async (periodType = 'daily', days = 30) => {
        const client = await dbHelpers.getClient();
        try {
            const result = await client.query(`
                SELECT 
                    period_start,
                    period_end,
                    service_name,
                    total_cost,
                    total_requests,
                    successful_requests,
                    failed_requests,
                    average_response_time_ms
                FROM cost_summaries 
                WHERE period_type = $1 
                AND period_start >= NOW() - INTERVAL '${days} days'
                ORDER BY period_start DESC
            `, [periodType]);
            
            return result.rows;
        } finally {
            client.release();
        }
    },

    updateCostSummary: async (periodType, periodStart, periodEnd, serviceName, costData) => {
        const client = await dbHelpers.getClient();
        try {
            await client.query(`
                INSERT INTO cost_summaries (
                    period_type, period_start, period_end, service_name, 
                    total_cost, total_requests, successful_requests, failed_requests, average_response_time_ms
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (period_type, period_start, service_name) 
                DO UPDATE SET 
                    total_cost = EXCLUDED.total_cost,
                    total_requests = EXCLUDED.total_requests,
                    successful_requests = EXCLUDED.successful_requests,
                    failed_requests = EXCLUDED.failed_requests,
                    average_response_time_ms = EXCLUDED.average_response_time_ms,
                    updated_at = CURRENT_TIMESTAMP
            `, [
                periodType, periodStart, periodEnd, serviceName,
                costData.total_cost, costData.total_requests, 
                costData.successful_requests, costData.failed_requests,
                costData.average_response_time_ms
            ]);
        } finally {
            client.release();
        }
    },

    // Close database connection
    close: async () => {
        if (pool) {
            await pool.end();
            pool = null;
            isInitialized = false;
        }
    }
};

module.exports = { dbHelpers, initializeDatabase }; 