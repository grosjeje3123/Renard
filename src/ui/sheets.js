// Fiches à imprimer : fiche d'écriture (lignes Seyès, modèle, pointillés, lignes libres) et fiche animal.
// Les tracés viennent des mêmes gabarits que l'écran : l'enfant retrouve sur papier ce qu'il a fait avec le renard.
import { Page, A4, toPDF } from '../core/pdf.js';
import { SKILLS, LEVELS } from '../content/skills.js';
import { STICKER_BY_ID, STICKERS } from '../content/stickers.js';
import { factsOf, FICHES } from '../content/fiches.js';
import { templateOf } from './art.js';
import { stickerSVG } from './animals.js';
import { foxSVG, FOX_CSS } from './fox.js';
import { pointAt } from '../engine/geometry.js';

const INK = '#2B1A12', MUTED = '#6B5B52', ORANGE = '#E8791C', GREEN = '#2E9E5B';
const RULE = '#B7A5E2', RULE_THIN = '#D9CEF0', DOTS = '#8C8A9B', SOFT = '#FFF3DC';
const M = 14; // marge, en mm

export const REGLURES = [
  { mm: 3, label: 'Grand · 3 mm', hint: 'Grande section, début de CP' },
  { mm: 2.5, label: 'Moyen · 2,5 mm', hint: 'Milieu du CP' },
  { mm: 2, label: 'Standard · 2 mm', hint: 'Fin de CP, CE1' },
];

/** Lignes Seyès : une « ligne d'écriture » = 8 interlignes ; une seule épaisseur de trait, plus soutenue tous les 4 interlignes ; verticales tous les 4. */
function seyes(page, x, y, w, rows, u) {
  const h = rows * 8 * u;
  for (let i = 0; i <= rows * 8; i++) page.line(x, y + i * u, x + w, y + i * u, { color: i % 4 === 0 ? RULE : RULE_THIN, w: 0.2 });
  for (let vx = x; vx <= x + w + 0.01; vx += 4 * u) page.line(vx, y, vx, y + h, { color: RULE_THIN, w: 0.2 });
  return h;
}
/** Ordonnée de la ligne d'écriture (ligne forte sur laquelle posent les lettres) de la rangée r. */
const baseOf = (y0, r, u) => y0 + (4 + 8 * r) * u;

function drawCopy(page, tpl, ox, baseY, u, mode, { numbers = false } = {}) {
  const x0 = tpl.bbox.x0, bl = tpl.frame.baseline;
  const P = (p) => [ox + (p.x - x0) * u, baseY + (p.y - bl) * u];
  tpl.strokes.forEach((s, i) => {
    const solid = mode === 'solid';
    if (s.kind === 'dot') {
      const [x, y] = P(s.start);
      page.circle(x, y, 0.3 * u, solid ? { fill: ORANGE, lw: 0.1 } : { color: DOTS, lw: 0.35 });
    } else {
      const pts = s.pts.filter((_, k) => k % 3 === 0 || k === s.pts.length - 1).map(P);
      if (solid) {
        page.poly(pts, { color: ORANGE, w: 0.42 * u, cap: 'round' });
        for (let a = 1.0; a < s.length - 0.5; a += 1.9) {
          const p = pointAt(s.pts, a), [x, y] = P(p), r = 0.2 * u, c = Math.cos(p.angle), sn = Math.sin(p.angle);
          page.poly([[x + c * r, y + sn * r], [x - c * r - sn * r * 0.8, y - sn * r + c * r * 0.8], [x - c * r + sn * r * 0.8, y - sn * r - c * r * 0.8]], { fill: '#FFFFFF', color: '#FFFFFF', noStroke: true });
        }
      } else {
        page.poly(pts, { color: DOTS, w: 0.17 * u + 0.15, dash: [0.01, Math.min(0.55 * u, 2.4)], cap: 'round' });
      }
    }
    if (mode !== 'blank') {
      const [x, y] = P(s.start);
      page.circle(x, y, 0.24 * u + 0.3, { fill: GREEN, color: '#FFFFFF', lw: 0.25 });
      if (numbers && tpl.strokes.length > 1) page.text(String(i + 1), x, y + 0.9, { size: 6, bold: true, color: '#FFFFFF', align: 'center' });
    }
  });
}

function star(page, cx, cy, r, o = {}) {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; });
  page.poly(pts, { color: ORANGE, w: 0.4, close: true, ...o });
}

