import { SKILLS } from '../src/content/skills.js';
import { buildTemplate, strokeToSvgPath } from '../src/core/template.js';
import { BOARD } from '../src/core/board.js';
import fs from 'fs';
const ids = Object.keys(SKILLS);
const U = 40, cols = 2, rows = Math.ceil(ids.length / cols);
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${BOARD.W*U*cols}" height="${BOARD.H*U*rows}"><rect width="100%" height="100%" fill="#fff"/>`;
ids.forEach((id, i) => {
  const t = buildTemplate(SKILLS[id]);
  const ox = (i % cols) * BOARD.W * U, oy = Math.floor(i / cols) * BOARD.H * U;
  svg += `<g transform="translate(${ox},${oy}) scale(${U})"><rect width="${BOARD.W}" height="${BOARD.H}" fill="#fffdf6" stroke="#ccc" stroke-width="0.03"/>`;
  for (let y = 0; y <= 5; y++) { const yy = BOARD.baseline - y; svg += `<line x1="0" x2="${BOARD.W}" y1="${yy}" y2="${yy}" stroke="#9aa7d6" stroke-width="${y===0?0.06:(y===2||y===3)?0.04:0.015}"/>`; }
  t.strokes.forEach((s, k) => {
    svg += `<path d="${strokeToSvgPath(s)}" fill="none" stroke="#2a6f97" stroke-width="0.14" stroke-linecap="round" stroke-linejoin="round"/>`;
    svg += `<circle cx="${s.start.x}" cy="${s.start.y}" r="0.14" fill="#3cb371"/>`;
  });
  svg += `<text x="0.3" y="0.7" font-size="0.5" fill="#333">${id}</text></g>`;
});
svg += '</svg>';
fs.writeFileSync('/tmp/templates.svg', svg);
