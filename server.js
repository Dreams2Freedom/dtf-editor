const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs').promises;
require('dotenv').config();

// Import our modules
const { dbHelpers, initializeDatabase } = require('./database-postgres');
const { authenticateToken, checkCredits } = require('./auth');
const { stripeHelpers } = require('./stripe');
const { logApiCost, calculateVectorizerCost, calculateClippingMagicCost } = require('./cost-tracking');
const SupabaseStorage = require('./supabase-storage');

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

// Security middleware with CSP that allows Tailwind CDN
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            fontSrc: ["'self'", "https:", "data:"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            manifestSrc: ["'self'"]
        }
    }
}));
app.use(morgan('combined'));

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

// Configure multer for file uploads (wellstill use this for temporary processing)
const upload = multer({
    storage: multer.memoryStorage(), // Use memory storage for processing
    limits: {
        fileSize: 30 * 1024 * 1024 // 30B limit
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

// Helper function to calculate Vectorizer.AI costs
function calculateVectorizerCost(operationType) {
    const creditCosts = {
        'test': 0.000,        // Free
        'test_preview': 0.000, // Free
        'preview': 0.200,     // 0.200 credits
        'vectorize': 1.000,   // 1.000 credits
        'upgrade_preview': 0.900, // 0.900 credits
        'download_format': 0.100, // 0.100 credits
        'storage_day': 0.010  // 0.010 credits per day
    };
    
    const credits = creditCosts[operationType] || 0;
    return credits * 0.20; // $0.20 per credit
}

// Helper function to calculate Clipping Magic costs
function calculateClippingMagicCost(operationType) {
    // Clipping Magic pricing: 1 Credit = 1 Image
    // Downloading a result multiple times counts only once
    // Duplicate uploads of the same image count separately
    const creditCosts = {
        'upload': 1.000,      // 1 credit per image upload
        'edit': 0.000,        // Free to re-edit (no additional cost)
        'download': 0.000     // Free to download multiple times (no additional cost)
    };
    
    const credits = creditCosts[operationType] || 0;
    return credits * 0.125; // $0.125 per credit
}

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

        // Upload original file to Supabase Storage
        const originalUpload = await SupabaseStorage.uploadFile(
            req.user.id.toString(),
            req.file.originalname,
            req.file.buffer,
            req.file.mimetype,
            'original'
        );

        // Upload processed file to Supabase Storage
        const processedFilename = `preview_${Date.now()}.svg`;
        const processedUpload = await SupabaseStorage.uploadFile(
            req.user.id.toString(),
            processedFilename,
            previewBuffer,
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
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        details: error.message 
    });
});

// Start server immediately for Railway health check
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
        console.log(`🔄 Railway deployment version: ${new Date().toISOString()} - Force redeploy for environment variables`);
        console.log(`🗄️  Database status: ${dbInitialized ? 'Connected' : 'Disconnected'}`);
    }).on('error', (error) => {
        console.error('Failed to start server:', error);
        // Don't exit on port errors, just log them
        if (error.code === 'EADDRINUSE') {
            console.error('Port is already in use. Please check if another instance is running.');
        }
    });

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

// Image Management Endpoints
app.get('/api/user/images', authenticateToken, async (req, res) => {
    try {
        const images = await dbHelpers.getUserImages(req.user.id);
        res.json({ images });
    } catch (error) {
        console.error('Error fetching user images:', error);
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
            return res.status(404).json({ error: 'Image file not found in storage' });
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
