import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
const B = 'http://127.0.0.1:8787/';
const segs = JSON.parse(readFileSync('script.json', 'utf8'));
rmSync('frames', { recursive: true, force: true }); mkdirSync('frames');
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2, isMobile: true, hasTouch: false, bypassCSP: true, acceptDownloads: true });
const p = await ctx.newPage(); p.on('dialog', d => d.accept());
await p.goto(B); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(800);
await p.addStyleTag({ content: `#vcur{position:fixed;left:270px;top:600px;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:rgba(163,234,42,.35);border:3px solid #a3ea2a;box-shadow:0 0 18px rgba(163,234,42,.8);z-index:99999;pointer-events:none;transition:left .7s cubic-bezier(.4,0,.2,1),top .7s cubic-bezier(.4,0,.2,1),transform .15s}
#vcur.down{transform:scale(.7);background:rgba(163,234,42,.75)} html{scroll-behavior:smooth} body{transition:transform .9s cubic-bezier(.4,0,.2,1)}` });
await p.evaluate(() => { const c = document.createElement('div'); c.id = 'vcur'; document.documentElement.appendChild(c); });
const cdp = await ctx.newCDPSession(p); const frames = []; let t0 = null;
cdp.on('Page.screencastFrame', async f => { const ts = f.metadata.timestamp; if (t0 === null) t0 = ts; const i = frames.length; frames.push(ts - t0); writeFileSync(`frames/${String(i).padStart(6, '0')}.jpg`, Buffer.from(f.data, 'base64')); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
// keep frames flowing for a steady timeline
await p.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:.01;z-index:99998'; document.documentElement.appendChild(d); let k = 0; setInterval(() => { d.style.background = (k++ % 2) ? '#000' : '#111'; }, 33); });
const wait = ms => p.waitForTimeout(ms);
const start = Date.now(); const now = () => (Date.now() - start) / 1000;
const center = async sel => { const el = p.locator(sel).first(); const r = await el.boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
const move = async sel => { const { x, y } = await center(sel); await p.evaluate(([x, y]) => { const c = document.getElementById('vcur'); c.style.left = x + 'px'; c.style.top = y + 'px'; }, [x, y]); await wait(750); };
const press = async () => { await p.evaluate(() => document.getElementById('vcur').classList.add('down')); await wait(150); await p.evaluate(() => document.getElementById('vcur').classList.remove('down')); };
const click = async sel => { await show(sel); await move(sel); await press(); await p.locator(sel).first().click(); await wait(400); };
const show = async (sel, block = 'center') => { await p.locator(sel).first().evaluate((e, block) => { const r = e.getBoundingClientRect(); if (r.top < 70 || r.bottom > innerHeight - 260) e.scrollIntoView({ behavior: 'smooth', block }); }, block); await wait(900); };
const scrollTo = async (sel, block = 'start') => { await p.locator(sel).first().evaluate((e, block) => e.scrollIntoView({ behavior: 'smooth', block }), block); await wait(1100); };
const zoom = async (sel, s = 1.35) => { await p.locator(sel).first().evaluate((e, s) => { const r = e.getBoundingClientRect(); document.body.style.transformOrigin = `${Math.min(Math.max(r.left + r.width / 2, innerWidth * 0.5 - 40), innerWidth * 0.5 + 40)}px ${r.top + scrollY + r.height / 2}px`; document.body.style.transform = `scale(${s})`; }, s); await wait(1000); };
const unzoom = async () => { await p.evaluate(() => { document.body.style.transform = 'none'; }); await wait(950); };
const h2 = t => `h2:has-text("${t}")`; const card = t => `.card:has(${h2(t)})`;
const times = [];
const acts = {
  s01: async () => { await wait(600); await move('#concept-tag'); await zoom('#concept-tag', 1.2); await wait(2500); await unzoom(); },
  s02: async () => { await scrollTo(card('Pick one goal')); await wait(1500); await click('input[name=goal]'); },
  s03: async () => { await click('#create-plan'); await scrollTo(card('Seven-day proof plan')); await zoom(card('Seven-day proof plan'), 1.2); await wait(1500); await unzoom(); },
  s04: async () => { await scrollTo(card('Invite a first cohort')); await click('[data-learner="L1"]'); await click('[data-learner="L2"]'); await click('#invite'); },
  s05: async () => { for (const l of ['L1', 'L2']) for (let i = 0; i < 3; i++) await click(`[data-advance="${l}"]`); await scrollTo('.card:has(h3:has-text("First-value check"))', 'center'); await zoom('.criteria', 1.2); await wait(1500); await unzoom(); },
  s06: async () => { await scrollTo('#tab-growth', 'center'); await click('#tab-growth'); await p.selectOption('#source', 'pilot'); await wait(400); await scrollTo(card('Schema check and quarantine')); await zoom('.kpis', 1.2); await wait(2500); await unzoom(); },
  s07: async () => { await scrollTo(card('Experiment contract')); await wait(2500); await click('#register'); },
  s08: async () => { await scrollTo(card('Where accounts drop off')); await zoom(card('Where accounts drop off'), 1.15); await wait(2000); await unzoom(); },
  s09: async () => { await scrollTo(card('Seven-day account activation')); await wait(2500); await scrollTo('.decision', 'center'); await zoom('.decision', 1.15); await wait(2000); await unzoom(); },
  s10: async () => { await scrollTo(card('Choose a synthetic scenario')); await move('#source'); await press(); await p.selectOption('#source', 'broken'); await wait(500); await scrollTo(card('Schema check and quarantine')); await zoom('.kpis', 1.2); await wait(2000); await unzoom(); },
  s11: async () => { await scrollTo(card('Experiment contract')); await click('#register'); await scrollTo(card('Seven-day account activation')); await wait(1500); await scrollTo(card('Can this data support a decision?')); await wait(1500); await scrollTo('.decision', 'center'); await zoom('.decision', 1.15); await wait(1500); await unzoom(); },
  s12: async () => { const dl = p.waitForEvent('download'); await click('#dl-decision'); await dl; await wait(1200); await scrollTo('footer', 'end'); await wait(3000); },
};
for (const s of segs) { const st = now(); times.push({ id: s.id, start: st }); await acts[s.id](); const left = s.dur + 0.45 - (now() - st); if (left > 0) await wait(left * 1000); }
await wait(800); const end = now();
await cdp.send('Page.stopScreencast'); await wait(300);
writeFileSync('timeline.json', JSON.stringify({ times, end, frames }, null, 1));
console.log('frames', frames.length, 'end', end.toFixed(2)); await b.close();