function header(page, kind, title, name) {
  page.text(`RENARD · ${kind}`, M, 16, { size: 9, bold: true, color: ORANGE });
  page.text(title, M, 27, { size: 22, bold: true, color: INK });
  page.text(`Prénom : ${name || '.'.repeat(28)}`, A4.w - M, 27, { size: 11, color: INK, align: 'right' });
}
function footer(page) {
  page.text('Renard · Mon compagnon pour apprendre à écrire', M, A4.h - 10, { size: 7.5, color: MUTED });
  page.text('Mon travail :', A4.w - M - 56, A4.h - 10, { size: 8, color: MUTED, align: 'right' });
  [0, 1, 2].forEach((i) => star(page, A4.w - M - 51 + i * 7, A4.h - 11.2, 2.6));
  page.rect(A4.w - M - 28, A4.h - 13.4, 3.6, 3.6, { color: MUTED, lw: 0.3 });
  page.text('vu par un adulte', A4.w - M - 23, A4.h - 10, { size: 7.5, color: MUTED });
}

/** Fiche d'écriture d'un exercice : modèle, pointillés, puis lignes libres. Retourne une Page. */
export function writingSheet(skillId, { reglure = 3, name = '', lefty = false } = {}) {
  const sk = SKILLS[skillId], tpl = templateOf(skillId), u = reglure;
  const page = new Page();
  header(page, "fiche d'écriture", sk.title, name);
  const tilt = lefty
    ? 'Incline la feuille vers la droite et pose la main sous la ligne : tu vois ce que tu écris.'
    : 'Incline la feuille un peu vers la gauche et pose la main sous la ligne.';
  let y = page.para(`Assieds-toi bien droit. ${tilt} Tiens ton crayon sans trop serrer.`, M, 36, A4.w - 2 * M, { size: 9.5, color: MUTED });
  y = page.para('Ligne 1 : regarde le modèle orange, puis suis les pointillés. Ligne 2 : suis les pointillés. Ensuite, écris tout seul en partant du point vert.', M, y + 0.5, A4.w - 2 * M, { size: 9.5, color: MUTED });
  const y0 = y + 5, bottom = A4.h - 20, w = A4.w - 2 * M;
  const rows = Math.max(3, Math.floor((bottom - y0) / (8 * u)));
  seyes(page, M, y0, w, rows, u);
  const bw = (tpl.bbox.x1 - tpl.bbox.x0) * u;
  const gap = (sk.kind === 'word' ? 2.4 : sk.kind === 'letter' ? 1.9 : 1.4) * u;
  const n = Math.max(1, Math.min(5, Math.floor((w - gap / 2 + 0.01) / (bw + gap)))), slot = w / n; // cinq modèles au plus par ligne, bien espacés
  const x0 = M + (slot - bw) / 2;
  for (let r = 0; r < rows; r++) {
    const base = baseOf(y0, r, u);
    for (let k = 0; k < n; k++) {
      const ox = x0 + k * slot;
      if (r === 0) drawCopy(page, tpl, ox, base, u, k === 0 ? 'solid' : 'dots');
      else if (r === 1) drawCopy(page, tpl, ox, base, u, 'dots');
      else if (r === 2 && k < Math.ceil(n / 2)) drawCopy(page, tpl, ox, base, u, 'dots');
      else if (k === 0 || (r >= 2 && k < n)) {
        // lignes libres : seul le point vert de départ rappelle où commencer
        const first = tpl.strokes[0], p = first.start;
        page.circle(ox + (p.x - tpl.bbox.x0) * u, base + (p.y - tpl.frame.baseline) * u, 0.24 * u + 0.3, { fill: GREEN, color: '#FFFFFF', lw: 0.25 });
      }
    }
  }
  footer(page);
  return page;
}

