const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fs = require('fs').promises;
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = [
    'JWT_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('Missing required environment variables:', missingEnvVars);
    if (process.env.NODE_ENV === 'production') {
        throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    } else {
        console.warn('Continuing in development mode with missing environment variables');
        // Set default JWT_SECRET for development
        process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
    }
}

// Import our modules
const { dbHelpers, initializeDatabase } = require('./database-postgres');
const { authenticateToken, authenticateAdmin, checkCredits } = require('./auth');
const { stripeHelpers } = require('./stripe');
const { logApiCost, calculateVectorizerCost, calculateClippingMagicCost } = require('./cost-tracking');
const SupabaseStorage = require('./supabase-storage');

// Import routes
const authRoutes = require('./auth-routes');
const userRoutes = require('./user-routes');
const adminRoutes = require('./admin-routes');

const app = express();

// Rate limiting configuration - more lenient in development
const isDevelopment = process.env.NODE_ENV === 'development';

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 1000 : 100, // much higher limit in development
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => isDevelopment && req.path === '/rate-limit-status', // skip for status check in dev
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 100 : 20, // much higher limit in development
    message: {
        error: 'Too many login attempts, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter rate limiting for API endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 500 : 50, // much higher limit in development
    message: {
        error: 'Too many API requests, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Initialize database
console.log('Starting database initialization...');
console.log('Environment check:', {
    PORT: process.env.PORT || 'not set',
    NODE_ENV: process.env.NODE_ENV || 'not set',
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? 'set' : 'not set',
    VECTORIZER_API_ID: process.env.VECTORIZER_API_ID ? 'set' : 'not set',
    CLIPPING_MAGIC_API_ID: process.env.CLIPPING_MAGIC_API_ID ? 'set' : 'not set'
});

// Initialize database without exiting on failure
let dbInitialized = false;
initializeDatabase().then(() => {
    console.log('Database initialized successfully');
    dbInitialized = true;
}).catch((error) => {
    console.error('Failed to initialize database:', error);
    console.log('Server will start without database connection. Some features may not work.');
    dbInitialized = false;
});
const PORT = process.env.PORT || 3000;

// Security middleware with enhanced CSP and security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            fontSrc: ["'self'", "https:", "data:"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.stripe.com", "https://vectorizer.ai", "https://api.clippingmagic.com"],
            frameSrc: ["'self'", "https://js.stripe.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            manifestSrc: ["'self'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.use(morgan('combined'));

// Custom request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    
    // Log request details
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip} - User-Agent: ${req.get('User-Agent')}`);
    
    // Log response details
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Status: ${res.statusCode} - Duration: ${duration}ms`);
    });
    
    next();
});

// Apply rate limiting
app.use(limiter);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files with proper MIME types
app.use(express.static('.', {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Simple health check endpoint (works immediately without database)
app.get('/health', (req, res) => {
    console.log('Simple health check requested');
    res.status(200).json({ 
        status: 'ok', 
        message: 'Server is running', 
        timestamp: new Date().toISOString(),
        database: dbInitialized ? 'connected' : 'disconnected',
        version: '2.1.0',
        deployment: '2025-07-16T18:50:00Z',
        build: 'v2.4.0',
        status: 'immediate-health-check'
    });
});

// Rate limit status endpoint (for debugging)
app.get('/rate-limit-status', (req, res) => {
    res.status(200).json({ 
        message: 'Rate limit status endpoint',
        timestamp: new Date().toISOString(),
        note: 'This endpoint can help reset rate limits by making a request'
    });
});

// Rate limit reset endpoint (development only)
if (isDevelopment) {
    app.get('/reset-rate-limits', (req, res) => {
        // Clear rate limit stores
        limiter.resetKey(req.ip);
        authLimiter.resetKey(req.ip);
        apiLimiter.resetKey(req.ip);
        
        res.status(200).json({ 
            message: 'Rate limits reset for your IP',
            timestamp: new Date().toISOString(),
            ip: req.ip
        });
    });
}

// Configure file storage
const uploadsDir = path.join(__dirname, 'uploads');
const processedDir = path.join(__dirname, 'processed');

// Ensure upload directories exist
async function ensureUploadDirs() {
    try {
        await fs.mkdir(uploadsDir, { recursive: true });
        await fs.mkdir(processedDir, { recursive: true });
        console.log('Upload directories created/verified');
    } catch (error) {
        console.error('Error creating upload directories:', error);
    }
}

// Configure multer for file uploads with enhanced security
const upload = multer({
    storage: multer.memoryStorage(), // Use memory storage for processing
    limits: {
        fileSize: 30 * 1024 * 1024, // 30MB limit
        files: 1, // Only allow 1 file per request
        fieldSize: 1024 * 1024 // 1MB field size limit
    },
    fileFilter: (req, file, cb) => {
        // Check file type
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedMimes.includes(file.mimetype)) {
            return cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'), false);
        }
        
        // Check file extension
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
            return cb(new Error('Invalid file extension'), false);
        }
        
        // Additional security checks
        if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
            return cb(new Error('Invalid filename'), false);
        }
        
        cb(null, true);
    }
});

