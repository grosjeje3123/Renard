// Tableau libre : une page lignée où l'enfant écrit ce qu'il veut (son prénom, un mot, une phrase), avec un calque à suivre.
// Fonctions pures, sans interface : testables sans navigateur. Le texte est du « a–z » sans accent, avec des espaces ;
// la casse (minuscules cursives, MAJUSCULES d'imprimerie ou majuscule au début) ne change que le tracé.
import { SKILLS, ECRITURE, composeText } from '../content/skills.js';
import { buildTemplate, strokeToSvgPath } from './template.js';
import { BOARD } from './board.js';
import { bbox, polyLength } from '../engine/geometry.js';
import { recognizer } from '../engine/recognizer.js';
import { recognizerContext } from './tolerance.js';

export const TABLEAU = {
  W: 20, H: 14,
  rows: [3.8, 8.2, 12.2], // lignes d'écriture des trois rangées : calque plein, calque en pointillés, écriture seul
  margin: 1.6, // marge à gauche
  maxWidth: 31, // largeur maximale du texte ; la page s'agrandit (et se réduit à l'écran) pour qu'il tienne, comme pour les exercices
  maxLen: 40,
};

/** Les trois façons d'écrire le même texte. */
export const CASSES = [
  { id: 'min', label: 'abc', name: 'Minuscules', hint: 'Les lettres attachées, comme dans le cahier' },
  { id: 'maj', label: 'ABC', name: 'MAJUSCULES', hint: 'Les lettres capitales d’imprimerie' },
  { id: 'debut', label: 'Abc', name: 'Majuscule au début', hint: 'Pour un prénom ou une phrase' },
];

