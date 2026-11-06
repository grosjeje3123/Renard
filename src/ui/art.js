// Illustrations vectorielles : décors, récompenses, vignettes de niveaux, icônes de tracés.
// Les couleurs passent par des variables CSS pour suivre le thème jour / soir.
import { SKILLS } from '../content/skills.js';
import { buildTemplate, strokeToSvgPath } from '../core/template.js';
import { bbox } from '../engine/geometry.js';

const tree = (x, y, s, v = 0) => `<g transform="translate(${x} ${y}) scale(${s})">
  <rect x="-9" y="-70" width="18" height="74" rx="8" fill="var(--trunk)"/>
  <circle cx="0" cy="-118" r="62" fill="var(--leaf${v ? '-2' : ''})"/><circle cx="-44" cy="-88" r="40" fill="var(--leaf${v ? '' : '-2'})"/><circle cx="46" cy="-92" r="42" fill="var(--leaf${v ? '' : '-2'})"/>
  <circle cx="-14" cy="-134" r="14" fill="#fff" opacity=".12"/></g>`;
const flower = (x, y, c) => `<g transform="translate(${x} ${y})"><path d="M0 0v-26" stroke="var(--leaf-2)" stroke-width="3"/><circle cx="0" cy="-30" r="8" fill="${c}"/><circle cx="0" cy="-30" r="3.2" fill="#FFE27A"/></g>`;
const cloud = (x, y, s) => `<g class="cloud" transform="translate(${x} ${y}) scale(${s})" fill="var(--cloud)"><ellipse cx="0" cy="0" rx="70" ry="24"/><ellipse cx="-30" cy="-16" rx="34" ry="26"/><ellipse cx="22" cy="-22" rx="40" ry="30"/></g>`;
const sign = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-6" y="-120" width="12" height="124" rx="4" fill="var(--trunk)"/>
  <g transform="rotate(-4 0 -100)"><rect x="-70" y="-150" width="140" height="56" rx="12" fill="var(--wood)"/><text x="0" y="-111" text-anchor="middle" font-family="Fredoka,system-ui,sans-serif" font-weight="600" font-size="34" fill="var(--wood-ink)">a b c</text></g></g>`;

/** Décor principal : forêt des lettres. density 0 = épuré (écrans d'exercice), 1 = complet. */
export function forestScene({ density = 1, sign: withSign = true } = {}) {
  const far = [150, 420, 700, 980, 1280, 1500].map((x, i) => tree(x, 560 - (i % 2) * 14, 0.62, 1)).join('');
  const mid = density ? [60, 330, 1180, 1470].map((x, i) => tree(x, 690 + (i % 2) * 10, 0.95, i % 2)).join('') : '';
  const flowers = density ? [[250, 840, '#F7A8B8'], [520, 856, '#FFD25A'], [860, 846, '#fff'], [1100, 860, '#F7A8B8'], [1360, 842, '#FFD25A']].map((f) => flower(...f)).join('') : '';
  const leaves = density ? [180, 520, 860, 1240].map((x, i) => `<path class="leaf-fall" style="animation-delay:${i * 2.1}s;left:0" transform="translate(${x} -30)" d="M0 0c10-6 22-4 28 6-10 8-22 6-28-6z" fill="var(--leaf-2)" opacity=".7"/>`).join('') : '';
  const flies = density ? [[300, 600], [760, 520], [1190, 640], [1420, 520]].map(([x, y], i) => `<circle class="firefly" style="animation-delay:${i * 0.8}s" cx="${x}" cy="${y}" r="5" fill="#FFE98A"/>`).join('') : '';
  return `<svg class="scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky-top)"/><stop offset="1" style="stop-color:var(--sky-bot)"/></linearGradient></defs>
  <rect width="1600" height="900" fill="url(#sky)"/>
  <g class="sun"><circle cx="1370" cy="210" r="120" fill="var(--sun)" opacity=".28"/><circle cx="1370" cy="210" r="62" fill="var(--sun)"/></g>
  ${cloud(300, 150, 1.1)}${cloud(780, 90, 0.8)}${cloud(1480, 300, 0.9)}
  <path d="M0 560 C220 470 380 520 560 500 S900 430 1100 490 1450 470 1600 520 V900 H0Z" fill="var(--hill-3)"/>
  ${far}
  <path d="M0 640 C260 560 420 640 700 610 S1180 560 1400 620 1560 600 1600 630 V900 H0Z" fill="var(--hill-2)"/>
  ${mid}
  <path d="M0 760 C300 700 520 790 800 760 S1300 700 1600 770 V900 H0Z" fill="var(--hill-1)"/>
  <path d="M640 900 C700 820 760 790 840 770 C920 760 1000 740 1090 700" fill="none" stroke="var(--path)" stroke-width="46" stroke-linecap="round" opacity=".55"/>
  ${density && withSign ? sign(1010, 724) : ''}
  ${flowers}${leaves}${flies}
  </svg>`;
}

// ---------- Récompenses ----------
const IT = {
  iris: `<path d="M50 94V50" stroke="#4E9A63" stroke-width="5" stroke-linecap="round"/><path d="M50 84C34 82 26 72 24 62c14 0 24 8 26 22zM50 78c14-2 22-10 26-20-14-2-24 6-26 20z" fill="#5DB074"/>
    <path d="M50 52C36 48 28 34 34 16c12 4 18 16 16 36zM50 52C64 48 72 34 66 16c-12 4-18 16-16 36z" fill="#8B6FD6"/><path d="M50 56C38 62 24 56 20 42c14-4 26 2 30 14zM50 56c12 6 26 0 30-14-14-4-26 2-30 14z" fill="#A58CEB"/><path d="M50 56C42 46 42 30 50 20c8 10 8 26 0 36z" fill="#6E4FC0"/><path d="M50 52v-14" stroke="#FFD25A" stroke-width="4" stroke-linecap="round"/>`,
  oiseau: `<ellipse cx="50" cy="56" rx="32" ry="28" fill="#5BA8E0"/><ellipse cx="52" cy="66" rx="20" ry="15" fill="#E8F4FB"/><path d="M80 52l16 6-16 6z" fill="#F5A623"/><circle cx="64" cy="46" r="6" fill="#2A2A3A"/><circle cx="66" cy="44" r="2" fill="#fff"/><path d="M18 54c-12-2-14-14-10-22 10 4 16 12 18 22z" fill="#3E87BF"/><path d="M34 54c6-14 20-14 26-6-8 10-18 14-26 6z" fill="#3E87BF"/><path d="M42 84v8M58 84v8" stroke="#F5A623" stroke-width="4" stroke-linecap="round"/><path d="M40 28c4-8 12-12 18-10" stroke="#3E87BF" stroke-width="5" stroke-linecap="round" fill="none"/>`,
  abeille: `<ellipse cx="38" cy="38" rx="20" ry="14" fill="#CFEAF7" opacity=".9" transform="rotate(-24 38 38)"/><ellipse cx="62" cy="34" rx="20" ry="14" fill="#CFEAF7" opacity=".9" transform="rotate(20 62 34)"/><ellipse cx="50" cy="60" rx="28" ry="23" fill="#FFCE3A"/><path d="M36 42c-4 12-4 28 0 36M50 38v44M64 42c4 12 4 28 0 36" stroke="#3A2216" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="74" cy="56" r="5" fill="#3A2216"/><path d="M70 40c2-8 6-12 10-14M62 38c-2-8-2-12 0-16" stroke="#3A2216" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M22 62l-8 4" stroke="#3A2216" stroke-width="5" stroke-linecap="round"/>`,
  lanterne: `<path d="M38 22c0-12 24-12 24 0" fill="none" stroke="#6B4A33" stroke-width="5" stroke-linecap="round"/><rect x="30" y="22" width="40" height="8" rx="3" fill="#6B4A33"/><path d="M32 32h36l6 44H26z" fill="#FFD76A"/><path d="M32 32h36l6 44H26z" fill="none" stroke="#6B4A33" stroke-width="4" stroke-linejoin="round"/><path d="M50 32v44M40 32l-5 44M60 32l5 44" stroke="#6B4A33" stroke-width="3"/><rect x="24" y="76" width="52" height="10" rx="4" fill="#6B4A33"/><ellipse cx="50" cy="56" rx="9" ry="13" fill="#FFF3B0"/>`,
  ecureuil: `<path d="M70 86C96 82 100 46 82 28c-4 14-14 22-22 26 6 14 2 24-6 32z" fill="#C96F34"/><path d="M82 28c-6 8-8 18-4 30" stroke="#E7A064" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="44" cy="68" rx="24" ry="22" fill="#D98042"/><ellipse cx="42" cy="74" rx="12" ry="14" fill="#FFE8CC"/><circle cx="34" cy="38" r="20" fill="#D98042"/><path d="M22 24l-2-14 12 8zM44 20l6-12 4 14z" fill="#B8622C"/><circle cx="28" cy="38" r="4.5" fill="#2A2A3A"/><circle cx="29.5" cy="36.5" r="1.6" fill="#fff"/><ellipse cx="22" cy="46" rx="5" ry="4" fill="#2A2A3A"/><circle cx="52" cy="44" r="6" fill="#B8622C"/><ellipse cx="46" cy="86" rx="22" ry="6" fill="#B8622C"/>`,
  // accessoires (icônes seules)
  echarpe: `<path d="M16 34C34 54 66 54 84 34l4 18C68 74 32 74 12 52z" fill="#D94A4A"/><path d="M30 60L24 90l20-4 6-24z" fill="#C13A3A"/><path d="M33 70l-2 12" stroke="#FFD9D0" stroke-width="3" stroke-linecap="round" opacity=".7"/>`,
  lunettes: `<g fill="rgba(180,220,255,.35)" stroke="#3A2216" stroke-width="6"><circle cx="30" cy="54" r="22"/><circle cx="70" cy="54" r="22"/><path d="M52 50q-2-4-4 0M6 50l-4-6M94 50l4-6" fill="none" stroke-linecap="round"/></g>`,
  chapeau: `<ellipse cx="50" cy="66" rx="46" ry="14" fill="#B98C48"/><path d="M22 62C22 30 34 16 50 16s28 14 28 46z" fill="#D2A75C"/><path d="M22 56c18 8 38 8 56 0v8c-18 8-38 8-56 0z" fill="#7A5230"/>`,
  noeud: `<path d="M50 52L18 34C12 46 12 58 18 70zM50 52l32-18c6 12 6 24 0 36z" fill="#3E6FB0"/><circle cx="50" cy="52" r="10" fill="#2F5890"/>`,
  medaille: `<path d="M30 8l20 40 20-40" fill="none" stroke="#D94A4A" stroke-width="10" stroke-linejoin="round"/><circle cx="50" cy="66" r="24" fill="#F5C541" stroke="#C99A1E" stroke-width="4"/><path d="M50 50l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="#FFF3B0"/>`,
};
export const itemSVG = (id, { locked = false, cls = '' } = {}) =>
  `<svg class="item-art ${cls}" viewBox="0 0 100 100" aria-hidden="true" ${locked ? 'style="filter:brightness(0) opacity(.18)"' : ''}>${IT[id] || ''}</svg>`;

