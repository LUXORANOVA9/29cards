const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        platform: '29Cards',
        backend: 'https://29cards-api.railway.app',
        timestamp: new Date().toISOString()
    });
});

// Serve the HTML for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🎮 29Cards platform running on port ${PORT}`);
    console.log(`🌐 Access at: http://localhost:${PORT}`);
    console.log(`🚂 Backend API: https://29cards-api.railway.app`);
});