// API configuration
const VECTORIZER_ENDPOINT = 'https://vectorizer.ai/api/v1/vectorize';
const VECTORIZER_API_ID = process.env.VECTORIZER_API_ID || 'vkxq4f4d9b7qwjh';
const VECTORIZER_API_SECRET = process.env.VECTORIZER_API_SECRET || '3i3cdh559d3e1csqi2e4rsk319qdrbn2otls0flbdjqo9qmrnkfj';

const CLIPPING_MAGIC_ENDPOINT = 'https://api.clippingmagic.com/remove-background';
const CLIPPING_MAGIC_API_ID = process.env.CLIPPING_MAGIC_API_ID || '24469';
const CLIPPING_MAGIC_API_SECRET = process.env.CLIPPING_MAGIC_API_SECRET || 'mngg89bme2has9hojc7n5cbjr8ptg3bjc8r3v225c555nhkvv11';

// Authentication routes (with stricter rate limiting)
app.use('/api/auth', authLimiter, authRoutes);

// User routes (protected with API rate limiting)
app.use('/api/user', apiLimiter, userRoutes);

// Admin routes (protected with API rate limiting)
app.use('/api/admin', apiLimiter, adminRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Admin page route - protected by admin authentication
app.get('/admin', authenticateAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/vectorize', (req, res) => {
    res.sendFile(path.join(__dirname, 'vectorize.html'));
});

app.get('/background-remove', (req, res) => {
    res.sendFile(path.join(__dirname, 'background-remove.html'));
});

// Explicit CSS serving route
app.get('/styles.css', (req, res) => {
    res.setHeader('Content-Type', 'text/css');
    res.sendFile(path.join(__dirname, 'styles.css'));
});

