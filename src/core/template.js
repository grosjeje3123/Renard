import { parsePath } from '../engine/pathdata.js';
import { resample, polyLength, bbox } from '../engine/geometry.js';
import { BOARD } from './board.js';

const STEP = 0.06;

/**
 * Cahier adapté à la largeur du motif : un mot long agrandit la page (même interligne, même ligne d'écriture
 * décalée d'un nombre entier d'interlignes), l'écran la montre en entier, donc il se réduit tout seul.
 * `lignes` : décalage (vers le bas) des lignes d'écriture d'un texte qui revient à la ligne ([0] = une seule ligne).
 * Avec plusieurs lignes, la page est juste assez haute pour elles : 4 interlignes au-dessus de la première, 2,5 sous la dernière.
 */
export function boardFor(width, board = BOARD, lignes = [0]) {
  const bas = Math.max(...lignes);
  if (bas <= 0) {
    const W = Math.max(board.W, Math.ceil((width + 1.6) * 2) / 2);
    const extra = Math.max(0, Math.ceil((W * 0.7 - board.H) / 2));
    return { ...board, W, H: board.H + 2 * extra, baseline: board.baseline + extra, rows: [board.baseline + extra] };
  }
  const haut = 4 + bas + 2.5;
  const W = Math.max(board.W, Math.ceil((width + 1.6) * 2) / 2, Math.ceil((haut / 0.7) * 2) / 2);
  const H = Math.max(Math.ceil(haut), Math.ceil(W * 0.7));
  const baseline = 4 + Math.floor((H - haut) / 2);
  return { ...board, W, H, baseline, rows: lignes.map((l) => baseline + l) };
}

/**
 * Transforme la définition d'un exercice (chemins écrits y vers le haut, lettres droites)
 * en gabarit prêt pour l'affichage et l'analyse : inclinaison appliquée, centré sur le cahier,
 * converti dans l'espace du cahier (y vers le bas), rééchantillonné.
 * `ecran` : prend la mise en page prévue pour l'écran si l'exercice en a une (phrase sur plusieurs lignes, voir composeLines).
 */
export function buildTemplate(skill, board = BOARD, { ecran = false } = {}) {
  const src = ecran && skill.ecran ? skill.ecran : skill;
  const lignes = (src.lignes || [0]).map((l) => -l); // décalages vers le bas, dans le repère du cahier
  const slant = skill.slant ?? (skill.kind === 'letter' || skill.kind === 'word' ? board.slant : 0);
  const seule = skill.kind === 'letter' && skill.level === 2 ? skill.glyph : undefined; // une lettre cursive seule : tous ses traits lui appartiennent
  const raw = src.strokes.map((s) =>
    s.dot ? { dot: true, src: s, pts: [{ x: s.dot[0], y: s.dot[1] }] } : { dot: false, src: s, pts: parsePath(s.d) },
  );
  // L'inclinaison se mesure depuis la ligne d'écriture de chaque trait : la deuxième ligne d'une phrase ne part pas plus à gauche que la première.
  raw.forEach((s) => { const base = -(lignes[s.src.row || 0] || 0); s.pts.forEach((p) => { p.x += slant * (p.y - base); }); });
  const all = raw.flatMap((s) => s.pts);
  const bb = bbox(all);
  const bd = boardFor(bb.w, board, lignes);
  const ox = (bd.W - bb.w) / 2 - bb.x0;
  const strokes = raw.map((s, i) => {
    const pts = s.pts.map((p) => ({ x: p.x + ox, y: bd.baseline - p.y }));
    // `of` : la lettre à laquelle appartient le trait ; `mark` : un accent ; `base` : la ligne d'écriture du trait
    const meta = { of: s.src.of ?? seule, mark: s.src.mark, base: bd.rows[s.src.row || 0] ?? bd.baseline };
    if (s.dot) {
      return { index: i, kind: 'dot', pts, length: 0, start: pts[0], end: pts[0], bbox: bbox(pts), radius: 0.18, ...meta };
    }
    const dense = resample(pts, STEP);
    return { index: i, kind: 'path', pts: dense, length: polyLength(dense), start: dense[0], end: dense[dense.length - 1], bbox: bbox(dense), ...meta };
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
