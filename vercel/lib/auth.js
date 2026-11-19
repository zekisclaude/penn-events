// Admin sign-in: one shared password (ADMIN_PASSWORD) -> signed, HttpOnly session cookie.
import crypto from 'node:crypto';

const COOKIE = 'pe_session';
const TTL = 60 * 60 * 12; // 12 hours
const secret = () => process.env.SESSION_SECRET || '';
const sign = (v) => crypto.createHmac('sha256', secret()).update(v).digest('base64url');

export function makeSession() {
  const exp = Math.floor(Date.now() / 1000) + TTL;
  const v = `admin.${exp}`;
  return `${v}.${sign(v)}`;
}
export function parseCookies(req) {
  const out = {};
  for (const p of (req.headers.cookie || '').split(';')) {
    const i = p.indexOf('='); if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  }
  return out;
}
export function isAdmin(req) {
  if (!secret()) return false;
  const t = parseCookies(req)[COOKIE]; if (!t) return false;
  const [role, exp, mac] = t.split('.'); if (role !== 'admin' || !exp || !mac) return false;
  const good = sign(`${role}.${exp}`);
  const a = Buffer.from(mac), b = Buffer.from(good);
  return a.length === b.length && crypto.timingSafeEqual(a, b) && Number(exp) > Date.now() / 1000;
}
export function passwordOk(pw) {
  const want = process.env.ADMIN_PASSWORD || '';
  if (!want || typeof pw !== 'string') return false;
  const a = crypto.createHash('sha256').update(pw).digest(), b = crypto.createHash('sha256').update(want).digest();
  return crypto.timingSafeEqual(a, b);
}
export const cookieHeader = (token, clear = false) =>
  `${COOKIE}=${clear ? '' : encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${clear ? 0 : TTL}`;

// Small in-memory throttle for login attempts (per warm instance; a speed bump, not a guarantee).
const fails = new Map();
export function throttled(ip) {
  const now = Date.now(), f = (fails.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  fails.set(ip, f); return f.length >= 8;
}
export const noteFail = (ip) => fails.set(ip, [...(fails.get(ip) || []), Date.now()]);