/** Fiche animal : à lire à deux, à raconter, à dessiner, avec deux lignes libres. */
export function animalSheet(stickerId, { reglure = 3, name = '' } = {}) {
  const st = STICKER_BY_ID[stickerId], u = reglure;
  const page = new Page();
  header(page, 'fiche animal', st.name, name);
  page.svg(stickerSVG(st.animal).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" '), A4.w - M - 46, 32, 46, 46);
  let y = 46;
  const textW = A4.w - 2 * M - 58;
  for (const f of factsOf(st)) {
    page.circle(M + 1.6, y - 1.6, 1.3, { fill: ORANGE, lw: 0.1 });
    y = page.para(f, M + 7, y, textW, { size: 13, color: INK, lh: 6.6 }) + 3.2;
  }
  y = Math.max(y, 84) + 2;
  const move = FICHES[st.animal]?.move;
  const box = (label, text, h) => {
    page.rect(M, y, A4.w - 2 * M, h, { fill: SOFT, color: '#F3D9AE', lw: 0.3 });
    page.text(label, M + 4, y + 6.2, { size: 10, bold: true, color: ORANGE });
    page.para(text, M + 4, y + 12, A4.w - 2 * M - 8, { size: 11, color: INK });
    y += h + 4;
  };
  if (move) box('Bouge avec le renard', move, 22);
  box('Raconte', `Dis à un adulte une chose que tu as retenue sur ${st.name.charAt(0).toLowerCase()}${st.name.slice(1)}.`, 22);
  const linesH = 2 * 8 * u, bottom = A4.h - 20;
  const frameH = Math.max(36, bottom - linesH - 16 - y - 6);
  page.text('À toi de dessiner l’animal :', M, y + 4, { size: 10, bold: true, color: ORANGE });
  page.rect(M, y + 7, A4.w - 2 * M, frameH, { color: DOTS, lw: 0.4, dash: [1.2, 1.4] });
  y += frameH + 18;
  page.text('Écris ou dessine ce que tu veux retenir :', M, y - 3, { size: 10, bold: true, color: ORANGE });
  seyes(page, M, y, A4.w - 2 * M, 2, u);
  footer(page);
  return page;
}

// ---------- Cahiers de vacances : un par niveau, une dizaine de pages ----------
// Couverture avec le renard, une page de règles, six pages d'écriture en grand (trois éléments au plus par page, sans numéros de traits),
// et trois petits jeux autour du renard (labyrinthe, lettres cachées, points à relier). Une page par jour, une étoile à colorier.
const SOFT_LINE = '#F0D9AC';
const PAGES_ECRITURE = 6;
const U_NIVEAU = { 1: 7, 2: 6, 3: 5.5 }; // interligne en mm : bien plus grand que les cahiers d'école (3 mm), pour de grands gestes
const TOP = 34, BOTTOM = A4.h - 24;
const FACT_H = 22; // bandeau « Le savais-tu ? » en bas de chaque page d'écriture
/** Les animaux de la campagne qui accompagnent chaque page d'écriture (une vignette de l'album et sa petite anecdote). */
const ANIMAUX_CAHIER = {
  1: ['herisson', 'lapin', 'escargot', 'coccinelle', 'ecureuil', 'souris'],
  2: ['hibou', 'poule', 'vache', 'mouton', 'cheval', 'canard'],
  3: ['blaireau', 'cerf', 'grenouille', 'abeille', 'rougegorge', 'papillon'],
};

/** Le renard en image autonome (carrée) : avec sa feuille de style, pour que seule la pose de repos s'affiche. */
let foxImg = '';
export function foxImage() {
  return (foxImg ||= `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="460" viewBox="0 0 460 460"><style>${FOX_CSS}</style>${foxSVG().replace('<svg class="fox"', '<svg class="fox" x="30" y="0" width="400" height="460"')}</svg>`);
}

/** Petit générateur pseudo-aléatoire : le même cahier à chaque impression. */
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

function vFooter(page, n) {
  page.text(`Renard · cahier de vacances · page ${n}`, M, A4.h - 11, { size: 8, color: MUTED });
  page.text('Page finie ? Colorie l’étoile !', A4.w - M - 15, A4.h - 11, { size: 9.5, bold: true, color: ORANGE, align: 'right' });
  star(page, A4.w - M - 6, A4.h - 13, 6, { w: 0.6 });
}
function vHeader(page, kicker, title) {
  page.text(kicker.toUpperCase(), M, 15, { size: 9, bold: true, color: ORANGE });
  page.text(title, M, 25, { size: 20, bold: true, color: INK });
}

/**
 * Réglure « grand format » : seulement les interlignes utiles (4 au-dessus de la ligne d'écriture, 1 ou 3 en dessous selon
 * que le modèle descend ou non), la ligne d'écriture bien marquée. Retourne la hauteur de la rangée.
 */
function bigRow(page, x, top, w, u, below) {
  const n = 4 + below;
  for (let i = 0; i <= n; i++) page.line(x, top + i * u, x + w, top + i * u, i === 4 ? { color: RULE, w: 0.45 } : { color: RULE_THIN, w: 0.25 });
  for (let vx = x; vx <= x + w + 0.01; vx += 4 * u) page.line(vx, top, vx, top + n * u, { color: RULE_THIN, w: 0.2 });
  return n * u;
}

/** Un bloc d'écriture : le nom de l'exercice, puis deux rangées (trois pour une phrase trop longue pour deux copies). */
function blockOf(id, U) {
  const tpl = templateOf(id), w = A4.w - 2 * M;
  const bwu = tpl.bbox.x1 - tpl.bbox.x0;
  const u = Math.min(U, (w - 6) / (bwu + 1.2));
  const kind = SKILLS[id].kind;
  const gap = (kind === 'word' ? 2.4 : kind === 'letter' ? 2.2 : 1.6) * u;
  const n = Math.max(1, Math.min(4, Math.floor(w / (bwu * u + gap))));
  const rows = n >= 2 ? 2 : 3;
  const below = tpl.bbox.y1 - tpl.frame.baseline > 0.3 ? 3 : 1;
  const rowH = (4 + below) * u, sep = 0.8 * u;
  return { id, tpl, u, n, rows, below, rowH, sep, h: 9 + rows * rowH + (rows - 1) * sep + 6 };
}
function drawBlock(page, bl, y) {
  const { tpl, u, n, rows, below, rowH, sep } = bl, w = A4.w - 2 * M;
  page.text(SKILLS[bl.id].title, M, y + 5, { size: 12, bold: true, color: INK });
  const bw = (tpl.bbox.x1 - tpl.bbox.x0) * u, slot = w / n;
  const startDot = (ox, base) => { const p = tpl.strokes[0].start; page.circle(ox + (p.x - tpl.bbox.x0) * u, base + (p.y - tpl.frame.baseline) * u, 0.2 * u + 0.4, { fill: GREEN, color: '#FFFFFF', lw: 0.3 }); };
  for (let r = 0; r < rows; r++) {
    const top = y + 8 + r * (rowH + sep);
    bigRow(page, M, top, w, u, below);
    const base = top + 4 * u;
    for (let k = 0; k < n; k++) {
      const ox = M + k * slot + (slot - bw) / 2;
      if (rows === 3) { if (r === 0) drawCopy(page, tpl, ox, base, u, 'solid'); else if (r === 1) drawCopy(page, tpl, ox, base, u, 'dots'); else startDot(ox, base); }
      else if (r === 0) drawCopy(page, tpl, ox, base, u, k === 0 ? 'solid' : 'dots');
      else if (k === 0) drawCopy(page, tpl, ox, base, u, 'dots');
      else startDot(ox, base);
    }
  }
}

/** Choisit, dans l'ordre du parcours, autant d'exercices répartis que possible pour remplir six pages. */
function planEcriture(lv) {
  const U = U_NIVEAU[lv.id] || 4, ids = lv.sections.flatMap((x) => x.skills);
  const pack = (list) => {
    const pages = [[]]; let y = TOP;
    for (const bl of list) {
      if (y + bl.h > BOTTOM - FACT_H) { pages.push([]); y = TOP; }
      pages[pages.length - 1].push(bl); y += bl.h;
    }
    return pages;
  };
  for (let c = Math.min(ids.length, 3 * PAGES_ECRITURE); c >= PAGES_ECRITURE; c--) {
    const pick = Array.from({ length: c }, (_, i) => ids[Math.round((i * (ids.length - 1)) / Math.max(1, c - 1))]);
    const pages = pack([...new Set(pick)].map((id) => blockOf(id, U)));
    if (pages.length <= PAGES_ECRITURE) return pages;
  }
  return pack(ids.slice(0, PAGES_ECRITURE).map((id) => blockOf(id, U)));
}
const secTitle = (lv, id) => lv.sections.find((x) => x.skills.includes(id))?.title || lv.name;

function vCover(lv, name, nPages) {
  const p = new Page();
  p.rect(0, 0, A4.w, 70, { fill: ORANGE, color: ORANGE, lw: 0.1 });
  p.text('RENARD', M, 20, { size: 12, bold: true, color: '#FFFFFF' });
  p.text('Mon cahier de vacances', M, 38, { size: 30, bold: true, color: '#FFFFFF' });
  p.text(`Niveau ${lv.id} · ${lv.name} · ${lv.classe}`, M, 52, { size: 13, bold: true, color: '#FFFFFF' });
  p.text('J’apprends à écrire avec Renard', M, 61, { size: 11, color: '#FFFFFF' });
  p.svg(foxImage(), (A4.w - 120) / 2, 80, 120, 120);
  p.text('Ce cahier appartient à :', M, 216, { size: 13, bold: true, color: INK });
  if (name) p.text(name, M + 58, 216, { size: 15, bold: true, color: ORANGE });
  else p.line(M + 58, 217, A4.w - M, 217, { color: MUTED, w: 0.3 });
  p.text('Mes étoiles : une par page terminée', M, 236, { size: 11, bold: true, color: INK });
  for (let i = 0; i < nPages; i++) star(p, M + 8 + i * 18.5, 252, 7.5, { w: 0.7 });
  p.text('Une page par jour, pas plus : quelques lettres bien tracées valent mieux qu’une page bâclée.', M, A4.h - 18, { size: 9, color: MUTED });
  return p;
}

function vRegles(lv, name, lefty) {
  const p = new Page();
  vHeader(p, 'Avant de commencer', 'Les règles du renard');
  let y = 36;
  p.text('Pour toi', M, y, { size: 14, bold: true, color: ORANGE }); y += 7;
  const enfant = [
    `Je m’assois bien droit. La feuille est un peu penchée ${lefty ? 'vers la droite' : 'vers la gauche'}.`,
    'Je pars toujours du point vert.',
    'Je suis le sens des petites flèches blanches du modèle orange.',
    'Ma lettre touche la ligne du bas et monte jusqu’à la bonne ligne.',
    'J’écris d’un seul geste, sans appuyer trop fort.',
  ];
  enfant.forEach((t, i) => {
    p.circle(M + 4, y + 1.6, 4, { fill: ORANGE, color: '#FFFFFF', lw: 0.2 });
    p.text(String(i + 1), M + 4, y + 3.3, { size: 11, bold: true, color: '#FFFFFF', align: 'center' });
    y = p.para(t, M + 11, y + 3.2, A4.w - 2 * M - 11, { size: 12, color: INK }) + 3.4;
  });
  // La démarche en trois étapes, montrée avec un vrai modèle.
  y += 2;
  p.text('Sur chaque page, trois étapes', M, y, { size: 14, bold: true, color: ORANGE }); y += 4;
  const demo = lv.sections[0].skills[0], tpl = templateOf(demo), u = 5;
  const bw = (tpl.bbox.x1 - tpl.bbox.x0) * u, colW = (A4.w - 2 * M) / 3;
  const rowH = bigRow(p, M, y + 2, A4.w - 2 * M, u, 1);
  ['solid', 'dots', 'start'].forEach((mode, k) => {
    const ox = M + k * colW + (colW - bw) / 2, base = y + 2 + 4 * u;
    if (mode === 'start') { const s0 = tpl.strokes[0].start; p.circle(ox + (s0.x - tpl.bbox.x0) * u, base + (s0.y - tpl.frame.baseline) * u, 1.3, { fill: GREEN, color: '#FFFFFF', lw: 0.25 }); }
    else drawCopy(p, tpl, ox, base, u, mode);
  });
  y += rowH + 8;
  ['1. Le modèle : je regarde, je repasse.', '2. Les pointillés : je les suis.', '3. Tout seul : je pars du point vert.'].forEach((t, k) => p.text(t, M + k * colW + 2, y, { size: 9.5, bold: true, color: INK }));
  y += 10;
  p.rect(M, y, A4.w - 2 * M, 84, { fill: SOFT, color: SOFT_LINE, lw: 0.3 });
  let yy = y + 8;
  p.text('Pour l’adulte : ce que le renard regarde, sur l’écran comme ici', M + 5, yy, { size: 11.5, bold: true, color: INK }); yy += 6.5;
  const adulte = [
    ['Le départ', 'le trait commence au point vert.'],
    ['Le sens', 'le geste suit les flèches (on ne trace pas un rond « à l’envers »).'],
    ['La forme', 'le tracé ressemble au modèle.'],
    ['La taille', 'ni trop petite, ni trop grande.'],
    ['Les lignes', 'la lettre pose sur la ligne et monte jusqu’à la bonne hauteur.'],
    ['La fluidité', 'un trait continu, sans trembler ni s’arrêter.'],
  ];
  for (const [k, t] of adulte) { p.text(k, M + 5, yy, { size: 10, bold: true, color: ORANGE }); yy = p.para(t, M + 30, yy, A4.w - 2 * M - 35, { size: 10, color: INK }) + 1.6; }
  p.para('Encouragez d’abord ce qui est réussi, puis un seul conseil à la fois. Si le sens est faux, montrez le geste du doigt au-dessus du modèle. Une page par jour suffit ; l’enfant colorie l’étoile en bas de page quand il a fini.', M + 5, yy + 2, A4.w - 2 * M - 10, { size: 9.5, color: MUTED });
  p.text(`Grandes lignes (${String(U_NIVEAU[lv.id] || 5).replace('.', ',')} mm entre deux lignes), pour de grands gestes. Imprimez en A4, à 100 %.`, M, A4.h - 11, { size: 8, color: MUTED });
  return p;
}

function vEcriture(lv, blocks, jour, n) {
  const p = new Page();
  vHeader(p, `Jour ${jour}`, secTitle(lv, blocks[0].id));
  let y = TOP;
  const spare = (BOTTOM - FACT_H - TOP - blocks.reduce((a, b) => a + b.h, 0)) / (blocks.length + 1);
  for (const bl of blocks) { y += Math.max(0, Math.min(spare, 12)); drawBlock(p, bl, y); y += bl.h; }
  // Le savais-tu ? Une vignette d'animal de la campagne et sa petite anecdote, à lire à deux une fois la page finie.
  const liste = ANIMAUX_CAHIER[lv.id] || ANIMAUX_CAHIER[1];
  const st = STICKER_BY_ID[liste[(jour - 1) % liste.length]];
  if (st) {
    const fy = BOTTOM - FACT_H + 2;
    p.rect(M, fy, A4.w - 2 * M, FACT_H - 4, { fill: SOFT, color: SOFT_LINE, lw: 0.3 });
    p.svg(stickerSVG(st.animal).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" '), M + 2, fy + 1, FACT_H - 6, FACT_H - 6);
    p.text(`Le savais-tu ? ${st.name}`, M + FACT_H - 1, fy + 6, { size: 10, bold: true, color: ORANGE });
    p.para(st.fact, M + FACT_H - 1, fy + 11, A4.w - 2 * M - FACT_H - 2, { size: 9.5, color: INK });
  }
  vFooter(p, n);
  return p;
}

/** Jeu 1 : le labyrinthe. Un vrai labyrinthe (un seul chemin), tracé au crayon sans toucher les murs. */
function vLabyrinthe(lv, n) {
  const p = new Page();
  vHeader(p, 'Petit jeu', 'Le labyrinthe de Renard');
  p.para('Renard a perdu son crayon ! Trace le chemin du renard jusqu’au crayon, sans toucher les murs. Va doucement, comme quand tu écris.', M, 34, A4.w - 2 * M, { size: 12, color: INK });
  const cols = lv.id === 1 ? 6 : lv.id === 2 ? 7 : 8, rows = lv.id === 1 ? 7 : lv.id === 2 ? 8 : 9;
  const my = 80, cs = Math.min((A4.w - 2 * M - 10) / cols, (BOTTOM - 22 - my) / rows), mx = (A4.w - cols * cs) / 2;
  const R = rng(lv.id * 97 + 13);
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
  const right = Array.from({ length: rows }, () => Array(cols).fill(true)), down = Array.from({ length: rows }, () => Array(cols).fill(true));
  const stack = [[0, 0]]; seen[0][0] = true;
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const nb = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < rows && b < cols && !seen[a][b]);
    if (!nb.length) { stack.pop(); continue; }
    const [a, b] = nb[Math.floor(R() * nb.length)];
    if (a === r) right[r][Math.min(b, c)] = false; else down[Math.min(a, r)][c] = false;
    seen[a][b] = true; stack.push([a, b]);
  }
  const W = { color: INK, w: 1.1, cap: 'round' };
  p.line(mx + cs, my, mx + cols * cs, my, W); // haut (entrée à gauche)
  p.line(mx, my + rows * cs, mx + (cols - 1) * cs, my + rows * cs, W); // bas (sortie à droite)
  p.line(mx, my, mx, my + rows * cs, W); p.line(mx + cols * cs, my, mx + cols * cs, my + rows * cs, W);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (c < cols - 1 && right[r][c]) p.line(mx + (c + 1) * cs, my + r * cs, mx + (c + 1) * cs, my + (r + 1) * cs, W);
    if (r < rows - 1 && down[r][c]) p.line(mx + c * cs, my + (r + 1) * cs, mx + (c + 1) * cs, my + (r + 1) * cs, W);
  }
  p.svg(foxImage(), mx - 6, my - 29, 28, 28);
  // le crayon, à la sortie
  const px = mx + (cols - 0.5) * cs, py = my + rows * cs + 6;
  p.poly([[px - 12, py + 3], [px + 6, py + 3], [px + 11, py + 6], [px + 6, py + 9], [px - 12, py + 9]], { fill: '#F6C34A', color: INK, w: 0.4, close: true });
  p.poly([[px + 6, py + 3], [px + 11, py + 6], [px + 6, py + 9]], { fill: '#F3D9AE', color: INK, w: 0.4, close: true });
  vFooter(p, n);
  return p;
}

