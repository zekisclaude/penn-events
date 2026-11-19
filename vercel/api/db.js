// Data API. Access rules mirror the hosting rules the site was built with:
//   events   : anyone reads, admin writes
//   metrics  : anyone creates (validated, create-only), admin reads
//   review, sources, ingest : admin only
import { COLLECTIONS, validId, getDoc, writeDoc, deleteDoc, listDocs, ensureSeeded } from '../lib/store.js';
import { isAdmin } from '../lib/auth.js';
import { readJson, send, clientIp } from '../lib/http.js';

const METRIC_TYPES = ['visit', 'event_view', 'rsvp_click', 'share_native', 'share_copy', 'share_failed', 'filter_change', 'empty_result'];
const METRIC_KEYS = ['type', 'eventId', 'isDemoEvent', 'detail', 'device', 'day', 'at', 'admin'];
const rate = new Map();
function limited(ip) { const now = Date.now(), a = (rate.get(ip) || []).filter((t) => now - t < 60_000); a.push(now); rate.set(ip, a); return a.length > 120; }

function cleanMetric(d) {
  if (!d || typeof d !== 'object' || !METRIC_TYPES.includes(d.type)) return null;
  const out = {};
  for (const k of METRIC_KEYS) if (k in d) out[k] = d[k];
  const str = (v, n) => v == null || (typeof v === 'string' && v.length <= n);
  if (!str(out.eventId, 120) || !str(out.detail, 200) || !/^d[a-z0-9]{16}$/.test(out.device || '') || !/^\d{4}-\d{2}-\d{2}$/.test(out.day || '')) return null;
  out.admin = false; // the server, not the browser, decides whether traffic is admin traffic
  out.isDemoEvent = !!out.isDemoEvent; out.at = new Date().toISOString();
  return out;
}

export default async function handler(req, res) {
  try {
    const u = new URL(req.url, 'http://x');
    const c = u.searchParams.get('c'), id = u.searchParams.get('id');
    if (!COLLECTIONS.includes(c)) return send(res, 400, { error: 'bad_collection' });
    if (id != null && !validId(id)) return send(res, 400, { error: 'bad_id' });
    const admin = isAdmin(req);
    await ensureSeeded();

    if (req.method === 'GET') {
      if (c !== 'events' && !admin) return send(res, c === 'metrics' || c === 'review' || c === 'sources' || c === 'ingest' ? 403 : 404, { error: 'forbidden' });
      if (id) { const d = await getDoc(c, id); return send(res, 200, d ? { id, data: d.data, version: d.version } : { id, data: null, version: null }); }
      const docs = await listDocs(c);
      return send(res, 200, { docs: docs.map((d) => ({ id: d.id, data: d.data, version: d.version })) });
    }

    const body = await readJson(req);
    if (req.method === 'POST' && c === 'metrics') {
      if (limited(clientIp(req))) return send(res, 429, { error: 'rate_limited' });
      const m = cleanMetric(body.data); if (!m) return send(res, 400, { error: 'bad_metric' });
      if (admin) m.admin = true;
      const mid = `m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      await writeDoc('metrics', mid, m); return send(res, 200, { id: mid });
    }
    if (req.method === 'PUT' && c === 'metrics' && id && !admin) {
      // The page records one metric per action under a fresh random id. Anyone may create one; nobody but admin may change or read them.
      if (limited(clientIp(req))) return send(res, 429, { error: 'rate_limited' });
      const m = cleanMetric(body.data); if (!m) return send(res, 400, { error: 'bad_metric' });
      if (await getDoc('metrics', id)) return send(res, 403, { error: 'forbidden' });
      await writeDoc('metrics', id, m); return send(res, 200, { id });
    }
    if (!admin) return send(res, 403, { error: 'forbidden' });
    if (!id) return send(res, 400, { error: 'id_required' });
    if (c === 'metrics' && req.method === 'PUT') { const m = cleanMetric(body.data); if (!m) return send(res, 400, { error: 'bad_metric' }); m.admin = true; body.data = m; }
    if (req.method === 'PUT' || req.method === 'PATCH') {
      if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) return send(res, 400, { error: 'bad_data' });
      const r = await writeDoc(c, id, body.data, { mode: req.method === 'PATCH' ? 'update' : 'set', ifVersion: body.ifVersion ?? null });
      return r.error ? send(res, r.error === 'not_found' ? 404 : 409, r) : send(res, 200, r);
    }
    if (req.method === 'DELETE') { await deleteDoc(c, id); return send(res, 200, { ok: true }); }
    return send(res, 405, { error: 'method_not_allowed' });
  } catch (e) {
    console.error('db error', e?.name, e?.message);
    return send(res, e?.status || 500, { error: 'server_error' });
  }
}
