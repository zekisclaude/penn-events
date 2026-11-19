export async function readJson(req, max = 1_000_000) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > max) throw Object.assign(new Error('too_large'), { status: 413 }); chunks.push(c); }
  const s = Buffer.concat(chunks).toString('utf8'); return s ? JSON.parse(s) : {};
}
export const send = (res, status, body, headers = {}) => {
  res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
};
export const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
