// Cahiers de vacances PDF prêts à imprimer (A4) : un par niveau, une dizaine de pages. Couverture avec le renard, page de règles,
// six pages d'écriture en grand (trois éléments au plus par page, sans numéros de traits), trois petits jeux (labyrinthe,
// lettres cachées, points à relier). Même code que l'écran « Papier » de l'application (src/ui/sheets.js).
// Usage : node tools/cahiers-pdf.mjs [dossier de sortie, défaut papier/]
import { build } from 'esbuild';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire('/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');
const OUT = path.resolve(process.argv[2] || 'papier');
fs.mkdirSync(OUT, { recursive: true });

const entry = `
import { cahierPages, cahierPDF } from './src/ui/sheets.js';
const b64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };
window.Cahiers = {
  async niveau(id) {
    const c = cahierPages(id);
    return { n: c.n, pages: c.pages.length, pdf: b64(await cahierPDF(c.pages, 'Renard · Cahier de vacances · ' + c.titre)) };
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
for (const f of fs.readdirSync(OUT)) if (/^renard-cahier-.*\.pdf$/.test(f)) fs.unlinkSync(path.join(OUT, f));
for (let i = 0; i < 3; i++) {
  const r = await page.evaluate((id) => window.Cahiers.niveau(id), i + 1);
  const file = path.join(OUT, `renard-cahier-de-vacances-niveau-${i + 1}-${slug[i]}.pdf`);
  fs.writeFileSync(file, Buffer.from(r.pdf, 'base64'));
  console.log(path.basename(file), `${r.pages} pages, ${r.n} exercices d'écriture`, (fs.statSync(file).size / 1024).toFixed(0) + ' Ko');
}
if (errs.length) console.log('ERREURS:', errs.join(' | '));
await browser.close();
