// Cahiers PDF prêts à imprimer (A4, lignes Seyès) : un par niveau, une fiche par exercice dans l'ordre des séries, précédée d'une page
// « mode d'emploi » (la démarche en trois étapes et le sommaire). Même code que l'écran « Papier » de l'application (src/ui/sheets.js) :
// l'application sait aussi préparer le cahier d'une seule série, directement sur la tablette.
// Usage : node tools/cahiers-pdf.mjs [dossier de sortie, défaut papier/] [reglure en mm : 3 | 2.5 | 2]
import { build } from 'esbuild';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
const OUT = path.resolve(process.argv[2] || 'papier'), REG = +(process.argv[3] || 3);
fs.mkdirSync(OUT, { recursive: true });

const entry = `
import { cahierPages, animauxPages, cahierPDF } from './src/ui/sheets.js';
const b64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
window.Cahiers = {
  async niveau(id, reglure) {
    const c = cahierPages(id, { reglure });
    return { n: c.n, pdf: b64(await cahierPDF(c.pages, 'Renard · ' + c.titre)) };
  },
  async animaux(reglure) {
    const c = animauxPages({ reglure });
    return { n: c.n, pdf: b64(await cahierPDF(c.pages, 'Renard · Les animaux')) };
  },
};
`;
const bundle = await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: 'js' }, bundle: true, write: false, format: 'iife', platform: 'browser', logLevel: 'error' });
const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.setContent('<!doctype html><title>cahiers</title>');
await page.addScriptTag({ content: bundle.outputFiles[0].text });
const slug = ['petits-explorateurs', 'apprentis-ecrivains', 'ecrivains-en-herbe'];
for (let i = 0; i < 3; i++) {
  const r = await page.evaluate(([id, reg]) => window.Cahiers.niveau(id, reg), [i + 1, REG]);
  const file = path.join(OUT, `renard-cahier-niveau-${i + 1}-${slug[i]}.pdf`);
  fs.writeFileSync(file, Buffer.from(r.pdf, 'base64'));
  console.log(path.basename(file), r.n + ' fiches', (fs.statSync(file).size / 1024).toFixed(0) + ' Ko');
}
const a = await page.evaluate((reg) => window.Cahiers.animaux(reg), REG);
const fa = path.join(OUT, 'renard-cahier-animaux.pdf');
fs.writeFileSync(fa, Buffer.from(a.pdf, 'base64'));
console.log(path.basename(fa), a.n + ' fiches', (fs.statSync(fa).size / 1024).toFixed(0) + ' Ko');
if (errs.length) console.log('ERREURS:', errs.join(' | '));
await browser.close();
