// Fiches à imprimer : fiche d'écriture (lignes Seyès, modèle, pointillés, lignes libres) et fiche animal.
// Les tracés viennent des mêmes gabarits que l'écran : l'enfant retrouve sur papier ce qu'il a fait avec le renard.
import { Page, A4, toPDF } from '../core/pdf.js';
import { SKILLS } from '../content/skills.js';
import { STICKER_BY_ID } from '../content/stickers.js';
import { factsOf, FICHES } from '../content/fiches.js';
import { templateOf } from './art.js';
import { stickerSVG } from './animals.js';
import { pointAt } from '../engine/geometry.js';

const INK = '#2B1A12', MUTED = '#6B5B52', ORANGE = '#E8791C', GREEN = '#2E9E5B';
const RULE = '#B7A5E2', RULE_THIN = '#D9CEF0', DOTS = '#8C8A9B', SOFT = '#FFF3DC';
const M = 14; // marge, en mm

export const REGLURES = [
  { mm: 3, label: 'Grand · 3 mm', hint: 'Grande section, début de CP' },
  { mm: 2.5, label: 'Moyen · 2,5 mm', hint: 'Milieu du CP' },
  { mm: 2, label: 'Standard · 2 mm', hint: 'Fin de CP, CE1' },
];

/** Lignes Seyès : une « ligne d'écriture » = 8 interlignes ; trait fort tous les 4 interlignes, verticales tous les 4. */
function seyes(page, x, y, w, rows, u) {
  const h = rows * 8 * u;
  for (let i = 0; i <= rows * 8; i++) page.line(x, y + i * u, x + w, y + i * u, { color: i % 4 === 0 ? RULE : RULE_THIN, w: i % 4 === 0 ? 0.3 : 0.14 });
  for (let vx = x; vx <= x + w + 0.01; vx += 4 * u) page.line(vx, y, vx, y + h, { color: RULE_THIN, w: 0.14 });
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
        page.poly(pts, { color: DOTS, w: 0.17 * u + 0.15, dash: [0.01, 0.55 * u], cap: 'round' });
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
  const slot = bw + gap, n = Math.max(1, Math.floor((w - gap / 2 + 0.01) / slot));
  const x0 = M + gap / 2;
  for (let r = 0; r < rows; r++) {
    const base = baseOf(y0, r, u);
    for (let k = 0; k < n; k++) {
      const ox = x0 + k * slot;
      if (r === 0) drawCopy(page, tpl, ox, base, u, k === 0 ? 'solid' : 'dots', { numbers: k === 0 });
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
