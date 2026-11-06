// Planche de contrôle des lettres : chaque gabarit sur les lignes du cahier, avec point de départ et sens du tracé.
// Usage : node tools/letters-gallery.mjs <sortie.svg> [ids séparés par des virgules | "abc" (minuscules) | "ABC" (capitales)] [colonnes]
import fs from 'fs';
import { ECRITURE as SKILLS } from '../src/content/skills.js';
import { buildTemplate, strokeToSvgPath } from '../src/core/template.js';
import { BOARD } from '../src/core/board.js';

const out = process.argv[2] || '/tmp/lettres.svg';
const what = process.argv[3] || 'abc';
const cols = +(process.argv[4] || 6);
const lower = 'abcdefghijklmnopqrstuvwxyz'.split('');
let ids;
if (what === 'abc') ids = lower.filter((l) => SKILLS[l]);
else if (what === 'ABC') ids = lower.map((l) => l.toUpperCase());
else ids = what.split(',');

const U = 46, W = 4.4, H = 7;
const rows = Math.ceil(ids.length / cols);
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * U * cols}" height="${H * U * rows}"><rect width="100%" height="100%" fill="#fff"/>`;
ids.forEach((id, i) => {
  const sk = SKILLS[id];
  const t = buildTemplate({ ...sk, kind: 'word' });
  const bb = t.bbox;
  const ox = (i % cols) * W * U, oy = Math.floor(i / cols) * H * U;
  const dx = (W - (bb.x1 - bb.x0)) / 2 - bb.x0, base = 4.9;
  const dy = base - BOARD.baseline;
  svg += `<g transform="translate(${ox},${oy}) scale(${U})"><rect width="${W}" height="${H}" fill="#fffdf6" stroke="#ccc" stroke-width="0.03"/>`;
  for (let y = 0; y <= 4; y++) { const yy = base - y; svg += `<line x1="0" x2="${W}" y1="${yy}" y2="${yy}" stroke="#9aa7d6" stroke-width="${y === 0 ? 0.06 : y === 2 || y === 3 ? 0.04 : 0.015}"/>`; }
  svg += `<line x1="0" x2="${W}" y1="${base + 1}" y2="${base + 1}" stroke="#9aa7d6" stroke-width="0.015"/><line x1="0" x2="${W}" y1="${base + 2}" y2="${base + 2}" stroke="#9aa7d6" stroke-width="0.015"/>`;
  svg += `<g transform="translate(${dx},${dy})">`;
  t.strokes.forEach((s, k) => {
    if (s.kind === 'dot') { svg += `<circle cx="${s.start.x}" cy="${s.start.y}" r="0.13" fill="#2a6f97"/>`; return; }
    svg += `<path d="${strokeToSvgPath(s)}" fill="none" stroke="#2a6f97" stroke-width="0.13" stroke-linecap="round" stroke-linejoin="round"/>`;
    svg += `<circle cx="${s.start.x}" cy="${s.start.y}" r="0.13" fill="#3cb371"/>`;
    svg += `<text x="${s.start.x - 0.25}" y="${s.start.y - 0.18}" font-size="0.3" fill="#c33">${k + 1}</text>`;
  });
  svg += `</g><text x="0.15" y="0.55" font-size="0.45" fill="#333">${id}</text></g>`;
});
svg += '</svg>';
fs.writeFileSync(out, svg);
console.log(out, ids.length, 'lettres');