// API health check endpoint for Railway
app.get('/api/health-check', (req, res) => {
    console.log('Root endpoint requested');
    res.json({ 
        status: 'ok', 
        message: 'DTF Editor API is running',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// Enhanced health check endpoint
app.get('/api/health', async (req, res) => {
    console.log('Health check requested');
    
    const healthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '2.4.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        services: {
            database: dbInitialized ? 'connected' : 'disconnected',
            vectorizer: 'available',
            clippingMagic: 'available',
            stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not configured',
            supabase: process.env.SUPABASE_URL ? 'configured' : 'not configured'
        }
    };
    
    // Check database connection if initialized
    if (dbInitialized) {
        try {
            const dbHelpers = require('./database-postgres');
            await dbHelpers.testConnection();
            healthStatus.services.database = 'healthy';
        } catch (error) {
            healthStatus.services.database = 'error';
            healthStatus.status = 'degraded';
        }
    }
    
    const statusCode = healthStatus.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
});

// Vectorizer.AI proxy endpoint (with credit checking)
app.post('/api/vectorize', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        console.log('Vectorization request received from user:', req.user.id);
        req.startTime = Date.now(); // Initialize start time for processing duration
        
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        console.log(`Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

        // Get mode from query parameters (default to test for development)
        const mode = req.query.mode || 'test';
        console.log(`Using mode: ${mode}`);

        // Check credits only for paid operations
        if (mode !== 'test' && mode !== 'test_preview') {
            const creditCheck = await stripeHelpers.checkCredits(req.user.id, 1);
            if (!creditCheck.hasEnough) {
                return res.status(402).json({ 
                    error: 'Insufficient credits',
                    credits_remaining: creditCheck.credits,
                    credits_required: 1
                });
            }
        }

        // Create FormData for Vectorizer.AI
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('image', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });
        
        // Add mode parameter to the request
        formData.append('mode', mode);

        // Track API cost start time
        const apiStartTime = Date.now();
        
        // Make request to Vectorizer.AI
        const response = await fetch(VECTORIZER_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${VECTORIZER_API_ID}:${VECTORIZER_API_SECRET}`).toString('base64')}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        const responseTime = Date.now() - apiStartTime;

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Vectorizer.AI API error: ${response.status} - ${errorText}`);
            
            // Log failed API cost (no charge for failed requests)
            await dbHelpers.logApiCost({
                service_name: 'vectorizer',
                operation_type: mode,
                cost_amount: 0.00, // No charge for failed requests
                user_id: req.user.id,
                request_id: `vectorize_${Date.now()}`,
                response_time_ms: responseTime,
                success: false,
                error_message: errorText,
                metadata: { mode, file_size: req.file.size }
            });
            
            return res.status(response.status).json({ 
                error: 'Failed to vectorize image',
                details: errorText
            });
        }

        // Get the response as buffer
        const vectorBuffer = await response.buffer();
        console.log(`Vectorization successful: ${vectorBuffer.length} bytes`);

        // Log successful API cost using the helper function
        const costAmount = calculateVectorizerCost(mode);
        await dbHelpers.logApiCost({
            service_name: 'vectorizer',
            operation_type: mode,
            cost_amount: costAmount,
            user_id: req.user.id,
            request_id: `vectorize_${Date.now()}`,
            response_time_ms: responseTime,
            success: true,
            metadata: { 
                mode, 
                file_size: req.file.size, 
                output_size: vectorBuffer.length, 
                credits_used: costAmount / 0.20 // Convert back to credits for reference
            }
        });

        // Upload original file to Supabase Storage
        const originalUpload = await SupabaseStorage.uploadFile(
            req.user.id.toString(),
            req.file.originalname,
            req.file.buffer,
            req.file.mimetype,
            'original'
        );

        // Upload processed file to Supabase Storage
        const processedFilename = `vectorized_${Date.now()}.svg`;
        const processedUpload = await SupabaseStorage.uploadFile(
            req.user.id.toString(),
            processedFilename,
            vectorBuffer,
            'image/svg+xml',
            'processed'
        );

        // Save image to database with storage paths
        const imageData = {
            user_id: req.user.id,
            original_filename: req.file.originalname,
            processed_filename: processedFilename,
            storage_path: processedUpload.path,
            file_size: req.file.size,
            image_type: 'vectorization',
            tool_used: 'vectorizer',
            credits_used: mode === 'test' || mode === 'test_preview' ? 0 : 1,
            processing_time_ms: Date.now() - req.startTime
        };

        await dbHelpers.saveImage(imageData);

        // Use credits only for paid operations
        if (mode !== 'test' && mode !== 'test_preview') {
            await stripeHelpers.useCredits(req.user.id, 1, `Vectorized image: ${req.file.originalname}`);
        }

        // Set appropriate headers for SVG
        res.set({
            'Content-Type': 'image/svg+xml',
            'Content-Length': vectorBuffer.length,
            'Content-Disposition': 'attachment; filename="vectorized.svg"'
        });

        res.send(vectorBuffer);

    } catch (error) {
        console.error('Vectorization error:', error);
        res.status(500).json({ 
            error: 'Internal server error during vectorization',
            details: error.message 
        });
    }
});

// Vectorizer.AI preview endpoint (with credit checking)
app.post('/api/preview', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        console.log('Preview generation request received from user:', req.user.id);
        req.startTime = Date.now(); // Initialize start time for processing duration
        
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        console.log(`Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

        // Get mode from query parameters (default to test for free watermarked preview)
        const mode = req.query.mode || 'test';
        console.log(`Using mode: ${mode}`);

        // Check credits only for paid operations
        if (mode !== 'test' && mode !== 'test_preview') {
            const creditCheck = await stripeHelpers.checkCredits(req.user.id, 1);
            if (!creditCheck.hasEnough) {
                return res.status(402).json({ 
                    error: 'Insufficient credits',
                    credits_remaining: creditCheck.credits,
                    credits_required: 1
                });
            }
        }

        // Create FormData for Vectorizer.AI
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('image', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });
        
        // Add mode parameter to the request
        formData.append('mode', mode);

        // Track API cost start time
        const apiStartTime = Date.now();
        
        // Make request to Vectorizer.AI
        const response = await fetch(VECTORIZER_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${VECTORIZER_API_ID}:${VECTORIZER_API_SECRET}`).toString('base64')}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        const responseTime = Date.now() - apiStartTime;

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Vectorizer.AI API error: ${response.status} - ${errorText}`);
            
            // Log failed API cost (no charge for failed requests)
            await dbHelpers.logApiCost({
                service_name: 'vectorizer',
                operation_type: mode,
                cost_amount: 0.00, // No charge for failed requests
                user_id: req.user.id,
                request_id: `preview_${Date.now()}`,
                response_time_ms: responseTime,
                success: false,
                error_message: errorText,
                metadata: { mode, file_size: req.file.size }
            });
            
            return res.status(response.status).json({ 
                error: 'Failed to generate preview',
                details: errorText
            });
        }

        // Get the response as buffer
        const previewBuffer = await response.buffer();
        console.log(`Preview generation successful: ${previewBuffer.length} bytes`);

        // Log successful API cost using the helper function
        const costAmount = calculateVectorizerCost(mode);
        await dbHelpers.logApiCost({
            service_name: 'vectorizer',
            operation_type: mode,
            cost_amount: costAmount,
            user_id: req.user.id,
            request_id: `preview_${Date.now()}`,
            response_time_ms: responseTime,
            success: true,
            metadata: { 
                mode, 
                file_size: req.file.size, 
                output_size: previewBuffer.length, 
                credits_used: costAmount / 0.20 // Convert back to credits for reference
            }
        });

        // Try to upload files to Supabase Storage, but don't fail if it doesn't work
        let originalUpload = null;
        let processedUpload = null;
        
        try {
            // Upload original file to Supabase Storage
            originalUpload = await SupabaseStorage.uploadFile(
                req.user.id.toString(),
                req.file.originalname,
                req.file.buffer,
                req.file.mimetype,
                'original'
            );

            // Upload processed file to Supabase Storage
            const processedFilename = `preview_${Date.now()}.svg`;
            processedUpload = await SupabaseStorage.uploadFile(
                req.user.id.toString(),
                processedFilename,
                previewBuffer,
                'image/svg+xml',
                'processed'
            );
        } catch (storageError) {
            console.warn('Supabase Storage upload failed, continuing without storage:', storageError.message);
            // Continue without storage - the preview will still work
        }

        // Save image to database (with or without storage paths)
        const imageData = {
            user_id: req.user.id,
            original_filename: req.file.originalname,
            processed_filename: `preview_${Date.now()}.svg`,
            storage_path: processedUpload ? processedUpload.path : null,
            file_size: req.file.size,
            image_type: 'vectorized', // Changed from 'preview' to 'vectorized' for better categorization
            tool_used: 'vectorizer',
            credits_used: mode === 'test' || mode === 'test_preview' ? 0 : 1,
            processing_time_ms: Date.now() - req.startTime
        };

        // Always try to save to database, but don't fail the preview if it doesn't work
        try {
            console.log('Attempting to save image to database with data:', {
                user_id: imageData.user_id,
                original_filename: imageData.original_filename,
                image_type: imageData.image_type,
                tool_used: imageData.tool_used
            });
            
            const imageId = await dbHelpers.saveImage(imageData);
            console.log('✅ Image saved to database successfully with ID:', imageId);
            
            // Verify the image was saved by trying to retrieve it
            try {
                const savedImage = await dbHelpers.getImageById(imageId);
                if (savedImage) {
                    console.log('✅ Image retrieval verification successful:', {
                        id: savedImage.id,
                        user_id: savedImage.user_id,
                        image_type: savedImage.image_type
                    });
                } else {
                    console.warn('⚠️ Image was saved but could not be retrieved immediately');
                }
            } catch (verifyError) {
                console.warn('⚠️ Could not verify saved image:', verifyError.message);
            }
        } catch (dbError) {
            console.error('❌ Database save failed, continuing without database record:', dbError);
            console.error('Database error details:', dbError.message, dbError.stack);
            // Continue without database save - the preview will still work
        }

        // Use credits only for paid operations
        if (mode !== 'test' && mode !== 'test_preview') {
            await stripeHelpers.useCredits(req.user.id, 1, `Preview generated: ${req.file.originalname}`);
        }

        // Convert SVG buffer to base64 for JSON response
        const svgBase64 = previewBuffer.toString('base64');
        const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

        // Return JSON response with SVG data URL
        res.json({
            success: true,
            previewUrl: dataUrl,
            originalFilename: req.file.originalname,
            processedFilename: `preview_${Date.now()}.svg`,
            fileSize: req.file.size,
            processingTime: Date.now() - req.startTime
        });

    } catch (error) {
        console.error('Preview generation error:', error);
        res.status(500).json({ 
            error: 'Internal server error during preview generation',
            details: error.message 
        });
    }
});

