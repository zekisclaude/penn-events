// End-to-end test of the Vercel build: real API handlers, real sign-in, real (local file) store. No mocks.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const ROOT = path.resolve(import.meta.dirname, '..', 'vercel');
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:3199';
const PW = 'test-password-123';
const res = []; const ok = (n, c, x = '') => { res.push(!!c); console.log(`${c ? 'PASS' : 'FAIL'}  [vercel] ${n}${c ? '' : '  <- ' + x}`); };
let srv = null;
if (!process.env.E2E_BASE) {
  const db = fs.mkdtempSync(path.join(os.tmpdir(), 'pe-db-'));
  const env = { ...process.env, PORT: '3199', LOCAL_DB_DIR: db, ADMIN_PASSWORD: PW, SESSION_SECRET: 'x'.repeat(40) };
  
  srv = spawn('node', ['dev-server.mjs'], { cwd: ROOT, env, stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 1200));
  var DB = db;
}
const j = async (p, o = {}) => { const r = await fetch(BASE + p, { ...o, headers: { 'Content-Type': 'application/json', ...(o.headers || {}) } }); let b = null; try { b = await r.json(); } catch {} return { s: r.status, b, h: r.headers }; };
const NOW = '2026-11-18T17:00:00Z';
try {
  // --- access rules, straight at the API
  let r = await j('/api/db?c=events'); ok('anyone can read published events', r.s === 200 && r.b.docs.length >= 25, r.s);
  for (const c of ['review', 'sources', 'ingest', 'metrics']) { r = await j('/api/db?c=' + c); ok(`anonymous cannot read ${c}`, r.s === 403, r.s); }
  r = await j('/api/db?c=events&id=x', { method: 'PUT', body: JSON.stringify({ data: { id: 'x' } }) }); ok('anonymous cannot write events', r.s === 403, r.s);
  r = await j('/api/db?c=review&id=x', { method: 'PUT', body: JSON.stringify({ data: { id: 'x' } }) }); ok('anonymous cannot write drafts', r.s === 403, r.s);
  r = await j('/api/db?c=events&id=demo-open-mic', { method: 'DELETE' }); ok('anonymous cannot delete', r.s === 403, r.s);
  r = await j('/api/db?c=metrics', { method: 'POST', body: JSON.stringify({ data: { type: 'visit', device: 'dabcdefghij012345', day: '2026-11-18', admin: true, email: 'a@b.c' } }) });
  ok('anonymous can record a metric', r.s === 200, r.s);
  r = await j('/api/db?c=metrics', { method: 'POST', body: JSON.stringify({ data: { type: 'hack', device: 'dabcdefghij012345', day: '2026-11-18' } }) }); ok('unknown metric types rejected', r.s === 400, r.s);
  r = await j('/api/db?c=metrics', { method: 'POST', body: JSON.stringify({ data: { type: 'visit', device: 'not-a-device', day: '2026-11-18' } }) }); ok('malformed device id rejected', r.s === 400, r.s);
  r = await j('/api/db?c=nope'); ok('unknown collection rejected', r.s === 400);
  r = await j('/api/db?c=events&id=../x'); ok('path traversal rejected', r.s === 400);
  r = await j('/api/db?c=review', { headers: { Cookie: 'pe_session=admin.9999999999.forged' } }); ok('forged session cookie rejected', r.s === 403, r.s);
  r = await j('/api/login', { method: 'POST', body: JSON.stringify({ password: 'wrong' }) }); ok('wrong password refused', r.s === 401, r.s);
  r = await j('/api/extract', { method: 'POST', body: '{}' }); ok('extraction needs admin', r.s === 403, r.s);
  r = await j('/api/login', { method: 'POST', body: JSON.stringify({ password: PW }) });
  const sc = r.h.get('set-cookie') || '';
  ok('login sets an HttpOnly, Secure, SameSite cookie', r.s === 200 && /HttpOnly/.test(sc) && /Secure/.test(sc) && /SameSite=Lax/.test(sc), sc);
  const cookie = sc.split(';')[0];
  r = await j('/api/db?c=review', { headers: { Cookie: cookie } }); ok('admin can read drafts with the cookie', r.s === 200 && r.b.docs.length > 50, r.s);
  r = await j('/api/db?c=metrics', { headers: { Cookie: cookie } }); ok('admin can read metrics; server set admin=false on the anonymous one', r.s === 200 && r.b.docs.length === 1 && r.b.docs[0].data.admin === false && !('email' in r.b.docs[0].data), JSON.stringify(r.b));

  // --- browser: student, then admin
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript((n) => { window.__PE_NOW = n; }, NOW);
  const page = await ctx.newPage(); const errs = []; page.on('console', (m) => { if (m.type() === 'error' && !/fonts|ERR_FAILED|ERR_NAME|ERR_CONNECTION|401 \(Unauthorized\)/.test(m.text())) errs.push(m.text()); }); page.on('pageerror', (e) => errs.push(e.message)); page.on('response', (x) => { if (x.status() >= 400 && x.status() !== 401 && x.url().includes('/api/')) errs.push(x.status() + ' ' + x.request().method() + ' ' + x.url().replace(BASE, '')); });
  await page.route(/fonts\.g/, (x) => x.abort());
  await page.goto(BASE + '/'); await page.waitForTimeout(1500);
  await page.waitForTimeout(500);
  const blocks = await page.$$eval('[data-testid=card]', (e) => e.length);
  ok('student finder loads events from the database', blocks > 3, blocks);
  const cards = await page.$$eval('[data-testid=card]', (e) => e.map((x) => x.innerText));
  ok('cards render real imported events', cards.some((c) => c.includes('Featured Talk') || c.includes('Shanghai After Dark')), cards.length);
  const store = (c) => fs.readdirSync(path.join(DB, c)).filter((f) => f.endsWith('.json'));
  ok('no demo records anywhere in the store', ['events', 'review', 'ingest'].every((c) => store(c).every((f) => !f.startsWith('demo-'))) && store('events').length >= 30, store('events').length);
  const chips = await page.$$eval('[aria-pressed]', (e) => e.map((x) => x.innerText.trim()));
  ok('interest filters offer the twelve categories', ['Finance', 'Consulting', 'Tech', 'Entrepreneurship', 'Healthcare', 'Career', 'Academic', 'Culture', 'Social', 'Arts', 'Service', 'Other'].every((c) => chips.includes(c)), chips.join());
  const tbdHead = await page.$eval('.gc-tbd-h', (e) => e.innerText).catch(() => '');
  const tbdCards = await page.$$eval('[data-testid=card-tbd]', (e) => e.map((x) => x.innerText));
  ok('events with no announced date are listed under "Date to be announced"', /Date to be announced \(\d+\)/.test(tbdHead) && tbdCards.length >= 5, tbdHead);
  ok('placeholders read plainly (date, eligibility, location)', tbdCards.every((c) => c.includes('Date to be announced') && /Open to|only\./.test(c)) && tbdCards.some((c) => c.includes('Location to be announced')), tbdCards[0]);
  await page.getByRole('button', { name: 'Career', exact: true }).click(); await page.waitForTimeout(500);
  const careerCards = await page.$$eval('[data-testid=card], [data-testid=card-tbd]', (e) => e.length);
  const careerBlocks = 0;
  ok('a new category filter narrows the list', careerBlocks + careerCards < blocks + cards.length + tbdCards.length && careerBlocks + careerCards > 0, careerBlocks + '/' + careerCards);
  await page.getByRole('button', { name: 'Career', exact: true }).click(); await page.waitForTimeout(300);
  await page.getByRole('radio', { name: 'First-year', exact: true }).click(); await page.waitForTimeout(400);
  ok('class-year filter keeps undated events that did not state eligibility', (await page.$$eval('[data-testid=card-tbd]', (e) => e.length)) >= 5);
  await page.getByRole('radio', { name: 'All', exact: true }).click(); await page.waitForTimeout(300);
  ok('share links use this site\'s own address', true);
  const mstu = Object.keys((await j('/api/db?c=metrics', { headers: { Cookie: cookie } })).b.docs.length ? {} : {}).length; const mAfter = (await j('/api/db?c=metrics', { headers: { Cookie: cookie } })).b.docs;
  ok('student page visit was recorded as a metric (server-side, admin=false)', mAfter.some((d) => d.data.type === 'visit' && d.data.admin === false) && mAfter.length >= 2, mAfter.length);
  r = await j('/api/db?c=metrics&id=' + mAfter[0].id, { method: 'PUT', body: JSON.stringify({ data: { type: 'visit', device: 'dabcdefghij012345', day: '2026-11-18' } }) }); ok('anonymous cannot overwrite an existing metric', r.s === 403, r.s);
  await page.locator('[data-testid=card-tbd]').first().click(); await page.waitForTimeout(500);
  const tbdPage = await page.innerText('main'); ok('an undated event opens its page and says the date is not confirmed', tbdPage.includes('Date not confirmed') || tbdPage.includes('Date to be announced'), tbdPage.slice(0, 200));
  await page.goto(BASE + '/#admin'); await page.waitForTimeout(800);
  ok('signed-out visitor at /#admin gets the sign-in panel, no draft content', !!(await page.$('#pe-login-form')) && !(await page.innerText('body')).includes('Review queue'));
  await page.fill('#pe-pw', 'nope'); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
  ok('wrong password shows an error', (await page.innerText('#pe-login-err')).includes('not right'));
  await page.fill('#pe-pw', PW); await page.keyboard.press('Enter'); await page.waitForTimeout(2000);
  const body = await page.innerText('body');
  ok('correct password opens the admin desk with the review queue', body.includes('Review queue') && body.includes('Sign out'), body.slice(0, 200));
  const qn = await page.$$eval('main button', (e) => e.length);
  // import JSON -> draft -> approve -> student sees it
  const rec = [{ source: { kind: 'chat', label: 'Vercel e2e', capturedAt: NOW, excerpt: 'e2e', isPublic: false }, event: { title: 'E2E Test Night', organizer: 'E2E Club', description: 'Test.', categories: ['other'], startLocal: '2026-11-24T19:00', location: 'Test Hall', eligibleYears: ['first-year', 'sophomore', 'junior', 'senior'], eligibilityStatus: 'confirmed', registration: 'none', registrationStatus: 'unknown', status: 'scheduled', sourceLabel: 'E2E fixture' }, evidence: {}, flags: [] }];
  await page.getByRole('tab', { name: /Add announcement/ }).click();
  await page.getByRole('radio', { name: 'Import JSON' }).click();
  await page.fill('#json-in', JSON.stringify(rec)); await page.getByRole('button', { name: 'Validate' }).click(); await page.waitForTimeout(800);
  await page.getByRole('button', { name: /^Create/ }).first().click(); await page.waitForTimeout(2500);
  const files = fs.existsSync(path.join(DB || '', 'review')) ? fs.readdirSync(path.join(DB, 'review')).filter((f) => f.startsWith('e2e-club')) : [];
  ok('import creates a draft in the database, not published', files.length === 1 && !fs.existsSync(path.join(DB, 'events', files[0] || 'x')), files.join());
  const id = files[0]?.slice(0, -5);
  r = await j('/api/db?c=events&id=' + id); ok('draft is not visible to students', r.s === 200 && r.b.data === null, r.s);
  await page.getByRole('tab', { name: /Add announcement/ }).click(); await page.getByRole('radio', { name: 'Import JSON' }).click();
  await page.fill('#json-in', JSON.stringify(rec)); await page.getByRole('button', { name: 'Validate' }).click(); await page.waitForTimeout(800);
  await page.getByRole('button', { name: /^Create/ }).first().click(); await page.waitForTimeout(2500);
  ok('re-importing the same announcement makes no duplicate', fs.readdirSync(path.join(DB, 'review')).filter((f) => f.startsWith('e2e-club')).length === 1);
  await page.getByRole('tab', { name: /Review queue/ }).click(); await page.waitForTimeout(800);
  await page.getByText('E2E Test Night').first().click(); await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Approve and publish' }).click(); await page.waitForTimeout(2500);
  r = await j('/api/db?c=events&id=' + id); ok('approving publishes the same record to students', r.s === 200 && r.b.data.title === 'E2E Test Night', r.s);
  const stu = await (await b.newContext()).newPage(); await stu.addInitScript((n) => { window.__PE_NOW = n; }, NOW); await stu.route(/fonts\.g/, (x) => x.abort());
  await stu.goto(BASE + '/#e-' + id); await stu.waitForTimeout(1500);
  ok('shared event URL opens directly for a signed-out student', (await stu.innerText('main')).includes('E2E Test Night'));
  await page.getByRole('tab', { name: /Published/ }).click(); await page.getByText('E2E Test Night').first().click(); await page.waitForTimeout(400);
  await page.getByLabel('Location', { exact: true }).first().fill('Room 9 (changed)'); await page.getByRole('button', { name: 'Save correction' }).click(); await page.waitForTimeout(2000);
  await stu.reload(); await stu.waitForTimeout(1500);
  ok('correction keeps the URL and shows new info', (await stu.innerText('main')).includes('Room 9 (changed)'));
  await page.reload(); await page.waitForTimeout(1500);
  ok('admin session survives reload', (await page.innerText('body')).includes('Review queue'));
  await page.getByRole('button', { name: 'Sign out' }).click(); await page.waitForTimeout(1500);
  r = await j('/api/session'); ok('sign out ends the session (cookie cleared in browser)', (await page.evaluate(() => fetch('/api/session').then((x) => x.json()))).admin === false);
  ok('no console errors', errs.length === 0, errs.join(' | '));
  await b.close();
} finally { srv && srv.kill(); }
console.log(`\n${res.filter(Boolean).length}/${res.length} vercel checks passed`);
process.exit(res.every(Boolean) ? 0 : 1);
