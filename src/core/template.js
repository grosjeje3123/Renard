import { parsePath } from '../engine/pathdata.js';
import { resample, polyLength, bbox } from '../engine/geometry.js';
import { BOARD } from './board.js';

const STEP = 0.06;

/**
 * Cahier adapté à la largeur du motif : un mot long agrandit la page (même interligne, même ligne d'écriture
 * décalée d'un nombre entier d'interlignes), l'écran la montre en entier, donc il se réduit tout seul.
 */
export function boardFor(width, board = BOARD) {
  const W = Math.max(board.W, Math.ceil((width + 1.6) * 2) / 2);
  const extra = Math.max(0, Math.ceil((W * 0.7 - board.H) / 2));
  return { ...board, W, H: board.H + 2 * extra, baseline: board.baseline + extra };
}

/**
 * Transforme la définition d'un exercice (chemins écrits y vers le haut, lettres droites)
 * en gabarit prêt pour l'affichage et l'analyse : inclinaison appliquée, centré sur le cahier,
 * converti dans l'espace du cahier (y vers le bas), rééchantillonné.
 */
export function buildTemplate(skill, board = BOARD) {
  const slant = skill.slant ?? (skill.kind === 'letter' || skill.kind === 'word' ? board.slant : 0);
  const raw = skill.strokes.map((s) =>
    s.dot ? { dot: true, pts: [{ x: s.dot[0], y: s.dot[1] }] } : { dot: false, pts: parsePath(s.d) },
  );
  raw.forEach((s) => s.pts.forEach((p) => { p.x += slant * p.y; }));
  const all = raw.flatMap((s) => s.pts);
  const bb = bbox(all);
  const bd = boardFor(bb.w, board);
  const ox = (bd.W - bb.w) / 2 - bb.x0;
  const strokes = raw.map((s, i) => {
    const pts = s.pts.map((p) => ({ x: p.x + ox, y: bd.baseline - p.y }));
    if (s.dot) {
      return { index: i, kind: 'dot', pts, length: 0, start: pts[0], end: pts[0], bbox: bbox(pts), radius: 0.18 };
    }
    const dense = resample(pts, STEP);
    return { index: i, kind: 'path', pts: dense, length: polyLength(dense), start: dense[0], end: dense[dense.length - 1], bbox: bbox(dense) };
  });
  return {
    id: skill.id,
    strokes,
    board: bd,
    frame: { baseline: bd.baseline, xHeight: bd.baseline - 2, ascender: bd.baseline - 3 },
    bbox: bbox(strokes.flatMap((s) => s.pts)),
  };
}

/** Chaîne SVG "M x y L …" d'un trait du gabarit, pour l'affichage. */
export function strokeToSvgPath(stroke, every = 3) {
  const p = stroke.pts;
  if (stroke.kind === 'dot') return `M ${p[0].x} ${p[0].y} l 0.001 0`;
  let d = `M ${p[0].x.toFixed(3)} ${p[0].y.toFixed(3)}`;
  for (let i = every; i < p.length; i += every) d += ` L ${p[i].x.toFixed(3)} ${p[i].y.toFixed(3)}`;
  const last = p[p.length - 1];
  d += ` L ${last.x.toFixed(3)} ${last.y.toFixed(3)}`;
  return d;
}
