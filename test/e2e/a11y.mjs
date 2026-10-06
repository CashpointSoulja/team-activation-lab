import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const axe = readFileSync(new URL('../../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8');
const b = await chromium.launch(); const out = [];
for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: vp, bypassCSP: true }); const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto((process.env.BASE_URL || 'http://127.0.0.1:8787/')); await p.waitForTimeout(400);
  const scan = async label => { await p.addScriptTag({ content: axe }); const r = await p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] })).violations.map(v => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(' | ')}`)); out.push(`${name} ${label}: ${r.length ? r.join('\n   ') : 'no violations'}`); };
  await p.click('label.goal >> nth=1'); await p.click('#create-plan'); await scan('manager');
  await p.click('#tab-growth'); await p.waitForTimeout(300); await p.click('#register'); await p.waitForTimeout(400); await scan('growth pilot');
  await p.selectOption('#source', 'broken'); await p.waitForTimeout(300); await p.click('#register'); await p.waitForTimeout(400); await scan('growth broken');
  // keyboard-only: Tab from top reaches skip link first
  await p.goto((process.env.BASE_URL || 'http://127.0.0.1:8787/')); await p.keyboard.press('Tab'); out.push(`${name} first Tab focus: ${await p.evaluate(() => document.activeElement.textContent.trim())}`);
  out.push(`${name} page errors: ${errs.length ? errs : 'none'}`);
  await ctx.close();
}
console.log(out.join('\n')); await b.close();