/** Jeu 2 : les lettres cachées. Entourer toutes les lettres (ou tous les sons) pareils au modèle. */
const CACHE = {
  1: { cible: 'E', autres: ['F', 'L', 'T', 'H', 'I'], dit: 'la lettre E' },
  2: { cible: 'b', autres: ['d', 'p', 'q', 'h', 'l'], dit: 'la lettre b' },
  3: { cible: 'ou', autres: ['on', 'au', 'oi', 'an', 'un'], dit: 'le son « ou »' },
};
function vCachees(lv, n) {
  const p = new Page();
  const g = CACHE[lv.id] || CACHE[1];
  vHeader(p, 'Petit jeu', 'Les lettres cachées');
  p.para(`Renard cherche ${g.dit}. Entoure-les toutes ! Attention, certaines se ressemblent beaucoup.`, M, 34, A4.w - 2 * M - 46, { size: 12, color: INK });
  p.svg(foxImage(), A4.w - M - 40, 28, 40, 40);
  p.rect(M, 52, 44, 26, { fill: SOFT, color: SOFT_LINE, lw: 0.3 });
  p.text('Le modèle :', M + 4, 60, { size: 10, bold: true, color: MUTED });
  p.text(g.cible, M + 22, 74, { size: 26, bold: true, color: ORANGE, align: 'center' });
  const R = rng(lv.id * 31 + 7), cols = 6, rows = 7, cw = (A4.w - 2 * M) / cols, ch = 23, y0 = 96;
  const cells = Array.from({ length: cols * rows }, () => g.autres[Math.floor(R() * g.autres.length)]);
  let k = 0; while (k < 11) { const i = Math.floor(R() * cells.length); if (cells[i] !== g.cible) { cells[i] = g.cible; k++; } }
  cells.forEach((t, i) => p.text(t, M + (i % cols) * cw + cw / 2, y0 + Math.floor(i / cols) * ch, { size: 30, color: INK, align: 'center' }));
  p.text('Combien en as-tu trouvé ?', M, y0 + rows * ch + 4, { size: 12, bold: true, color: INK });
  p.rect(M + 58, y0 + rows * ch - 3, 16, 10, { color: MUTED, lw: 0.4 });
  vFooter(p, n);
  return p;
}

