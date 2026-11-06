// Captures avec état semé : espace parents, trésors, thème sombre, portrait.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
const OUT = process.argv[2];
const seed = fs.readFileSync('/tmp/seed.json', 'utf8');
const browser = await chromium.launch();
const errors = [];
async function run(tag, vp, scheme, routes) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true, colorScheme: scheme });
  await ctx.addInitScript((s) => { if (!localStorage.getItem('renard-v1')) localStorage.setItem('renard-v1', s); }, seed);
  const page = await ctx.newPage();
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errors.push(`[${tag}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${tag}] PAGEERROR ${e.message}`));
  await page.goto('file://' + process.cwd() + '/dist/index.html#accueil');
  await page.waitForTimeout(500);
  for (const r of routes) {
    await page.evaluate((h) => { location.hash = h; }, r);
    await page.waitForTimeout(1300);
    if (r === 'parents') {
      const b = await page.$('.gate-btn');
      if (b) { const bb = await b.boundingBox(); await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await page.waitForTimeout(2500); await page.mouse.up(); await page.waitForTimeout(900); }
      await page.screenshot({ path: `${OUT}/${tag}-parents.png`, fullPage: false });
      const h = await page.evaluate(() => document.querySelector('.parents').scrollHeight);
      await page.evaluate(() => { document.querySelector('.parents').scrollTop = 700; });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${tag}-parents2.png` });
      await page.evaluate(() => { document.querySelector('.parents').scrollTop = 1500; });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${tag}-parents3.png` });
    } else await page.screenshot({ path: `${OUT}/${tag}-${r}.png` });
  }
  await ctx.close();
}
await run('dk-land', { width: 1180, height: 820 }, 'dark', ['accueil', 'carte-1', 'exercice-o', 'tresors', 'parents']);
await run('s-land', { width: 1180, height: 820 }, 'light', ['accueil', 'carte-1', 'tresors', 'parents']);
await run('s-port', { width: 820, height: 1180 }, 'light', ['niveaux', 'carte-1', 'tresors', 'parents']);
await run('s-phone', { width: 400, height: 780 }, 'light', ['accueil', 'niveaux', 'exercice-o']);
await browser.close();
console.log(errors.length ? errors.join('\n') : 'aucune erreur console');
