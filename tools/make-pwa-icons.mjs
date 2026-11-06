// Génère les icônes de la version installable (PWA) à partir du renard SVG : src/pwa/icons/.
// Usage : node tools/make-pwa-icons.mjs
import { createRequire } from 'module';
import { foxSVG, FOX_CSS } from '../src/ui/fox.js';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
const OUT = 'src/pwa/icons';
const BG = '#B7E3DA';
const css = FOX_CSS + '*{animation:none!important;transition:none!important}html,body{margin:0}svg{overflow:hidden!important}';
const HEAD = '30 6 340 286'; // tête et oreilles, crayon compris
const head = foxSVG({}).replace('viewBox="0 0 400 460"', `viewBox="${HEAD}"`).replace('<svg ', '<svg width="100%" height="100%" ');
// part = proportion du carré occupée par la tête ; le fond plein remplit tout le carré (les systèmes arrondissent eux-mêmes).
const RATIO = 286 / 340; // proportions de la tête : le cadre épouse le dessin, sans zone en trop autour
const tile = (s, part) => { const w = s * part, hh = w * RATIO; return `<div style="position:absolute;inset:0;background:${BG}"><div style="position:absolute;left:${(s - w) / 2}px;top:${(s - hh) / 2}px;width:${w}px;height:${hh}px">${head}</div></div>`; };
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [file, s, part] of [['icon-192.png', 192, 0.8], ['icon-512.png', 512, 0.8], ['icon-maskable-512.png', 512, 0.6], ['apple-touch-icon.png', 180, 0.78]]) {
  await page.setViewportSize({ width: s, height: s });
  await page.setContent(`<style>${css}</style><body style="width:${s}px;height:${s}px;overflow:hidden">${tile(s, part)}</body>`);
  // Seule la tête : on retire le corps, la queue et le sac pour que rien ne dépasse sous le menton.
  await page.evaluate(() => { for (const el of [...document.querySelectorAll('g.bob > *')]) if (!el.classList.contains('head')) el.remove(); });
  await page.screenshot({ path: `${OUT}/${file}` });
}
console.log('icônes PWA écrites dans', OUT);
await browser.close();