// Clipping Magic proxy endpoint (with credit checking)
app.post('/api/remove-background', authenticateToken, checkCredits(1), upload.single('image'), async (req, res) => {
    try {
        console.log('Background removal request received from user:', req.user.id);
        req.startTime = Date.now(); // Initialize start time for processing duration
        
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        console.log(`Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

        // TODO: Implement actual Clipping Magic API call
        // For now, return a placeholder response
        res.status(501).json({ 
            error: 'Background removal not yet implemented - need correct Clipping Magic API endpoint',
            details: 'The Clipping Magic API endpoint needs to be verified and implemented'
        });

    } catch (error) {
        console.error('Background removal error:', error);
        res.status(500).json({ 
            error: 'Internal server error during background removal',
            details: error.message 
        });
    }
});

// Clipping Magic White Label Smart Editor upload endpoint (with credit checking)
app.post('/api/clipping-magic-upload', authenticateToken, checkCredits(1), upload.single('image'), async (req, res) => {
    try {
        console.log('Clipping Magic upload request received from user:', req.user.id);
        req.startTime = Date.now(); // Initialize start time for processing duration
        
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        console.log(`Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

        // Create FormData for Clipping Magic API
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('image', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        // Track API cost start time
        const apiStartTime = Date.now();
        
        // Make request to Clipping Magic API
        const response = await fetch('https://clippingmagic.com/api/v1/images', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${CLIPPING_MAGIC_API_ID}:${CLIPPING_MAGIC_API_SECRET}`).toString('base64')}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        const responseTime = Date.now() - apiStartTime;

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Clipping Magic API error: ${response.status} - ${errorText}`);
            
            // Log failed API cost (no charge for failed requests)
            await dbHelpers.logApiCost({
                service_name: 'clipping_magic',
                operation_type: 'upload',
                cost_amount: 0.00, // No charge for failed requests
                user_id: req.user.id,
                request_id: `clipping_magic_${Date.now()}`,
                response_time_ms: responseTime,
                success: false,
                error_message: errorText,
                metadata: { file_size: req.file.size }
            });
            
            return res.status(response.status).json({ 
                error: 'Failed to upload image to Clipping Magic',
                details: errorText
            });
        }

        const result = await response.json();
        console.log('Clipping Magic upload successful:', result);

        // Log successful API cost using the helper function
        const costAmount = calculateClippingMagicCost('upload');
        await dbHelpers.logApiCost({
            service_name: 'clipping_magic',
            operation_type: 'upload',
            cost_amount: costAmount,
            user_id: req.user.id,
            request_id: `clipping_magic_${Date.now()}`,
            response_time_ms: responseTime,
            success: true,
            metadata: { 
                file_size: req.file.size, 
                image_id: result.id,
                credits_used: costAmount / 0.125 // Convert back to credits for reference
            }
        });

        // Upload original file to Supabase Storage
        const originalUpload = await SupabaseStorage.uploadFile(
            req.user.id.toString(),
            req.file.originalname,
            req.file.buffer,
            req.file.mimetype,
            'original'
        );

        // Save image to database with storage path
        const imageData = {
            user_id: req.user.id,
            original_filename: req.file.originalname,
            processed_filename: `clipping_magic_${Date.now()}.png`,
            storage_path: originalUpload.path,
            file_size: req.file.size,
            image_type: 'background_removal',
            tool_used: 'clipping_magic',
            credits_used: 1,
            processing_time_ms: Date.now() - req.startTime
        };

        await dbHelpers.saveImage(imageData);

        // Use credits
        await stripeHelpers.useCredits(req.user.id, 1, `Clipping Magic upload: ${req.file.originalname}`);

        // Return the id and secret needed for the White Label Smart Editor
        res.json({
            success: true,
            id: result.id,
            secret: result.secret,
            message: 'Image uploaded successfully. Ready to launch editor.'
        });

    } catch (error) {
        console.error('Clipping Magic upload error:', error);
        res.status(500).json({ 
            error: 'Internal server error during Clipping Magic upload',
            details: error.message 
        });
    }
});

// Stripe webhook endpoint
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
        case 'customer.subscription.created':
            console.log('Subscription created:', event.data.object);
            break;
        case 'customer.subscription.updated':
            console.log('Subscription updated:', event.data.object);
            break;
        case 'customer.subscription.deleted':
            console.log('Subscription deleted:', event.data.object);
            break;
        case 'invoice.payment_succeeded':
            console.log('Payment succeeded:', event.data.object);
            break;
        case 'invoice.payment_failed':
            console.log('Payment failed:', event.data.object);
            break;
        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    
    // Don't leak error details in production
    if (process.env.NODE_ENV === 'production') {
        res.status(500).json({ 
            error: 'Internal server error',
            message: 'Something went wrong. Please try again later.'
        });
    } else {
        res.status(500).json({ 
            error: 'Internal server error',
            message: err.message,
            stack: err.stack
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not found',
        message: 'The requested resource was not found'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit in production, just log
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Exit in all cases for uncaught exceptions
    process.exit(1);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database status: ${dbInitialized ? 'connected' : 'disconnected'}`);
});

// Image Management Endpoints
app.get('/api/user/images', authenticateToken, async (req, res) => {
    try {
        console.log(`🔍 Fetching images for user ${req.user.id} (${req.user.email})`);
        
        const images = await dbHelpers.getUserImages(req.user.id);
        console.log(`✅ Found ${images.length} images for user ${req.user.id}`);
        
        // Log first few images for debugging
        if (images.length > 0) {
            console.log('📋 Sample images:', images.slice(0, 3).map(img => ({
                id: img.id,
                original_filename: img.original_filename,
                image_type: img.image_type,
                tool_used: img.tool_used,
                created_at: img.created_at
            })));
        }
        
        res.json({ images });
    } catch (error) {
        console.error('❌ Error fetching user images:', error);
        res.status(500).json({ error: 'Failed to fetch images' });
    }
});

app.get('/api/user/images/:imageId/download', authenticateToken, async (req, res) => {
    try {
        const { imageId } = req.params;
        
        // Get image details from database
        const image = await dbHelpers.getImageById(imageId);
        if (!image || image.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Image not found' });
        }

        // Check if storage path exists
        if (!image.storage_path) {
            // For preview images without storage, we can't serve them directly
            // Return a placeholder or error
            return res.status(404).json({ 
                error: 'Image file not available for download',
                message: 'This preview image was not stored permanently. Please regenerate it.'
            });
        }

        // Download file from Supabase Storage
        const fileBuffer = await SupabaseStorage.downloadFile(image.storage_path);

        // Set appropriate headers
        const ext = path.extname(image.processed_filename).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.svg') contentType = 'image/svg+xml';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${image.processed_filename}"`);
        
        // Send the file buffer
        res.send(fileBuffer);
    } catch (error) {
        console.error('Error downloading image:', error);
        res.status(500).json({ error: 'Failed to download image' });
    }
});