/** Jeu 3 : relier les points pour faire apparaître Renard, puis le colorier. */
const TETE = [[50, 92], [36, 82], [22, 66], [8, 58], [16, 46], [14, 26], [18, 4], [36, 22], [50, 20], [64, 22], [82, 4], [86, 26], [84, 46], [92, 58], [78, 66], [64, 82]];
function vPoints(n) {
  const p = new Page();
  vHeader(p, 'Petit jeu', 'Qui se cache ici ?');
  p.para('Relie les points de 1 à 16, puis reviens au 1. Qui apparaît ? Colorie-le en orange, avec un bout de queue blanc !', M, 34, A4.w - 2 * M, { size: 12, color: INK });
  const s = 1.55, ox = (A4.w - 100 * s) / 2, oy = 62, P = ([x, y]) => [ox + x * s, oy + y * s];
  p.circle(...P([36, 48]), 3.2, { fill: INK, lw: 0.1 }); p.circle(...P([64, 48]), 3.2, { fill: INK, lw: 0.1 });
  p.circle(...P([50, 66]), 3.6, { fill: INK, lw: 0.1 });
  TETE.forEach((pt, i) => {
    const [x, y] = P(pt);
    p.circle(x, y, 1.4, { fill: INK, lw: 0.1 });
    const dx = pt[0] < 50 ? -5 : pt[0] > 50 ? 5 : 0, dy = pt[1] > 70 ? 6 : -3;
    p.text(String(i + 1), x + dx, y + dy, { size: 11, bold: true, color: ORANGE, align: 'center' });
  });
  vFooter(p, n);
  return p;
}

