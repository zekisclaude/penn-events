// Feeds real import batches through the admin Import JSON screen (test double backend).
import { launch, open, seed } from './harness.mjs';
import fs from 'fs';
const files = process.argv.slice(2);
const b = await launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 950 } });
const { page, errors } = await open(b, { role: 'admin', now: '2026-11-13T15:00:00Z', ctx, hash: 'admin' });
for (const f of files) {
  await page.getByRole('tab', { name: /Add announcement/ }).click();
  await page.getByRole('radio', { name: 'Import JSON' }).click();
  await page.fill('#json-in', fs.readFileSync(f, 'utf8'));
  await page.getByRole('button', { name: 'Validate' }).click(); await page.waitForTimeout(800);
  const pre = await page.innerText('main');
  const warn = (pre.match(/not a valid date|not an http\(s\) link[^.]*|Not valid JSON[^\n]*|at most 50/g) || []);
  await page.getByRole('button', { name: /^Create/ }).first().click(); await page.waitForTimeout(3000);
  const st = await page.evaluate(() => window.__mockStore());
  console.log(f.split('/').pop(), '-> review docs now', Object.keys(st.review).length, '| validation warnings:', warn.length, warn.slice(0, 5));
}
const st = await page.evaluate(() => window.__mockStore());
const ig = Object.values(st.review).filter((r) => r.sources?.[0]?.kind === 'instagram');
console.log('instagram drafts', ig.length, '| statuses', [...new Set(ig.map((r) => r.reviewStatus))], '| published', Object.values(st.events).filter((e) => !e.isDemo).length);
// re-import batch 1: must not duplicate
await page.getByRole('tab', { name: /Add announcement/ }).click();
await page.getByRole('radio', { name: 'Import JSON' }).click();
await page.fill('#json-in', fs.readFileSync(files[0], 'utf8'));
await page.getByRole('button', { name: 'Validate' }).click(); await page.waitForTimeout(800);
await page.getByRole('button', { name: /^Create/ }).first().click(); await page.waitForTimeout(3000);
const st2 = await page.evaluate(() => window.__mockStore());
console.log('after re-import of batch 1: instagram drafts', Object.values(st2.review).filter((r) => r.sources?.[0]?.kind === 'instagram').length);
if (process.env.DUMP) fs.writeFileSync(process.env.DUMP, JSON.stringify({ review: Object.fromEntries(Object.entries(st.review).filter(([, r]) => r.sources?.[0]?.kind === 'instagram')), ingest: Object.fromEntries(Object.entries(st.ingest).filter(([, r]) => r.kind === 'instagram')) }));
console.log('console errors', errors.filter((e) => !e.includes('ERR_FAILED')));
await b.close();
