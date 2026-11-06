// Planche de contrôle des vignettes : tout l'album, gagné puis en silhouette. Usage : node tools/sticker-gallery.mjs <sortie.html>
import { stickerSVG, ANIMALS } from '../src/ui/animals.js';
import { STICKERS } from '../src/content/stickers.js';
import fs from 'fs';
const out = process.argv[2] || 'stickers.html';
const cell = (s, locked) => `<figure style="margin:0;width:170px;text-align:center;font:600 13px sans-serif">${stickerSVG(s.animal, { locked }).replace('class="stk-art', 'style="width:160px;height:160px;filter:drop-shadow(0 3px 2px #0003)" class="stk-art')}<figcaption>${s.name}</figcaption></figure>`;
const html = `<!doctype html><meta charset=utf-8><style>:root{--sil:#D7C7A8;--sil-bg:#F1E6D0} body{margin:0;background:#FFF3DC;display:flex;flex-wrap:wrap;gap:10px;padding:14px;width:1080px}</style>
${STICKERS.map((s) => cell(s, false)).join('')}${STICKERS.slice(0, 6).map((s) => cell(s, true)).join('')}`;
fs.writeFileSync(out, html);
console.log(Object.keys(ANIMALS).length, 'animaux ;', STICKERS.length, 'vignettes ; manquants :', STICKERS.filter((s) => !ANIMALS[s.animal]).map((s) => s.id).join(',') || 'aucun');
