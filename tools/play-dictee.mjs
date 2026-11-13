// Simule un enfant qui fait une dictée à travers la vraie interface : écoute, écrit les traits modèles, voit le modèle, passe au suivant.
// Usage : SEEDFILE=seed.json PAGE=dist node tools/play-dictee.mjs <dossier de captures> [good|scribble]
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
const OUT = process.argv[2] || '/tmp', MODE = process.argv[3] || 'good';
const SEEDFILE = process.env.SEEDFILE, PAGE = process.env.PAGE || 'dist';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
if (SEEDFILE) await ctx.addInitScript((j) => { if (!localStorage.getItem('renard-v1')) localStorage.setItem('renard-v1', j); }, fs.readFileSync(SEEDFILE, 'utf8'));
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
await page.goto('file://' + process.cwd() + `/${PAGE}/index.html#dictee`);
const t0 = Date.now();
const log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(1).padStart(5) + 's', ...a);
let rnd = 777; const R = () => (rnd = (rnd * 1664525 + 1013904223) % 4294967296) / 4294967296 - 0.5;

const strokes = () => page.evaluate(() => {
  const svg = document.querySelector('.board'); const m = svg.getScreenCTM();
  const toS = (x, y) => ({ x: x * m.a + y * m.c + m.e, y: x * m.b + y * m.d + m.f });
  return [...svg.querySelectorAll('.model .m-shape')].map((n) => {
    if (n.tagName === 'circle') return { dot: true, pts: [toS(+n.getAttribute('cx'), +n.getAttribute('cy'))] };
    const L = n.getTotalLength(), N = Math.max(12, Math.round(L / 0.08)), pts = [];
    for (let i = 0; i <= N; i++) { const p = n.getPointAtLength((L * i) / N); pts.push(toS(p.x, p.y)); }
    return { dot: false, pts, unit: Math.hypot(m.a, m.b) };
  });
});
async function draw(s) {
  const u = s.unit || 80;
  if (s.dot) { const p = s.pts[0]; await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up(); return; }
  const pts = MODE === 'scribble' ? s.pts.map((p, i) => ({ x: p.x + Math.sin(i * 1.7) * u * 0.9, y: p.y + Math.cos(i * 2.3) * u * 0.9 })) : s.pts.map((p) => ({ x: p.x + R() * u * 0.12, y: p.y + R() * u * 0.12 }));
  await page.mouse.move(pts[0].x, pts[0].y); await page.mouse.down();
  for (const p of pts) { await page.mouse.move(p.x, p.y); await page.waitForTimeout(4); }
  await page.mouse.up();
}
const ready = () => page.waitForFunction(() => document.querySelector('.dictee-end') || (document.querySelector('.board') && !document.querySelector('.board').classList.contains('locked')), null, { timeout: 60000 });

await page.waitForSelector('.board', { timeout: 15000 });
log('hash', await page.evaluate(() => location.hash), '| points', await page.$$eval('.dc-dot', (a) => a.length));
await ready();
let shots = 0;
for (let n = 1; n <= 60; n++) {
  if (await page.$('.dictee-end')) break;
  const bubbleAvant = await page.$eval('.b-text', (e) => e.textContent);
  const hasStart = await page.evaluate(() => { const e = document.querySelector('.board .gs .start'); return e ? getComputedStyle(e).display !== 'none' : false; });
  const cur = await page.evaluate(() => { const g = document.querySelector('.board .gs.current'); return g ? +g.dataset.i : 0; });
  const ss = await strokes();
  if (shots === 0) { await page.screenshot({ path: `${OUT}/dictee-0-ecoute.png` }); }
  await draw(ss[Math.min(cur, ss.length - 1)]);
  await page.waitForTimeout(700);
  if (shots < 2) { await page.screenshot({ path: `${OUT}/dictee-1-modele-${shots}.png` }); shots++; }
  const fb = await page.$eval('.b-text', (e) => e.textContent);
  try { await ready(); } catch { log('timeout'); break; }
  const dots = await page.$$eval('.dc-dot', (a) => a.map((d) => d.className.replace('dc-dot', '').trim() || '-').join(','));
  log(`trait ${cur + 1}/${ss.length} | consigne affichée: "${bubbleAvant}" | départ visible: ${hasStart} | retour: "${fb}" | points: ${dots}`);
}
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/dictee-2-fin.png` });
log('fin :', (await page.$eval('.dictee-end .result-card', (e) => e.innerText).catch(() => '(pas de fin)')).replace(/\n+/g, ' / '));
const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('renard-v1')));
log('dictées enregistrées :', JSON.stringify(saved.dictees));
console.log(errors.length ? 'ERREURS:\n' + errors.join('\n') : 'aucune erreur console');
await browser.close();
