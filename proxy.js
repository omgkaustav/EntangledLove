// proxy.js - Minimal local Node CORS proxy for Moth Atlas API
// Forwards the Authorization header; stores NO keys or backend state.
const http = require('http');
const https = require('https');

const PORT = 8787;
const TARGET_HOST = 'api.mothquantum.com';

http.createServer((req, res) => {
  // Enable CORS for localhost
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Forward request to Moth Atlas
  const options = {
    hostname: TARGET_HOST,
    port: 443,
    path: req.url,
    method: req.method,
    headers: {
      'user-agent': req.headers['user-agent'] || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ...req.headers,
      host: TARGET_HOST
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  });

  req.pipe(proxyReq);
}).listen(PORT, () => {
  console.log(`[Atlas Proxy] Running at http://localhost:${PORT}/api/v1`);
});
