// Local stand-in for Vercel: serves public/ and routes /api/* to the same handlers.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const port = Number(process.env.PORT || 3100);
const pub = path.join(process.cwd(), 'public');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json' };
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname.startsWith('/api/')) {
    try { const m = await import(`./api/${u.pathname.slice(5).replace(/[^a-z]/g, '')}.js`); return await m.default(req, res); }
    catch (e) { res.statusCode = 404; return res.end('{"error":"not_found"}'); }
  }
  const f = path.join(pub, u.pathname === '/' ? 'index.html' : u.pathname.replace(/\.\./g, ''));
  fs.readFile(f, (err, b) => { if (err) { res.statusCode = 404; return res.end('not found'); } res.setHeader('Content-Type', mime[path.extname(f)] || 'application/octet-stream'); res.end(b); });
}).listen(port, '127.0.0.1', () => console.log('dev server on', port));