// ---------- Vignettes des niveaux ----------
export function levelThumb(id) {
  const base = `<rect width="320" height="190" fill="url(#lg${id})"/>`;
  const defs = `<defs><linearGradient id="lg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky-top)"/><stop offset="1" style="stop-color:var(--sky-bot)"/></linearGradient></defs>`;
  const hills = `<path d="M0 120C60 96 120 118 190 104S290 96 320 112V190H0Z" fill="var(--hill-2)"/><path d="M0 150C80 130 160 156 240 140S300 136 320 144V190H0Z" fill="var(--hill-1)"/>`;
  const t = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-4" y="-30" width="8" height="32" rx="3" fill="var(--trunk)"/><circle cx="0" cy="-44" r="26" fill="var(--leaf)"/><circle cx="-18" cy="-32" r="16" fill="var(--leaf-2)"/><circle cx="18" cy="-34" r="17" fill="var(--leaf-2)"/></g>`;
  let body = '';
  if (id === 1) body = `${hills}${t(60, 128, 1.1)}${t(260, 124, 0.9)}<path d="M150 190C160 160 170 150 196 138" fill="none" stroke="var(--path)" stroke-width="16" stroke-linecap="round" opacity=".6"/><g transform="translate(206 142)"><rect x="-2" y="-40" width="4" height="42" fill="var(--trunk)"/><rect x="-24" y="-52" width="48" height="20" rx="5" fill="var(--wood)"/><path d="M-12-42h24" stroke="var(--wood-ink)" stroke-width="3" stroke-linecap="round" stroke-dasharray="1 6"/></g>`;
  if (id === 2) body = `${hills}${t(44, 130, 1)}${t(280, 128, 1)}<rect x="116" y="70" width="92" height="76" rx="16" fill="var(--wood)"/><text x="162" y="130" text-anchor="middle" font-family="Fredoka,system-ui,sans-serif" font-weight="600" font-size="78" fill="var(--wood-ink)">a</text>`;
  if (id === 3) body = `${hills}${[[60, 100, '#E58E6E'], [140, 92, '#F2C26B'], [226, 100, '#8DB6D9']].map(([x, y, c]) => `<g transform="translate(${x} ${y})"><rect x="-26" y="0" width="52" height="46" fill="${c}"/><path d="M-32 2L0-26 32 2z" fill="var(--trunk)"/><rect x="-7" y="18" width="14" height="28" rx="3" fill="var(--wood-ink)" opacity=".7"/></g>`).join('')}`;
  if (id === 4) body = `<rect width="320" height="190" fill="var(--wood)"/><rect y="150" width="320" height="40" fill="var(--wood-ink)" opacity=".5"/>${[0, 1].map((r) => `<rect x="20" y="${34 + r * 58}" width="200" height="6" fill="var(--wood-ink)" opacity=".7"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${26 + i * 21}" y="${6 + r * 58 + (i % 3) * 4}" width="16" height="${28 - (i % 3) * 4}" rx="2" fill="${['#D9704F', '#5B8FB9', '#E8B84B', '#6BAA75', '#9A7FCB'][i % 5]}"/>`).join('')}`).join('')}<circle cx="268" cy="60" r="26" fill="#FFE9A8" opacity=".9"/><rect x="262" y="84" width="12" height="62" fill="var(--wood-ink)"/>`;
  return `<svg class="thumb" viewBox="0 0 320 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${defs}${base}${body}</svg>`;
}

// ---------- Icône d'un tracé (nœuds de la carte, tableau des parents) ----------
const tplCache = {};
export const templateOf = (id) => (tplCache[id] ||= buildTemplate(SKILLS[id]));

export function glyphIcon(id, { stroke = 'currentColor', width = 0.34, pad = 0.6 } = {}) {
  const t = templateOf(id);
  const bb = bbox(t.strokes.flatMap((s) => s.pts));
  const w = bb.w + pad * 2, hgt = bb.h + pad * 2;
  const d = t.strokes.map((s) => (s.kind === 'dot' ? `M ${s.start.x} ${s.start.y} l 0.01 0` : strokeToSvgPath(s, 4))).join(' ');
  return `<svg class="glyph" viewBox="${bb.x0 - pad} ${bb.y0 - pad} ${w} ${hgt}" aria-hidden="true"><path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
