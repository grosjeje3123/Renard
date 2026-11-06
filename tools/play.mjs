// Simule un enfant : trace les traits modèles (avec un peu de tremblement) à travers la vraie interface.
import { createRequire } from 'module';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
const OUT = process.argv[2], SKILL = process.argv[3] || 'i', MODE = process.argv[4] || 'good'; // good | scribble | reverse
// Variables facultatives : SEEDFILE (état de départ JSON), PAGE (dist | www), TAG (suffixe des captures)
import fs from 'fs';
const SEEDFILE = process.env.SEEDFILE, PAGE = process.env.PAGE || 'dist', TAG = process.env.TAG || MODE;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
if (SEEDFILE) await ctx.addInitScript((j) => { if (!localStorage.getItem('renard-v1')) localStorage.setItem('renard-v1', j); }, fs.readFileSync(SEEDFILE, 'utf8'));
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
await page.goto('file://' + process.cwd() + `/${PAGE}/index.html#exercice-` + SKILL);
const t0 = Date.now();
const log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(1).padStart(5) + 's', ...a);
let rnd = 12345; const R = () => (rnd = (rnd * 1664525 + 1013904223) % 4294967296) / 4294967296 - 0.5;

async function strokes() {
  return page.evaluate((mode) => {
    const svg = document.querySelector('.board'); const m = svg.getScreenCTM();
    const toS = (x, y) => ({ x: x * m.a + y * m.c + m.e, y: x * m.b + y * m.d + m.f }); // matrice complète : le cahier peut être incliné
    return [...svg.querySelectorAll('.model .m-shape')].map((n) => {
      if (n.tagName === 'circle') { const p = toS(+n.getAttribute('cx'), +n.getAttribute('cy')); return { dot: true, pts: [p] }; }
      const L = n.getTotalLength(), N = Math.max(12, Math.round(L / 0.08)), pts = [];
      for (let i = 0; i <= N; i++) { const p = n.getPointAtLength((L * i) / N); pts.push({ x: p.x, y: p.y }); }
      const scr = pts.map((p) => toS(p.x, p.y));
      return { dot: false, pts: mode === 'reverse' ? scr.reverse() : scr, unit: Math.hypot(m.a, m.b) };
    });
  }, MODE);
}
async function draw(s) {
  const u = s.unit || 80;
  if (s.dot) { const p = s.pts[0]; await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up(); return; }
  let pts = s.pts;
  if (MODE === 'scribble') pts = pts.map((p, i) => ({ x: p.x + Math.sin(i * 1.7) * u * 0.9, y: p.y + Math.cos(i * 2.3) * u * 0.9 }));
  else pts = pts.map((p) => ({ x: p.x + R() * u * 0.12, y: p.y + R() * u * 0.12 }));
  await page.mouse.move(pts[0].x, pts[0].y); await page.mouse.down();
  for (const p of pts) { await page.mouse.move(p.x, p.y); await page.waitForTimeout(4); }
  await page.mouse.up();
}
const state = () => page.evaluate(() => ({
  phase: document.querySelector('.board')?.dataset.phase, locked: document.querySelector('.board')?.classList.contains('locked'),
  text: document.querySelector('.b-text')?.textContent, result: !!document.querySelector('.result'),
}));

await page.waitForSelector('.board', { timeout: 15000 });
log('plateau affiché', JSON.stringify(await state()));
await page.screenshot({ path: `${OUT}/play-0-intro.png` });
await page.waitForFunction(() => document.querySelector('.board') && !document.querySelector('.board').classList.contains('locked'), null, { timeout: 60000 });
log('plateau prêt (démo terminée)');

const ready = () => page.waitForFunction(() => document.querySelector('.result') || (document.querySelector('.board') && !document.querySelector('.board').classList.contains('locked')), null, { timeout: 40000 });
let shots = 0;
for (let n = 1; n <= 40; n++) {
  let st = await state();
  if (st.result) break;
  const cur = await page.evaluate(() => { const g = document.querySelector('.board .gs.current'); return g ? +g.dataset.i : 0; });
  const ph = st.phase;
  const ss = await strokes();
  await draw(ss[Math.min(cur, ss.length - 1)]);
  await page.waitForTimeout(MODE === 'good' ? 500 : 1500);
  if (shots < 2 && n >= 1) { await page.screenshot({ path: `${OUT}/play-1-feedback-${TAG}-${shots}.png` }); shots++; }
  const fb = await state();
  try { await ready(); } catch { log('timeout attente plateau'); }
  const ink = await page.evaluate(() => [...document.querySelectorAll('.ink-path')].map((e) => e.getAttribute('class').replace('ink-path', '').trim() || '-').join(','));
  st = await state();
  log(`n°${n} trait ${cur + 1}/${ss.length} phase ${ph}→${st.phase} | retour: "${fb.text}" | ensuite: "${st.text}" | encre: ${ink}${st.result ? ' | RÉSULTAT' : ''}`);
}
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/play-2a-stick-${TAG}.png` });
await page.waitForTimeout(2600);
await page.screenshot({ path: `${OUT}/play-2-end-${TAG}.png` });
const res = await page.evaluate(() => document.querySelector('.result-card')?.innerText);
log('résultat :', res && res.replace(/\n+/g, ' / '));
const saved = await page.evaluate(() => localStorage.getItem('renard-v1'));
log('vignettes :', saved && Object.keys(JSON.parse(saved).stickers || {}).join(', ') || '(aucune)');
console.log(errors.length ? 'ERREURS:\n' + errors.join('\n') : 'aucune erreur console');
await browser.close();
