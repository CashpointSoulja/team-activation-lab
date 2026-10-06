// Browser checks for upload of malformed CSV, amend-after-outcomes, export-all, reset and keyboard-only use.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const B = process.env.BASE_URL || 'http://127.0.0.1:8787/';
mkdirSync('artifacts/tmp', { recursive: true });
const bad = ['event_id,account_id,learner_id,event_type,occurred_at,variant,goal_id,plan_id,lab_id,assignment_seed',
  'u1,u-acct-1,,evaluation_started,2026-09-01T00:00:00Z,control,,,,tal-2026-10',
  'u2,,,evaluation_started,2026-09-01T00:00:00Z,control,,,,tal-2026-10',
  'u3,u-acct-2,,teleport,2026-09-01T00:00:00Z,treatment,,,,tal-2026-10',
  'u4,u-acct-3,,evaluation_started,09/01/2026,treatment,,,,tal-2026-10',
  'u1,u-acct-1,,evaluation_started,2026-09-01T00:00:00Z,control,,,,tal-2026-10'].join('\n');
writeFileSync('artifacts/tmp/malformed.csv', bad);
const b = await chromium.launch(); const r = [];
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, isMobile: true, hasTouch: true });
const p = await ctx.newPage(); p.on('dialog', d => d.accept()); const errs = []; p.on('pageerror', e => errs.push(e.message));
let netOut = 0; p.on('request', q => { if (!q.url().startsWith(B)) netOut++; });
await p.goto(B); await p.click('#tab-growth'); await p.waitForTimeout(300);
await p.setInputFiles('#upload', 'artifacts/tmp/malformed.csv'); await p.waitForTimeout(400);
const kpis = (await p.textContent('.kpis')).replace(/\s+/g, ' ');
r.push(`upload malformed: ${kpis.trim()}`);
r.push(`quarantine reasons: ${(await p.$$eval('details table tbody tr td:nth-child(2)', t => t.map(x => x.textContent))).join(' | ')}`);
await p.fill('#c-minimum_sample_per_variant', '0'); await p.click('#register'); await p.waitForTimeout(300);
r.push(`upload verdict: ${await p.textContent('.verdict')}`);
await p.selectOption('#source', 'pilot'); await p.waitForTimeout(300); await p.click('#register'); await p.waitForTimeout(300);
r.push(`pilot before amend: ${await p.textContent('.verdict')}`);
await p.click('#amend'); await p.fill('#c-minimum_effect_pp', '1'); await p.click('#register'); await p.waitForTimeout(300);
r.push(`pilot after amend: ${await p.textContent('.verdict')} | amended tag: ${await p.isVisible('text=Amended after outcomes were shown')}`);
const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#export-all')]);
const path = await dl.path(); const st = JSON.parse((await import('node:fs')).readFileSync(path, 'utf8'));
r.push(`export-all: ${dl.suggestedFilename()} keys=${Object.keys(st.state)} amended=${st.state.growth.amended}`);
await p.click('#reset-all'); await p.waitForTimeout(300);
r.push(`after reset: tab=${await p.getAttribute('#tab-manager', 'aria-selected')} storage=${await p.evaluate(() => localStorage.getItem('tal.state.v1') ? 'present(fresh)' : 'empty')} goalChecked=${await p.$$eval('input[name=goal]:checked', x => x.length)}`);
// Keyboard-only manager flow
await p.goto(B); await p.focus('input[name=goal]'); await p.keyboard.press('Space'); await p.waitForTimeout(150);
await p.focus('#create-plan'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
for (const l of ['L1', 'L2']) { await p.focus(`[data-learner="${l}"]`); await p.keyboard.press('Space'); await p.waitForTimeout(100); }
await p.focus('#invite'); await p.keyboard.press('Enter'); await p.waitForTimeout(150);
for (const l of ['L1', 'L2']) for (let i = 0; i < 3; i++) { await p.focus(`[data-advance="${l}"]`); await p.keyboard.press('Enter'); await p.waitForTimeout(100); }
r.push(`keyboard-only manager: ${(await p.textContent('.criteria')).match(/\(met\)/g)?.length || 0}/4 criteria met`);
r.push(`requests to other origins: ${netOut}`); r.push(`page errors: ${errs.length ? errs : 'none'}`);
r.push(`cookies: ${(await ctx.cookies()).length}`);
console.log(r.join('\n')); await b.close();