/** Les séries (sections) des trois premiers niveaux, pour les fiches à l'unité. */
export const cahierSeries = () => LEVELS.filter((l) => l.sections).map((l) => ({ id: l.id, name: l.name, classe: l.classe, n: l.sections.reduce((a, x) => a + x.skills.length, 0) }));

/** Le cahier de vacances d'un niveau. Retourne { pages, n (exercices d'écriture), titre }. */
export function cahierPages(levelId, { name = '', lefty = false } = {}) {
  const lv = LEVELS.find((l) => l.id === levelId);
  const plan = planEcriture(lv);
  const total = 2 + plan.length + 3;
  const pages = [vCover(lv, name, total - 2), vRegles(lv, name, lefty)];
  let num = 3, jour = 1;
  const ecr = (i) => { if (plan[i]) pages.push(vEcriture(lv, plan[i], jour++, num++)); };
  ecr(0); ecr(1); pages.push(vLabyrinthe(lv, num++));
  ecr(2); ecr(3); pages.push(vCachees(lv, num++));
  ecr(4); ecr(5); pages.push(vPoints(num++));
  return { pages, n: plan.flat().length, titre: `Niveau ${lv.id} · ${lv.name}` };
}

// ---------- Sortie ----------
/** Rastérise une vignette SVG en pixels RGB (fond blanc), pour l'incorporer au PDF. Navigateur uniquement. */
export async function rasterize(svg, px) {
  const img = new Image();
  const loaded = new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await loaded;
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, px, px);
  g.drawImage(img, 0, 0, px, px);
  const d = g.getImageData(0, 0, px, px).data, rgb = new Uint8Array(px * px * 3);
  for (let i = 0, j = 0; i < d.length; i += 4) { rgb[j++] = d[i]; rgb[j++] = d[i + 1]; rgb[j++] = d[i + 2]; }
  return { w: px, h: px, rgb };
}

