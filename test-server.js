const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('=== Test Server Starting ===');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Serve static files
app.use(express.static(__dirname));

// API endpoints
app.get('/', (req, res) => {
    console.log('Root endpoint hit');
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
    console.log('Health check hit');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
    console.log('API health check hit');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch all other routes and serve index.html for SPA
app.get('*', (req, res) => {
    console.log('Catch-all route hit:', req.path);
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
    console.log('=== Test Server Ready ===');
}).on('error', (error) => {
    console.error('Test server error:', error);
    process.exit(1);
});
