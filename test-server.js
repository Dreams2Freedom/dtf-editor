const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

console.log('=== Test Server Starting ===');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

app.get('/', (req, res) => {
    console.log('Root endpoint hit');
    res.json({ status: 'ok', message: 'Test server is running' });
});

app.get('/health', (req, res) => {
    console.log('Health check hit');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Test server running on port ${PORT}`);
    console.log('=== Test Server Ready ===');
}).on('error', (error) => {
    console.error('Test server error:', error);
    process.exit(1);
});
