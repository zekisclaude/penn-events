// Seed the document store from an export directory: node seed.mjs ../data/live-export [--no-demo]
import fs from 'node:fs'; import path from 'node:path';
import { writeDoc, COLLECTIONS } from './lib/store.js';
const dir = process.argv[2]; const noDemo = process.argv.includes('--no-demo');
let n = 0;
for (const c of COLLECTIONS.filter((x) => x !== 'metrics')) {
  const d = path.join(dir, c); if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.json'))) {
    const raw = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
    const id = f.slice(0, -5); const data = raw.data && raw.version != null ? raw.data : raw;
    if (noDemo && (id.startsWith('demo-') || data.isDemo)) continue;
    await writeDoc(c, id, data); n++;
  }
}
console.log('seeded', n, 'documents');
