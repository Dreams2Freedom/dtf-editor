const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Import our modules
const { dbHelpers, initializeDatabase } = require('./database-postgres');
const { authenticateToken, checkCredits } = require('./auth');
const { stripeHelpers } = require('./stripe');

// Import routes
const authRoutes = require('./auth-routes');
const userRoutes = require('./user-routes');
const adminRoutes = require('./admin-routes');

const app = express();

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

// Security middleware
app.use(helmet());
app.use(morgan('combined'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 30 * 1024 * 1024, // 30MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// API configuration
const VECTORIZER_ENDPOINT = 'https://vectorizer.ai/api/v1/vectorize';
const VECTORIZER_API_ID = process.env.VECTORIZER_API_ID || 'vkxq4f4d9b7qwjh';
const VECTORIZER_API_SECRET = process.env.VECTORIZER_API_SECRET || '3i3cdh559d3e1csqi2e4rsk319qdrbn2otls0flbdjqo9qmrnkfj';

const CLIPPING_MAGIC_ENDPOINT = 'https://api.clippingmagic.com/remove-background';
const CLIPPING_MAGIC_API_ID = process.env.CLIPPING_MAGIC_API_ID || '24469';
const CLIPPING_MAGIC_API_SECRET = process.env.CLIPPING_MAGIC_API_SECRET || 'mngg89bme2has9hojc7n5cbjr8ptg3bjc8r3v225c555nhkvv11';

// Authentication routes
app.use('/api/auth', authRoutes);

// User routes (protected)
app.use('/api/user', userRoutes);

// Admin routes (protected)
app.use('/api/admin', adminRoutes);

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

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/vectorize', (req, res) => {
    res.sendFile(path.join(__dirname, 'vectorize.html'));
});