app.delete('/api/user/images/:imageId', authenticateToken, async (req, res) => {
    try {
        const { imageId } = req.params;
        
        // Get image details from database
        const image = await dbHelpers.getImageById(imageId);
        if (!image || image.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Image not found' });
        }

        // Delete files from Supabase Storage
        if (image.storage_path) {
            try {
                await SupabaseStorage.deleteFile(image.storage_path);
            } catch (error) {
                console.warn(`Could not delete file from storage ${image.storage_path}:`, error.message);
            }
        }

        // Delete from database
        await dbHelpers.deleteImage(imageId);
        
        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ error: 'Failed to delete image' });
    }
});

// Automatic cleanup of old images
async function cleanupOldImages() {
    try {
        console.log('Starting image cleanup...');
        
        // Get retention periods based on subscription
        const retentionDays = {
            free: 30,
            basic: 60,
            starter: 90,
            professional: 120,
            enterprise: 365
        };

        // Get all images with their user subscription info
        const oldImages = await dbHelpers.getOldImagesForCleanup();
        
        let deletedCount = 0;
        for (const image of oldImages) {
            const retentionPeriod = retentionDays[image.subscription_status] || 30;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionPeriod);
            
            if (new Date(image.created_at) < cutoffDate) {
                try {
                    // Delete files from Supabase Storage
                    if (image.storage_path) {
                        await SupabaseStorage.deleteFile(image.storage_path).catch(() => {});
                    }
                    
                    // Delete from database
                    await dbHelpers.deleteImage(image.id);
                    deletedCount++;
                } catch (error) {
                    console.error(`Error cleaning up image ${image.id}:`, error);
                }
            }
        }
        
        console.log(`Image cleanup completed. Deleted ${deletedCount} old images.`);
    } catch (error) {
        console.error('Error during image cleanup:', error);
    }
}

// Run cleanup daily at 2 AM UTC
setInterval(cleanupOldImages, 24 * 60 * 60 * 1000); // Initial cleanup after 1 hour
setTimeout(cleanupOldImages, 60 * 60 * 1000);
