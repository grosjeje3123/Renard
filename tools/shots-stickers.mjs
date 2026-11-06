// Captures de l'album de vignettes : états vide / partiel / complet, paysage, portrait, téléphone, thème sombre, fiche détaillée.
import { createRequire } from 'module';
import { newState, recordSession, awardStickers } from '../src/core/progress.js';
import { STICKERS } from '../src/content/stickers.js';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
const OUT = process.argv[2];

const crit = { start: 1, direction: 1, shape: 0.9, size: 0.9, lines: 0.9, flow: 0.9 };
const sess = (n, stars, mastered) => ({ log: Array.from({ length: n }, (_, i) => ({ phase: Math.min(2, i >> 1), score: stars / 3, stars, criteria: crit, tags: [] })), phase: 2, mastered });
const partial = newState(); partial.name = 'Léa';
const day = 86400000, now = Date.now();
recordSession(partial, 'lignes', sess(6, 3, true), now - 4 * day);
recordSession(partial, 'ronds', sess(6, 2, true), now - 3 * day);
recordSession(partial, 'ponts', sess(4, 3, false), now - 2 * day);
recordSession(partial, 'i', sess(3, 3, false), now - 1 * day);
awardStickers(partial, now - day);
const full = newState(); full.name = 'Léa';
STICKERS.forEach((s, i) => { full.stickers[s.id] = now - (20 - i) * day; });
const states = { vide: JSON.stringify(newState()), partiel: JSON.stringify(partial), plein: JSON.stringify(full) };
console.log('partiel :', Object.keys(partial.stickers).join(', '));

const browser = await chromium.launch();
const errors = [];
async function run(tag, vp, scheme, state, steps) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true, colorScheme: scheme });
  await ctx.addInitScript((s) => { if (!localStorage.getItem('renard-v1')) localStorage.setItem('renard-v1', s); }, states[state]);
  const page = await ctx.newPage();
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`[${tag}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${tag}] PAGEERROR ${e.message}`));
  await page.goto('file://' + process.cwd() + '/dist/index.html#accueil');
  await page.waitForTimeout(500);
  for (const [name, fn] of steps) { await fn(page); await page.waitForTimeout(900); await page.screenshot({ path: `${OUT}/${tag}-${name}.png` }); }
  await ctx.close();
}
const go = (h) => (p) => p.evaluate((x) => { location.hash = x; }, h);
await run('land-partiel', { width: 1180, height: 820 }, 'light', 'partiel', [['accueil', go('accueil')], ['album', go('album')], ['detail', (p) => p.click('.stk.got')], ['locked', async (p) => { await p.keyboard.press('Escape'); await p.click('.stk.lockedi'); }]]);
await run('land-vide', { width: 1180, height: 820 }, 'light', 'vide', [['album', go('album')]]);
await run('dark-plein', { width: 1180, height: 820 }, 'dark', 'plein', [['album', go('album')], ['bas', (p) => p.evaluate(() => { document.querySelector('.album-pages').scrollTop = 9999; })]]);
await run('port-partiel', { width: 820, height: 1180 }, 'light', 'partiel', [['album', go('album')]]);
await run('phone-partiel', { width: 380, height: 780 }, 'light', 'partiel', [['accueil', go('accueil')], ['album', go('album')]]);
await run('land-parents', { width: 1180, height: 820 }, 'light', 'partiel', [['parents', async (p) => {
  await p.evaluate(() => { location.hash = 'parents'; }); await p.waitForTimeout(1200);
  const b = await p.$('.gate-btn'); const bb = await b.boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.waitForTimeout(2500); await p.mouse.up(); await p.waitForTimeout(800);
  await p.evaluate(() => { document.querySelector('.parents').scrollTop = 1700; });
}]]);
await browser.close();
console.log(errors.length ? errors.join('\n') : 'aucune erreur console');