app.get('/background-remove', (req, res) => {
    res.sendFile(path.join(__dirname, 'background-remove.html'));
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

// Simple health check endpoint (works without database)
app.get('/health', (req, res) => {
    console.log('Simple health check requested');
    res.status(200).json({ 
        status: 'ok', 
        message: 'Server is running', 
        timestamp: new Date().toISOString(),
        database: dbInitialized ? 'connected' : 'disconnected'
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    console.log('Health check requested');
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        services: {
            vectorizer: 'available (test mode)',
            vectorizerPreview: 'available',
            clippingMagic: 'available',
            clippingMagicUpload: 'available',
            authentication: 'available',
            userManagement: 'available',
            adminPanel: 'available'
        },
        modes: {
            test: 'Free testing mode',
            preview: 'Watermarked preview images',
            production: 'Full quality (requires subscription)'
        }
    });
});

// Vectorizer.AI proxy endpoint (with credit checking)
app.post('/api/vectorize', authenticateToken, checkCredits(1), upload.single('image'), async (req, res) => {
    try {
        console.log('Vectorization request received from user:', req.user.id);
        
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        console.log(`Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

        // Get mode from query parameters (default to test for development)
        const mode = req.query.mode || 'test';
        console.log(`Using mode: ${mode}`);

        // Create FormData for Vectorizer.AI
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('image', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        // Make request to Vectorizer.AI
        const response = await fetch(VECTORIZER_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${VECTORIZER_API_ID}:${VECTORIZER_API_SECRET}`).toString('base64')}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Vectorizer.AI API error: ${response.status} - ${errorText}`);
            return res.status(response.status).json({ 
                error: 'Failed to vectorize image',
                details: errorText
            });
        }

        // Get the response as buffer
        const vectorBuffer = await response.buffer();
        console.log(`Vectorization successful: ${vectorBuffer.length} bytes`);

        // Save image to database
        const imageData = {
            user_id: req.user.id,
            original_filename: req.file.originalname,
            processed_filename: `vectorized_${Date.now()}.svg`,
            file_size: req.file.size,
            image_type: 'vectorization',
            tool_used: 'vectorizer',
            credits_used: 1,
            processing_time_ms: Date.now() - req.startTime
        };

        await dbHelpers.saveImage(imageData);

        // Use credits
        await stripeHelpers.useCredits(req.user.id, 1, `Vectorized image: ${req.file.originalname}`);

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
app.post('/api/preview', authenticateToken, checkCredits(1), upload.single('image'), async (req, res) => {
    try {
        console.log('Preview generation request received from user:', req.user.id);
        
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        console.log(`Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

        // Get mode from query parameters (default to preview for watermarked results)
        const mode = req.query.mode || 'preview';
        console.log(`Using mode: ${mode}`);

        // Create FormData for Vectorizer.AI
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('image', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        // Make request to Vectorizer.AI
        const response = await fetch(VECTORIZER_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${VECTORIZER_API_ID}:${VECTORIZER_API_SECRET}`).toString('base64')}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Vectorizer.AI API error: ${response.status} - ${errorText}`);
            return res.status(response.status).json({ 
                error: 'Failed to generate preview',
                details: errorText
            });
        }

        // Get the response as buffer
        const previewBuffer = await response.buffer();
        console.log(`Preview generation successful: ${previewBuffer.length} bytes`);

        // Save image to database
        const imageData = {
            user_id: req.user.id,
            original_filename: req.file.originalname,
            processed_filename: `preview_${Date.now()}.svg`,
            file_size: req.file.size,
            image_type: 'preview',
            tool_used: 'vectorizer',
            credits_used: 1,
            processing_time_ms: Date.now() - req.startTime
        };

        await dbHelpers.saveImage(imageData);

        // Use credits
        await stripeHelpers.useCredits(req.user.id, 1, `Preview generated: ${req.file.originalname}`);

        // Set appropriate headers for SVG preview
        res.set({
            'Content-Type': 'image/svg+xml',
            'Content-Length': previewBuffer.length,
            'Content-Disposition': 'attachment; filename="preview.svg"'
        });

        res.send(previewBuffer);

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

        // Make request to Clipping Magic API
        const response = await fetch('https://clippingmagic.com/api/v1/images', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${CLIPPING_MAGIC_API_ID}:${CLIPPING_MAGIC_API_SECRET}`).toString('base64')}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Clipping Magic API error: ${response.status} - ${errorText}`);
            return res.status(response.status).json({ 
                error: 'Failed to upload image to Clipping Magic',
                details: errorText
            });
        }

        const result = await response.json();
        console.log('Clipping Magic upload successful:', result);

        // Save image to database
        const imageData = {
            user_id: req.user.id,
            original_filename: req.file.originalname,
            processed_filename: `clipping_magic_${Date.now()}.png`,
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
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        details: error.message 
    });
});

// Start server with delay to allow database connection
setTimeout(() => {
    app.listen(PORT, () => {
        console.log(`🚀 DTF Editor server running on http://localhost:${PORT}`);
        console.log(`📁 Static files served from: ${__dirname}`);
        console.log(`🔧 API endpoints:`);
        console.log(`   - GET / - Root health check`);
        console.log(`   - POST /api/auth/register - User registration`);
        console.log(`   - POST /api/auth/login - User login`);
        console.log(`   - GET /api/user/profile - User profile`);
        console.log(`   - GET /api/admin/users - Admin user management`);
        console.log(`   - POST /api/vectorize - Vectorize images (requires auth)`);
        console.log(`   - POST /api/preview - Generate preview images (requires auth)`);
        console.log(`   - POST /api/clipping-magic-upload - Upload for Clipping Magic editor (requires auth)`);
        console.log(`   - GET /api/health - Health check`);
        console.log(`📋 Features:`);
        console.log(`   - User authentication and authorization`);
        console.log(`   - Credit-based usage tracking`);
        console.log(`   - Stripe subscription management`);
        console.log(`   - Admin dashboard and user management`);
        console.log(`   - Image processing with credit validation`);
        console.log(`🔄 Railway deployment version: ${new Date().toISOString()}`);
        console.log(`🗄️  Database status: ${dbInitialized ? 'Connected' : 'Disconnected'}`);
    }).on('error', (error) => {
        console.error('Failed to start server:', error);
        // Don't exit on port errors, just log them
        if (error.code === 'EADDRINUSE') {
            console.error('Port is already in use. Please check if another instance is running.');
        }
    });
}, 2000); // 2 second delay to allow database connection

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit, just log the error
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit, just log the error
});
