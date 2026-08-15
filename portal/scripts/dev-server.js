// Servidor local para probar la función /api/worker-hours sin Vercel CLI.
// Uso: node scripts/dev-server.js
// Requiere .env.local con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar .env.local manualmente
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      process.env[key] = valueParts.join('=').trim();
    }
  }
}

const { default: handler } = await import('../api/worker-hours.js');

const PORT = process.env.PORT || 3000;

function wrapRes(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
  };
  return res;
}

const server = http.createServer((req, res) => {
  wrapRes(res);

  if (req.url === '/api/worker-hours' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        req.body = body ? JSON.parse(body) : {};
      } catch {
        req.body = {};
      }
      handler(req, res);
    });
    return;
  }

  if (req.url.startsWith('/api/') && req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.statusCode = 200;
    res.end();
    return;
  }

  res.statusCode = 404;
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`🚀 Dev server escuchando en http://localhost:${PORT}`);
  console.log(`📍 POST http://localhost:${PORT}/api/worker-hours`);
});
