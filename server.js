const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Vectorizer.AI API configuration
const VECTORIZER_ENDPOINT = 'https://vectorizer.ai/api/v1/vectorize';
const VECTORIZER_API_ID = process.env.VECTORIZER_API_ID || 'vkxq4f4d9b7qwjh';
const VECTORIZER_API_SECRET = process.env.VECTORIZER_API_SECRET || '3i3cdh559d3e1csqi2e4rsk319qdrbn2otls0flbdjqo9qmrnkfj';

// Clipping Magic API configuration (placeholder - need correct endpoint)
const CLIPPING_MAGIC_ENDPOINT = 'https://api.clippingmagic.com/remove-background';
const CLIPPING_MAGIC_API_ID = process.env.CLIPPING_MAGIC_API_ID || '24469';
const CLIPPING_MAGIC_API_SECRET = process.env.CLIPPING_MAGIC_API_SECRET || 'mngg89bme2has9hojc7n5cbjr8ptg3bjc8r3v225c555nhkvv11';

// Vectorizer.AI proxy endpoint
app.post('/api/vectorize', upload.single('image'), async (req, res) => {
    try {
        console.log('Vectorization request received');
        
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
        
        // Add mode parameter
        formData.append('mode', mode);

        // Create Basic Auth header
        const credentials = Buffer.from(`${VECTORIZER_API_ID}:${VECTORIZER_API_SECRET}`).toString('base64');

        console.log('Making request to Vectorizer.AI...');

        const response = await fetch(VECTORIZER_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        console.log(`Vectorizer.AI response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Vectorizer.AI error:', errorText);
            return res.status(response.status).json({ 
                error: `Vectorizer.AI API error: ${response.status} - ${response.statusText}`,
                details: errorText
            });
        }

        // Get the response as buffer
        const vectorBuffer = await response.buffer();
        console.log(`Vectorization successful: ${vectorBuffer.length} bytes`);

        // Determine content type and filename based on mode
        let contentType, filename;
        if (mode === 'preview') {
            contentType = 'image/png';
            filename = 'preview.png';
        } else {
            contentType = 'image/png';
            filename = 'vectorized.png';
        }

        // Set appropriate headers
        res.set({
            'Content-Type': contentType,
            'Content-Length': vectorBuffer.length,
            'Content-Disposition': `attachment; filename="${filename}"`
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

// Vectorizer.AI preview endpoint
app.post('/api/preview', upload.single('image'), async (req, res) => {
    try {
        console.log('Preview request received');
        
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        console.log(`Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

        // Create FormData for Vectorizer.AI
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('image', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });
        
        // Use preview mode
        formData.append('mode', 'test');

        // Create Basic Auth header
        const credentials = Buffer.from(`${VECTORIZER_API_ID}:${VECTORIZER_API_SECRET}`).toString('base64');

        console.log('Making preview request to Vectorizer.AI...');

        const response = await fetch(VECTORIZER_ENDPOINT, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                ...formData.getHeaders()
            },
            body: formData
        });

        console.log(`Vectorizer.AI preview response status: ${response.status}`);
        console.log(`Vectorizer.AI response headers:`, response.headers);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Vectorizer.AI preview error:', errorText);
            return res.status(response.status).json({ 
                error: `Vectorizer.AI API error: ${response.status} - ${response.statusText}`,
                details: errorText
            });
        }

        // Get the response as buffer
        const previewBuffer = await response.buffer();
        console.log(`Preview generation successful: ${previewBuffer.length} bytes`);
        console.log(`Preview buffer first 100 bytes: ${previewBuffer.slice(0, 100).toString('hex')}`);
        console.log(`Preview buffer is PNG: ${previewBuffer.slice(0, 8).toString() === '\x89PNG\r\n\x1a\n'}`);
        // Set appropriate headers for PNG preview
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

// Clipping Magic proxy endpoint (placeholder)
app.post('/api/remove-background', upload.single('image'), async (req, res) => {
    try {
        console.log('Background removal request received');
        
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided' });
        }

        console.log(`Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

        // TODO: Implement Clipping Magic API call once we have the correct endpoint
        // For now, return an error
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

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        services: {
            vectorizer: 'available (test mode)',
            vectorizerPreview: 'available',
            clippingMagic: 'pending'
        },
        modes: {
            test: 'Free testing mode',
            preview: 'Watermarked preview images',
            production: 'Full quality (requires subscription)'
        }
    });
});

// Serve the main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        details: error.message 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 DTF Editor server running on http://localhost:${PORT}`);
    console.log(`📁 Static files served from: ${__dirname}`);
    console.log(`🔧 API endpoints:`);
    console.log(`   - POST /api/vectorize - Vectorize images (test mode by default)`);
    console.log(`   - POST /api/preview - Generate preview images (watermarked)`);
    console.log(`   - POST /api/remove-background - Remove backgrounds (pending)`);
    console.log(`   - GET /api/health - Health check`);
    console.log(`📋 Modes available:`);
    console.log(`   - test: Free testing mode (default)`);
    console.log(`   - preview: Watermarked preview images`);
    console.log(`   - production: Full quality (requires subscription)`);
}); 