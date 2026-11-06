// Génère l'icône (adaptative + ancienne + ronde) et les écrans de démarrage Android à partir du renard SVG.
// Usage : node tools/make-icons.mjs   (écrit dans android/app/src/main/res)
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { foxSVG, FOX_CSS } from '../src/ui/fox.js';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
const RES = 'android/app/src/main/res';
const BG = '#B7E3DA', CREAM = '#FFF3DC';
const css = FOX_CSS + '*{animation:none!important;transition:none!important}html,body{margin:0}';
const head = (box) => foxSVG({}).replace('viewBox="0 0 400 460"', `viewBox="${box}"`).replace('<svg ', '<svg width="100%" height="100%" ');
const pngSize = (f) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
async function shot(file, w, h, html, transparent = false) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<style>${css}</style><body style="width:${w}px;height:${h}px;overflow:hidden;${transparent ? '' : ''}">${html}</body>`);
  await page.screenshot({ path: file, omitBackground: transparent });
}
const HEAD = '64 8 272 252'; // tête et oreilles, crayon compris, sans le sac à dos
// Icône adaptative : zone sûre = 61 % central du canevas de 108 dp.
const fg = (s) => `<div style="position:absolute;left:${s * 0.17}px;top:${s * 0.17}px;width:${s * 0.66}px;height:${s * 0.66}px">${head(HEAD)}</div>`;
const legacy = (s, round) => `<div style="position:absolute;inset:0;background:${BG};${round ? 'border-radius:50%;' : ''}overflow:hidden"><div style="position:absolute;left:${s * 0.08}px;top:${s * 0.1}px;width:${s * 0.84}px;height:${s * 0.84}px">${head(HEAD)}</div></div>`;
const dens = { mdpi: [48, 108], hdpi: [72, 162], xhdpi: [96, 216], xxhdpi: [144, 324], xxxhdpi: [192, 432] };
for (const [d, [ic, fgs]] of Object.entries(dens)) {
  const dir = `${RES}/mipmap-${d}`;
  await shot(`${dir}/ic_launcher_foreground.png`, fgs, fgs, fg(fgs), true);
  await shot(`${dir}/ic_launcher.png`, ic, ic, legacy(ic, false), true);
  await shot(`${dir}/ic_launcher_round.png`, ic, ic, legacy(ic, true), true);
}
fs.writeFileSync(`${RES}/values/ic_launcher_background.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`);
// Écrans de démarrage : fond crème, renard entier et nom.
const splashes = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name === 'splash.png') splashes.push(p); } })(RES);
for (const f of splashes) {
  const [w, h] = pngSize(f);
  const fh = Math.min(h * 0.46, w * 0.7 * 1.15);
  await shot(f, w, h, `<div style="position:absolute;inset:0;background:${BG};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${h * 0.02}px"><div style="width:${fh / 1.15}px;height:${fh}px">${head('0 0 400 460')}</div><div style="font:600 ${Math.min(w, h) * 0.11}px Fredoka,'Arial Rounded MT Bold',system-ui,sans-serif;color:#F08A24;text-shadow:0 4px 0 #fff">Renard</div></div>`);
}
console.log('icônes :', Object.keys(dens).length * 3, '· écrans de démarrage :', splashes.length);
await browser.close();
