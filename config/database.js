require('dotenv').config();

const config = {
    development: {
        // Local PostgreSQL
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'dtf_editor_dev',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: false,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    },
    
    production: {
        // Production PostgreSQL (Supabase, Railway, etc.)
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    },
    
    test: {
        // Test database
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'dtf_editor_test',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: false,
        max: 5,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 1000,
    }
};

const environment = process.env.NODE_ENV || 'development';
const dbConfig = config[environment];

// Validate required environment variables for production
if (environment === 'production') {
    const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required database environment variables: ${missing.join(', ')}`);
    }
}

module.exports = {
    dbConfig,
    environment,
    isProduction: environment === 'production',
    isDevelopment: environment === 'development',
    isTest: environment === 'test'
}; 