/** « Léa-Rose » → « lea rose » : minuscules, sans accent, seulement a–z et espaces simples. */
export function clean(s) {
  return String(s || '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]+/g, ' ').replace(/^ /, '').slice(0, TABLEAU.maxLen);
}

/** Le texte tel qu'on l'écrit : « lea » → « LEA » (majuscules) ou « Lea » (majuscule au début). */
export function cased(text, mode = 'min') {
  const t = clean(text).trim();
  if (mode === 'maj') return t.toUpperCase();
  if (mode === 'debut') return t.charAt(0).toUpperCase() + t.slice(1);
  return t;
}

/** La page qui convient à un texte de cette largeur : toujours au rapport 10:7 de l'écran, interligne inchangé. */
/**
 * La page d'écriture pour un texte de largeur `width`. `ratio` (hauteur / largeur) dit combien de place l'écran offre :
 * par défaut 0,7 (la page d'origine, 3 rangées pour 20 de large) ; si l'écran est plus haut (iPad, portrait), on ajoute
 * des rangées entières tant que la page reste dans ce rapport (à 0,04 près), plutôt que de laisser du vide autour.
 */
export function page(width = 0, ratio = 0.7) {
  const W = Math.max(TABLEAU.W, Math.ceil((width + 2 * TABLEAU.margin) / 2) * 2);
  let H = Math.max(TABLEAU.H, Math.ceil(W * 0.7));
  const rows = [...TABLEAU.rows];
  const step = 4.4, below = 1.8; // espace entre deux rangées ; place sous la dernière ligne de base
  for (let b = rows.at(-1) + step; b + below <= H; b += step) rows.push(+b.toFixed(2));
  while ((rows.at(-1) + step + below) / W <= ratio + 0.04) {
    rows.push(+(rows.at(-1) + step).toFixed(2));
    H = Math.max(H, +(rows.at(-1) + below).toFixed(2));
  }
  return { W, H, rows };
}

const cache = new Map();
/**
 * Le calque d'un texte posé sur la ligne d'écriture `baseline` : traits (chemins en points ou points), largeur,
 * et les traits denses du gabarit (`tpl`) pour reconnaître ce que l'enfant écrit.
 * Les lettres sont celles des exercices (même gabarit, même inclinaison) ; les majuscules sont des capitales d'imprimerie.
 */
export function calque(text, baseline = TABLEAU.rows[0], mode = 'min') {
  const t = cased(text, mode);
  if (!t) return { text: '', strokes: [], tpl: [], width: 0, bbox: null };
  const key = `${t}|${baseline}`;
  if (cache.has(key)) return cache.get(key);
  const sk = { id: 'tableau', kind: 'word', strokes: composeText(t, { period: false, skills: ECRITURE }) };
  const tpl = buildTemplate(sk, { ...BOARD, W: TABLEAU.W, H: TABLEAU.H, baseline });
  const dx = TABLEAU.margin - tpl.bbox.x0;
  const dy = baseline - tpl.board.baseline; // un texte large agrandit la page du gabarit : on remet le pied sur la ligne voulue
  const moved = tpl.strokes.map((s) => {
    const pts = s.pts.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    return { ...s, pts, start: pts[0], end: pts[pts.length - 1], bbox: bbox(pts) };
  });
  const strokes = moved.map((s) => ({ kind: s.kind, d: strokeToSvgPath(s, 3), start: s.start }));
  const out = { text: t, strokes, tpl: moved, width: tpl.bbox.x1 - tpl.bbox.x0, bbox: { x0: TABLEAU.margin, x1: TABLEAU.margin + tpl.bbox.x1 - tpl.bbox.x0 } };
  cache.set(key, out);
  return out;
}

/** Le texte tient-il sur la page ? */
export const fits = (text, mode = 'min') => calque(text, TABLEAU.rows[0], mode).width <= TABLEAU.maxWidth;

/** Propositions de départ : le prénom de l'enfant (si on peut l'écrire) et les mots qu'il connaît déjà. */
export function suggestions(st, mode = 'min') {
  const prenom = clean(st.name).trim();
  const known = Object.keys(st.skills || {}).filter((id) => st.skills[id].sessions > 0 && SKILLS[id]?.kind === 'word' && !SKILLS[id].phrase && !SKILLS[id].groupe);
  const mots = known.map((id) => SKILLS[id].glyph).filter((w) => fits(w, mode));
  return { prenom: prenom && fits(prenom, mode) ? prenom : '', mots };
}

// ---------------------------------------------------------------------------------------------------------------
// Reconnaître ce que l'enfant a écrit sur une rangée : le texte choisi est connu, on compare chaque trait au gabarit.
// L'enfant peut écrire où il veut sur la rangée (on aligne le début), dans l'ordre qu'il veut (les traits sont appariés
// au plus près), et poser les points des i et des j quand il veut. Rien n'est noté : le résultat sert à féliciter.

/** Nombre de traits attendus pour écrire ce texte (lettres, barres, points). */
export const expectedStrokes = (text, mode = 'min') => calque(text, TABLEAU.rows[0], mode).tpl.length;

const centroid = (pts) => ({ x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length });
const isTap = (pts) => polyLength(pts) < 0.5;

/** La rangée la plus proche d'un trait (d'après son centre, par rapport au milieu des petites lettres). */
export function rowOf(rows, pts) {
  const c = centroid(pts);
  let best = 0;
  rows.forEach((b, i) => { if (Math.abs(c.y - (b - 1)) < Math.abs(c.y - (rows[best] - 1))) best = i; });
  return best;
}

/**
 * Évalue ce qui est écrit sur une rangée.
 * `strokes` : traits de l'enfant sur cette rangée [{ pts: [{x,y}], lifts?, pointerType? }], en unités de la page.
 * `phase` : 0 = guide plein, 1 = pointillés, 2 = tout seul (rangées sans calque). `boardW` : largeur de la page.
 * Retourne { ok, stars, score, expected, got, matched, tags } ; ok = au moins deux étoiles, sans trait manquant.
 */
export function checkRow({ text, mode = 'min', baseline, strokes, phase = 2, boardW = TABLEAU.W, settings = {} }) {
  const c = calque(text, baseline, mode);
  const T = c.tpl;
  const none = { ok: false, stars: 0, score: 0, expected: T.length, got: strokes.length, matched: 0, tags: ['vide'] };
  if (!T.length || !strokes.length) return none;
  const tPaths = T.filter((s) => s.kind === 'path'), tDots = T.filter((s) => s.kind === 'dot');
  const uPaths = strokes.filter((s) => !isTap(s.pts)), uDots = strokes.filter((s) => isTap(s.pts));
  if (uPaths.length < tPaths.length) return { ...none, tags: ['trait-manquant'], matched: 0 };
  // alignement : le début du mot sur la rangée (translation seulement ; la hauteur reste celle de la ligne)
  const ux0 = Math.min(...uPaths.flatMap((s) => s.pts.map((p) => p.x)));
  const tx0 = Math.min(...tPaths.map((s) => s.bbox.x0));
  // échelle : un mot écrit plus petit ou plus grand que le modèle reste le même mot ; on le ramène à la taille du calque
  // (la taille juste n'est pas jugée ici : rien n'est noté, on cherche à féliciter ce qui est bien écrit)
  const ux1 = Math.max(...uPaths.flatMap((s) => s.pts.map((p) => p.x)));
  const tx1 = Math.max(...tPaths.map((s) => s.bbox.x1));
  let k = (ux1 - ux0) / Math.max(0.5, tx1 - tx0);
  k = k < 0.85 || k > 1.18 ? Math.min(1.8, Math.max(0.55, k)) : 1;
  const moved = (s) => ({ ...s, pts: s.pts.map((p) => ({ ...p, x: tx0 + (p.x - ux0) / k, y: baseline + (p.y - baseline) / k })) });
  const U = [...uPaths, ...uDots].map(moved);
  // appariement glouton : les paires les plus proches d'abord
  const pairs = [];
  T.forEach((t, i) => U.forEach((u, j) => {
    if ((t.kind === 'dot') !== isTap(u.pts)) return;
    const cu = centroid(u.pts), ct = centroid(t.pts);
    const cost = Math.hypot(cu.x - ct.x, cu.y - ct.y) + (t.kind === 'path' ? Math.abs(Math.log((bbox(u.pts).w + 0.3) / (t.bbox.w + 0.3))) : 0);
    pairs.push({ i, j, cost });
  }));
  pairs.sort((a, b) => a.cost - b.cost);
  const ti = new Map(), uj = new Set();
  for (const p of pairs) if (!ti.has(p.i) && !uj.has(p.j)) { ti.set(p.i, p.j); uj.add(p.j); }
  const evals = [];
  const missing = [];
  T.forEach((t, i) => {
    const j = ti.get(i);
    if (j == null) { missing.push(i); evals.push(null); return; }
    const u = U[j];
    const ctx = recognizerContext({ kind: 'word' }, phase, settings, u.pointerType || 'touch', boardW);
    evals.push(recognizer.evaluateStroke(t, { points: u.pts, lifts: u.lifts || 0 }, ctx));
  });
  const matched = T.length - missing.length;
  // il manque un trait de lettre : l'écriture est incomplète (un point oublié ne bloque pas, il pèse seulement sur la note)
  if (missing.some((i) => T[i].kind === 'path')) return { ok: false, stars: 0, score: 0, expected: T.length, got: strokes.length, matched, tags: ['trait-manquant'] };
  const done = evals.map((e, i) => e || recognizer.evaluateStroke(T[i], { points: [] }, {}));
  const attempt = recognizer.evaluateAttempt({ strokes: T }, done);
  let score = attempt.score;
  if (strokes.length > T.length + 1) score = Math.min(score, 0.72); // beaucoup de traits en trop : pas de trois étoiles
  const stars = score >= 0.78 ? 3 : score >= 0.58 ? 2 : score >= 0.3 ? 1 : 0;
  return { ok: stars >= 2, stars, score, expected: T.length, got: strokes.length, matched, tags: attempt.tags };
}
