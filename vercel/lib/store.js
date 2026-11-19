// Document store. Production: private Vercel Blob (one JSON blob per document, guarded by ETags).
// Local tests (no BLOB_READ_WRITE_TOKEN): files under .localdb/.
import { put, get, list, del } from '@vercel/blob';
import fs from 'node:fs/promises';
import path from 'node:path';

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const LOCAL = process.env.LOCAL_DB_DIR || path.join(process.cwd(), '.localdb');
const SAFE = /^[A-Za-z0-9_.:@+-]{1,200}$/;
export const COLLECTIONS = ['events', 'review', 'sources', 'ingest', 'metrics'];
export const validId = (s) => typeof s === 'string' && SAFE.test(s) && s !== '.' && s !== '..';
const key = (c, id) => `db/${c}/${id}.json`;
const SEED_DIR = path.join(process.cwd(), 'seed');

async function readStream(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

export async function getDoc(c, id) {
  if (useBlob) {
    const r = await get(key(c, id), { access: 'private', useCache: false }).catch((e) => (e?.name === 'BlobNotFoundError' ? null : Promise.reject(e)));
    if (!r || r.statusCode !== 200) return null;
    const body = JSON.parse(await readStream(r.stream));
    return { id, data: body.data, version: body.version, etag: r.blob.etag };
  }
  try {
    const body = JSON.parse(await fs.readFile(path.join(LOCAL, c, id + '.json'), 'utf8'));
    return { id, data: body.data, version: body.version, etag: String(body.version) };
  } catch { return null; }
}

// Writes with optimistic concurrency. mode "set" replaces, "update" merges top-level fields.
export async function writeDoc(c, id, data, { mode = 'set', ifVersion = null, forceVersion = null } = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const cur = await getDoc(c, id);
    if (mode === 'update' && !cur) return { error: 'not_found' };
    if (ifVersion != null && (!cur || cur.version !== ifVersion)) return { error: 'conflict', version: cur?.version ?? null };
    const next = mode === 'update' ? { ...cur.data, ...data } : data;
    const version = forceVersion ?? ((cur?.version ?? 0) + 1);
    const body = JSON.stringify({ data: next, version, updatedAt: new Date().toISOString() });
    if (useBlob) {
      try {
        await put(key(c, id), body, { access: 'private', allowOverwrite: true, contentType: 'application/json', addRandomSuffix: false, ...(cur ? { ifMatch: cur.etag } : {}) });
      } catch (e) {
        if (e?.name === 'BlobPreconditionFailedError') continue; // someone else wrote first; re-read and retry
        throw e;
      }
    } else {
      await fs.mkdir(path.join(LOCAL, c), { recursive: true });
      await fs.writeFile(path.join(LOCAL, c, id + '.json'), body);
    }
    return { id, version };
  }
  return { error: 'conflict' };
}

export async function deleteDoc(c, id) {
  if (useBlob) await del(key(c, id)); else await fs.rm(path.join(LOCAL, c, id + '.json'), { force: true });
}

export async function listDocs(c, { limit = 1000 } = {}) {
  const out = [];
  if (useBlob) {
    let cursor;
    do {
      const r = await list({ prefix: `db/${c}/`, limit: 1000, cursor });
      const rows = await Promise.all(r.blobs.map((b) => getDoc(c, b.pathname.slice(`db/${c}/`.length, -5))));
      out.push(...rows.filter(Boolean));
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor && out.length < limit);
  } else {
    let names = [];
    try { names = await fs.readdir(path.join(LOCAL, c)); } catch {}
    for (const n of names) { const d = await getDoc(c, n.slice(0, -5)); if (d) out.push(d); }
  }
  return out.slice(0, limit);
}

// Seed and migrations. seed/manifest.json {version, delete:[[collection,id],...]} says what to remove; every file under seed/
// is created if absent, or refreshed if nobody has edited it since it was seeded (seeded docs are always stored at version 1,
// so any admin edit moves a doc past version 1 and protects it from later seed refreshes).
let seeding = null;
const MARKER = 'db/_meta/seeded.json';
async function readMarker() {
  if (useBlob) {
    const r = await get(MARKER, { access: 'private', useCache: false }).catch(() => null);
    if (!r || r.statusCode !== 200) return 0;
    try { return JSON.parse(await readStream(r.stream)).data?.version ?? 1; } catch { return 1; }
  }
  try { return JSON.parse(await fs.readFile(path.join(LOCAL, '_meta', 'seeded.json'), 'utf8')).data?.version ?? 1; } catch { return 0; }
}
async function writeMarker(version, docs) {
  const body = JSON.stringify({ data: { at: new Date().toISOString(), version, docs }, version: 1 });
  if (useBlob) await put(MARKER, body, { access: 'private', allowOverwrite: true, contentType: 'application/json', addRandomSuffix: false });
  else { await fs.mkdir(path.join(LOCAL, '_meta'), { recursive: true }); await fs.writeFile(path.join(LOCAL, '_meta', 'seeded.json'), body); }
}
export function ensureSeeded() {
  if (!seeding) seeding = (async () => {
    let manifest = { version: 1, delete: [] };
    try { manifest = JSON.parse(await fs.readFile(path.join(SEED_DIR, 'manifest.json'), 'utf8')); } catch {}
    const have = await readMarker();
    if (have >= manifest.version) return;
    for (const [c, id] of manifest.delete || []) { if (COLLECTIONS.includes(c) && validId(id)) await deleteDoc(c, id); }
    const jobs = [];
    for (const c of COLLECTIONS.filter((x) => x !== 'metrics')) {
      let names = []; try { names = await fs.readdir(path.join(SEED_DIR, c)); } catch { continue; }
      for (const f of names.filter((x) => x.endsWith('.json'))) jobs.push([c, f.slice(0, -5), path.join(SEED_DIR, c, f)]);
    }
    let n = 0;
    for (let i = 0; i < jobs.length; i += 12) {
      await Promise.all(jobs.slice(i, i + 12).map(async ([c, id, file]) => {
        const cur = await getDoc(c, id);
        if (cur && cur.version > 1) return; // edited by an admin since it was seeded: leave it alone
        const raw = JSON.parse(await fs.readFile(file, 'utf8')); const data = raw.data && raw.version != null ? raw.data : raw;
        await writeDoc(c, id, data, { forceVersion: 1 }); n++;
      }));
    }
    await writeMarker(manifest.version, n);
  })().catch((e) => { seeding = null; throw e; });
  return seeding;
}