export const sheetPDF = (page, title, raster = rasterize) => toPDF([page], { title, raster });
/** Plusieurs pages en un seul PDF (cahiers). */
export const cahierPDF = (pages, title, raster = rasterize) => toPDF(pages, { title, raster });

const b64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); };

const plugins = {};
/** Plugins Capacitor (Filesystem, Share) : enregistrés une seule fois, sinon Capacitor s'en plaint. */
export const nativePlugin = (name) => (plugins[name] ||= window.Capacitor.registerPlugin(name));
export const isNative = () => !!window.Capacitor?.isNativePlatform?.();
/** Tablette tactile dont le navigateur sait partager un fichier (iPad, Android) : « Enregistrer dans Fichiers », imprimer, etc. */
export const partageFichiers = () => {
  try { return !isNative() && matchMedia('(pointer: coarse)').matches && typeof navigator.canShare === 'function' && typeof navigator.share === 'function'; } catch { return false; }
};

/**
 * Remet un fichier à l'adulte : feuille de partage de la tablette (application Android) ou téléchargement (navigateur).
 * Retourne 'partage' | 'telechargement' | 'annule'.
 */
export async function deliverFile(bytes, filename, { mime = 'application/pdf', dialogTitle = 'Enregistrer ou partager' } = {}) {
  if (isNative()) {
    const { uri } = await nativePlugin('Filesystem').writeFile({ path: filename, data: b64(bytes), directory: 'CACHE' });
    await nativePlugin('Share').share({ title: filename, url: uri, dialogTitle });
    return 'partage';
  }
  // Dans une page publiée par Claude (démo en ligne), le téléchargement passe par la capacité « downloads ».
  try {
    const dl = await window.claude?.use?.('downloads');
    if (dl) {
      try { await dl.save({ filename, data: bytes }); return 'telechargement'; } catch (e) { if (e?.code === 'declined') return 'annule'; }
    }
  } catch { /* pas de capacité : téléchargement ordinaire */ }
  // Tablette tactile installée ou non : la feuille de partage du système, d'où l'on enregistre ou imprime (le téléchargement direct y est capricieux).
  if (partageFichiers()) {
    try {
      const file = new File([bytes], filename, { type: mime });
      if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: filename }); return 'partage'; }
    } catch (e) { if (e?.name === 'AbortError') return 'annule'; /* autre refus : téléchargement ordinaire ci-dessous */ }
  }
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'telechargement';
}
export const deliverPDF = (bytes, filename) => deliverFile(bytes, filename, { mime: 'application/pdf', dialogTitle: 'Imprimer ou enregistrer la fiche' });

export async function shareText(text, title) {
  await nativePlugin('Share').share({ title, text, dialogTitle: 'Enregistrer la sauvegarde où vous voulez' });
}
