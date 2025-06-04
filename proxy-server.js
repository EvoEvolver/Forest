// ONLY FOR TEST！！
// Test for auth email proxy without change in the superbase


const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3000;
const TARGET_PORT = 39999;

console.log('🔄 Starting proxy server for Supabase auth...');
console.log(`📍 Proxy: http://localhost:${PORT} → http://localhost:${TARGET_PORT}`);

// Health check endpoint
app.get('/proxy-health', (req, res) => {
  res.json({ 
    status: 'ok', 
    proxy: `localhost:${PORT} → localhost:${TARGET_PORT}`,
    timestamp: new Date().toISOString()
  });
});

// Proxy all requests to the target server
app.use('/', createProxyMiddleware({
  target: `http://localhost:${TARGET_PORT}`,
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying
  logLevel: 'info',
  onProxyRes: function (proxyRes, req, res) {
    console.log(`✅ Proxied: ${req.method} ${req.url} → ${proxyRes.statusCode}`);
  },
  onError: function (err, req, res) {
    console.error(`❌ Proxy error for ${req.url}:`, err.message);
    res.status(500).send(`Proxy Error: ${err.message}`);
  }
}));

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`🔗 Forwarding to http://localhost:${TARGET_PORT}`);
  console.log('📋 Test URLs:');
  console.log(`   - Health check: http://localhost:${PORT}/proxy-health`);
  console.log(`   - Main app: http://localhost:${PORT}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down proxy server...');
  process.exit(0);
}); 