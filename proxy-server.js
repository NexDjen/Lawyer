const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
const PORT = 3008;

// CORS для всех запросов
app.use(cors({
  origin: true,
  credentials: true
}));

// Проксирование API запросов на бэкенд
app.use('/api', (req, res) => {
  console.log(`[Proxy] Proxying request: ${req.method} ${req.url} to http://localhost:80${req.url}`);
  console.log(`[Proxy] Original URL: ${req.originalUrl}`);
  
  const options = {
    hostname: 'localhost',
    port: 80,
    path: req.originalUrl, // Используем originalUrl вместо url
    method: req.method,
    headers: {
      ...req.headers,
      host: 'localhost:80' // Важно: устанавливаем правильный host
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    console.log(`[Proxy] Received response for: ${req.method} ${req.url} - Status: ${proxyRes.statusCode}`);
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[Proxy] Proxy error for ${req.method} ${req.url}:`, err);
    res.status(500).json({ error: 'Proxy error' });
  });

  req.pipe(proxyReq);
});

// Статический контент фронтенда
app.use(express.static('build'));

// Fallback для SPA
app.get('*', (req, res) => {
  res.sendFile('build/index.html', { root: '.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`📡 API requests proxied to http://localhost:80`);
});
