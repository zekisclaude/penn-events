// Optional AI extraction for the admin desk. Needs ANTHROPIC_API_KEY on the server; never exposed to the browser.
import { isAdmin } from '../lib/auth.js';
import { readJson, send } from '../lib/http.js';
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
  if (!isAdmin(req)) return send(res, 403, { error: 'forbidden' });
  if (!process.env.ANTHROPIC_API_KEY) return send(res, 501, { error: 'not_configured' });
  try {
    const { prompt, images = [] } = await readJson(req, 6_000_000);
    const content = [...images.slice(0, 4).map((b) => ({ type: 'image', source: { type: 'base64', media_type: b.type, data: b.data } })), { type: 'text', text: String(prompt).slice(0, 40000) }];
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.EXTRACT_MODEL || 'claude-sonnet-5-5', max_tokens: 8000, messages: [{ role: 'user', content }] }),
    });
    const j = await r.json(); if (!r.ok) return send(res, 502, { error: 'upstream_error' });
    send(res, 200, { text: (j.content || []).filter((x) => x.type === 'text').map((x) => x.text).join('') });
  } catch { send(res, 500, { error: 'server_error' }); }
}
