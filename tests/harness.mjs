import { chromium } from 'playwright';
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(here, '..');
export const SITE = process.env.SITE || path.join(ROOT, 'site', 'index.html');
export const URLBASE = process.env.URLBASE || ('file://' + SITE);
export function seed() {
  const out = {};
  for (const c of ['events', 'review', 'sources', 'ingest', 'metrics']) {
    out[c] = {}; const dir = path.join(ROOT, 'tests', 'fixtures', c);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) out[c][f.replace(/\.json$/, '')] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  }
  out.metrics = {}; return out;
}
const mock = fs.readFileSync(path.join(here, 'mock-claude.js'), 'utf8');
export async function launch() { return chromium.launch(); }
export async function open(browser, { role = 'admin', hash = '', now = null, width = 390, height = 844, seedData = seed(), ctx = null, extraInit = null } = {}) {
  const context = ctx || await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = []; page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  await page.addInitScript(({ role, now, seedData }) => { window.__ROLE = role; if (now) window.__PE_NOW = now; window.__SEED = seedData; }, { role, now, seedData });
  if (extraInit) await page.addInitScript(extraInit);
  await page.addInitScript(mock);
  await page.route('**fonts.g**', (r) => r.abort());
  await page.goto(URLBASE + (hash ? '#' + hash : ''));
  await page.waitForTimeout(700);
  return { page, context, errors };
}
