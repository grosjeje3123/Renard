// Ouvre dist/index.html dans Chromium, relève les erreurs console et prend une capture par écran.
import { createRequire } from 'module';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
const OUT = process.argv[2];
const file = 'file://' + process.cwd() + '/dist/index.html';
const browser = await chromium.launch();
const sizes = { land: { width: 1180, height: 820 }, port: { width: 820, height: 1180 } };
const errors = [];
for (const [name, vp] of Object.entries(sizes)) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(`[${name}] ${m.type()}: ${m.text()}`); });
  page.on('pageerror', e => errors.push(`[${name}] PAGEERROR: ${e.message}\n${(e.stack || '').split('\n').slice(0, 4).join('\n')}`));
  await page.goto(file);
  await page.waitForTimeout(600);
  for (const r of ['accueil', 'niveaux', 'carte-1', 'carte-2', 'exercice-i', 'tresors', 'parents']) {
    await page.evaluate(h => { location.hash = h; }, r);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${name}-${r}.png` });
  }
  await ctx.close();
}
await browser.close();
console.log(errors.length ? errors.join('\n') : 'aucune erreur console');
