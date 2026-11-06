// Captures des écrans ajoutés : pause, fiche animal, cahier, dessin, espace parents (outils), mode gaucher.
// Usage : node tools/shots3.mjs <dossier> <seed.json> <seed-gaucher.json> <seed-pause.json>
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
const [OUT, SEED, SEEDG, SEEDP] = process.argv.slice(2);
const browser = await chromium.launch();
const errors = [];
async function run(tag, vp, seedFile, routes, scheme = 'light') {
  const seed = fs.readFileSync(seedFile, 'utf8');
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true, colorScheme: scheme });
  await ctx.addInitScript((s) => { if (!localStorage.getItem('renard-v1')) localStorage.setItem('renard-v1', s); }, seed);
  const page = await ctx.newPage();
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`[${tag}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${tag}] PAGEERROR ${e.message}`));
  await page.goto('file://' + process.cwd() + '/www/index.html#accueil');
  await page.waitForTimeout(500);
  for (const r of routes) {
    await page.evaluate((h) => { location.hash = h; }, r);
    await page.waitForTimeout(1400);
    if (r === 'parents') {
      const b = await page.$('.gate-btn');
      if (b) { const bb = await b.boundingBox(); await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.waitForTimeout(2400); await page.mouse.up(); await page.waitForTimeout(900); }
      const h = await page.evaluate(() => document.querySelector('.parents').scrollHeight);
      const vh = vp.height;
      for (let i = 0, y = 0; y < h && i < 9; i++, y += vh - 120) {
        await page.evaluate((yy) => { document.querySelector('.parents').scrollTop = yy; }, y);
        await page.waitForTimeout(250);
        await page.screenshot({ path: `${OUT}/${tag}-parents${i}.png` });
      }
    } else await page.screenshot({ path: `${OUT}/${tag}-${r.replace(/[^a-z0-9]/gi, '_')}.png` });
  }
  await ctx.close();
}
const SCREENS = ['accueil', 'carte-1', 'carte-2', 'carte-3', 'pause', 'fiche-herisson', 'cahier-i', 'dessin', 'exercice-o'];
await run('land', { width: 1180, height: 820 }, SEED, SCREENS);
await run('lefty', { width: 1180, height: 820 }, SEEDG, ['exercice-o', 'dessin']);
await run('rest', { width: 1180, height: 820 }, SEEDP, ['accueil', 'pause']);
await run('port', { width: 820, height: 1180 }, SEED, ['pause', 'fiche-herisson', 'cahier-i', 'dessin', 'carte-3']);
await run('phone', { width: 400, height: 780 }, SEED, ['pause', 'fiche-herisson', 'cahier-i', 'dessin']);
await run('land', { width: 1180, height: 820 }, SEED, ['parents']);
await run('port', { width: 820, height: 1180 }, SEED, ['parents']);
await browser.close();
console.log(errors.length ? errors.join('\n') : 'aucune erreur console');
