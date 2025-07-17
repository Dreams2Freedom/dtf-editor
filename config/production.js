// Production configuration
module.exports = {
    // Server configuration
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || '0.0.0.0',
        trustProxy: true, // Trust proxy headers for rate limiting
        cors: {
            origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['https://yourdomain.com'],
            credentials: true
        }
    },

    // Security configuration
    security: {
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiresIn: '7d',
        bcryptRounds: 12, // Higher rounds for production
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            authMax: 5, // limit each IP to 5 login attempts per windowMs
            apiMax: 50 // limit each IP to 50 API requests per windowMs
        }
    },

    // Database configuration
    database: {
        connectionString: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        pool: {
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000
        }
    },

    // File upload configuration
    upload: {
        maxFileSize: 30 * 1024 * 1024, // 30MB
        allowedMimes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    },

    // API configuration
    apis: {
        vectorizer: {
            endpoint: 'https://vectorizer.ai/api/v1/vectorize',
            id: process.env.VECTORIZER_API_ID,
            secret: process.env.VECTORIZER_API_SECRET,
            timeout: 30000
        },
        clippingMagic: {
            endpoint: 'https://api.clippingmagic.com/remove-background',
            id: process.env.CLIPPING_MAGIC_API_ID,
            secret: process.env.CLIPPING_MAGIC_API_SECRET,
            timeout: 30000
        }
    },

    // Supabase configuration
    supabase: {
        url: process.env.SUPABASE_URL,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        bucket: 'dtf-editor-images'
    },

    // Stripe configuration
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        currency: 'usd'
    },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'combined',
        file: process.env.LOG_FILE || null
    },

    // Monitoring configuration
    monitoring: {
        healthCheckInterval: 30000, // 30 seconds
        metricsEnabled: process.env.METRICS_ENABLED === 'true'
    }
}; 