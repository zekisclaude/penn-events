import { makeSession, passwordOk, cookieHeader, throttled, noteFail } from '../lib/auth.js';
import { readJson, send, clientIp } from '../lib/http.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  const ip = clientIp(req);
  if (throttled(ip)) return send(res, 429, { error: 'too_many_attempts' });
  let body; try { body = await readJson(req, 4000); } catch { return send(res, 400, { error: 'bad_request' }); }
  if (!passwordOk(body.password) || !process.env.SESSION_SECRET) { noteFail(ip); return send(res, 401, { error: 'wrong_password' }); }
  send(res, 200, { admin: true }, { 'Set-Cookie': cookieHeader(makeSession()) });
}
