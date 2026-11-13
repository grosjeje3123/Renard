// Modèles du dessin libre : des dessins très simples, faits de ronds, de traits droits et de courbes
// (les formes apprises au niveau 1), que l'enfant peut regarder à côté de la feuille ou faire apparaître en pointillés
// sur la feuille pour les suivre. Aucun modèle n'est jugé ni noté.
// Coordonnées : celles de la feuille de dessin (10 de large, 7 de haut, y vers le bas).
import { parsePath } from '../engine/pathdata.js';

export const TRAITS = { brun: '#4A2F22', rouge: '#E5392F', orange: '#F08A24', jaune: '#F4C84A', vert: '#4E9A63', bleu: '#4A8FD6', violet: '#8B6FD6' };

const f = (n) => String(Math.round(n * 100) / 100);
const circle = (cx, cy, r, c) => ({ type: 'ellipse', cx, cy, rx: r, ry: r, c });
const ellipse = (cx, cy, rx, ry, c) => ({ type: 'ellipse', cx, cy, rx, ry, c });
const poly = (pts, c, closed = false) => ({ type: 'poly', pts, c, closed });
const path = (d, c) => ({ type: 'path', d, c });

/** Chemin SVG d'une pièce (ellipse = deux arcs ; polyligne ; chemin libre déjà en M L C Q). */
export function partPath(p) {
  if (p.type === 'ellipse') return `M ${f(p.cx - p.rx)} ${f(p.cy)} A ${f(p.rx)} ${f(p.ry)} 0 1 0 ${f(p.cx + p.rx)} ${f(p.cy)} A ${f(p.rx)} ${f(p.ry)} 0 1 0 ${f(p.cx - p.rx)} ${f(p.cy)} Z`;
  if (p.type === 'poly') return `M ${p.pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L ')}${p.closed ? ' Z' : ''}`;
  return p.d;
}

/** Rectangle englobant d'un modèle (pour vérifier qu'il tient sur la feuille). */
export function bounds(model) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const add = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
  for (const p of model.parts) {
    if (p.type === 'ellipse') { add(p.cx - p.rx, p.cy - p.ry); add(p.cx + p.rx, p.cy + p.ry); }
    else if (p.type === 'poly') p.pts.forEach(([x, y]) => add(x, y));
    else parsePath(p.d).forEach((q) => add(q.x, q.y));
  }
  return { x0, y0, x1, y1 };
}

const rays = (cx, cy, r0, r1, n, c) => Array.from({ length: n }, (_, k) => {
  const a = (k * 2 * Math.PI) / n;
  return poly([[cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)], [cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)]], c);
});
const petals = (cx, cy, d, r, n, c) => Array.from({ length: n }, (_, k) => circle(cx + d * Math.cos((k * 2 * Math.PI) / n - Math.PI / 2), cy + d * Math.sin((k * 2 * Math.PI) / n - Math.PI / 2), r, c));
const spiral = (cx, cy, r0, k, turns, c) => {
  const pts = [];
  for (let t = 0; t <= turns * 2 * Math.PI; t += 0.25) pts.push([cx + (r0 + k * t) * Math.cos(t), cy - (r0 + k * t) * Math.sin(t)]);
  return poly(pts, c);
};

/**
 * Difficulté (tier) : 1 = ronds et traits droits ; 2 = formes composées (carrés, triangles, courbes) ; 3 = dessins détaillés ;
 * 4 = animaux de la campagne pour les grands (renard, hérisson, chouette, lapin, poule).
 * `ask` : ce que dit le renard quand le dessin est « à lui » (sa maison, sa voiture…).
 */
export const DESSINS = [
  { id: 'maison', tier: 2, phrase: 'une maison', parts: [
    poly([[3.4, 6], [3.4, 3.5], [6.6, 3.5], [6.6, 6]], 'orange'),
    poly([[3, 3.5], [5, 1.6], [7, 3.5]], 'rouge', true),
    poly([[4.5, 6], [4.5, 4.6], [5.3, 4.6], [5.3, 6]], 'brun'),
    poly([[5.8, 4.2], [6.3, 4.2], [6.3, 4.8], [5.8, 4.8]], 'bleu', true),
  ] },
  { id: 'soleil', tier: 1, phrase: 'le soleil', parts: [
    circle(5, 3.5, 1, 'orange'),
    ...rays(5, 3.5, 1.45, 2.15, 8, 'orange'),
  ] },
  { id: 'arbre', tier: 1, phrase: 'un arbre', parts: [
    poly([[4.45, 6.1], [4.45, 4.4], [5.55, 4.4], [5.55, 6.1]], 'brun'),
    circle(5, 3, 1.5, 'vert'),
    poly([[3.4, 6.1], [6.6, 6.1]], 'vert'),
  ] },
  { id: 'poisson', tier: 2, phrase: 'un poisson dans l’eau', parts: [
    ellipse(4.5, 3.5, 2, 1.25, 'bleu'),
    poly([[6.4, 3.5], [8, 2.2], [8, 4.8]], 'bleu', true),
    circle(3.3, 3.2, 0.16, 'brun'),
    path('M 4.4 2.3 Q 5.2 1.5 5.6 2.4', 'bleu'),
    circle(2.2, 2, 0.2, 'bleu'), circle(1.8, 1.35, 0.14, 'bleu'),
  ] },
  { id: 'fleur', tier: 2, phrase: 'une fleur', parts: [
    path('M 5 6.4 L 5 4.5', 'vert'),
    path('M 5 5.5 C 5.7 4.7 6.5 4.8 6.8 5.2 C 6.3 5.8 5.5 5.8 5 5.5', 'vert'),
    ...petals(5, 2.9, 1, 0.62, 6, 'rouge'),
    circle(5, 2.9, 0.42, 'jaune'),
  ] },
  { id: 'escargot', tier: 3, phrase: 'un escargot', parts: [
    spiral(4.9, 4.25, 0.12, 0.15, 1.6, 'orange'),
    path('M 2.4 5.9 L 6.9 5.9 C 7.6 5.9 7.8 5.2 7.5 4.6 C 7.4 4.3 7.4 4 7.5 3.7', 'vert'),
    poly([[7.5, 3.7], [7.3, 3]], 'vert'), poly([[7.6, 3.8], [8.1, 3.2]], 'vert'),
  ] },
  { id: 'pluie', tier: 2, phrase: 'la pluie', parts: [
    path('M 3.2 3.8 C 2 3.8 2 2.4 3.3 2.4 C 3.5 1.2 5.2 1 5.7 2.1 C 6.6 1.6 7.8 2.2 7.6 3.1 C 8.6 3.3 8.4 3.8 7.4 3.8 Z', 'bleu'),
    poly([[3.9, 4.6], [3.7, 5.3]], 'bleu'), poly([[5.1, 4.6], [4.9, 5.3]], 'bleu'), poly([[6.3, 4.6], [6.1, 5.3]], 'bleu'),
    poly([[4.5, 5.6], [4.3, 6.3]], 'bleu'), poly([[5.7, 5.6], [5.5, 6.3]], 'bleu'),
  ] },
  { id: 'chat', tier: 3, phrase: 'un chat', parts: [
    circle(5, 3.9, 1.6, 'orange'),
    poly([[3.75, 2.95], [3.55, 1.2], [4.8, 2.35]], 'orange'),
    poly([[6.25, 2.95], [6.45, 1.2], [5.2, 2.35]], 'orange'),
    circle(4.35, 3.6, 0.18, 'brun'), circle(5.65, 3.6, 0.18, 'brun'),
    poly([[4.85, 4.2], [5.15, 4.2], [5, 4.4]], 'rouge', true),
    path('M 5 4.4 L 5 4.65 Q 4.6 5 4.3 4.8 M 5 4.65 Q 5.4 5 5.7 4.8', 'brun'),
    poly([[3.5, 4.2], [2.4, 3.9]], 'brun'), poly([[3.5, 4.5], [2.4, 4.6]], 'brun'),
    poly([[6.5, 4.2], [7.6, 3.9]], 'brun'), poly([[6.5, 4.5], [7.6, 4.6]], 'brun'),
  ] },
  { id: 'montagne', tier: 2, phrase: 'une montagne', parts: [
    poly([[1.5, 6], [3.9, 2.2], [5.2, 4], [6.3, 2.9], [8.5, 6]], 'violet', true),
    circle(7.7, 1.5, 0.5, 'orange'),
  ] },
  { id: 'ballon', tier: 1, phrase: 'un ballon', parts: [
    ellipse(5, 3, 1.35, 1.65, 'rouge'),
    poly([[4.8, 4.95], [5.2, 4.95], [5, 4.62]], 'rouge', true),
    path('M 5 4.95 C 4.3 5.4 5.7 5.8 5 6.3', 'brun'),
  ] },
  { id: 'neige', tier: 2, phrase: 'un bonhomme de neige', parts: [
    circle(5, 5, 1, 'bleu'), circle(5, 3.35, 0.78, 'bleu'), circle(5, 2, 0.55, 'bleu'),
    poly([[4.4, 1.55], [5.6, 1.55], [5.45, 0.65], [4.55, 0.65]], 'brun', true),
    poly([[4.2, 1.55], [5.8, 1.55]], 'brun'),
    circle(4.8, 1.9, 0.06, 'brun'), circle(5.2, 1.9, 0.06, 'brun'),
    poly([[5, 2.05], [5.7, 2.2], [5, 2.3]], 'orange', true),
    circle(5, 3.2, 0.07, 'brun'), circle(5, 3.6, 0.07, 'brun'),
    poly([[4.25, 3.2], [3.2, 2.5]], 'brun'), poly([[5.75, 3.2], [6.8, 2.5]], 'brun'),
  ] },
  { id: 'cerf-volant', tier: 1, phrase: 'le cerf-volant de Renard', ask: 'Renard veut jouer avec son cerf-volant. Tu le dessines ?', parts: [
    poly([[5, 1], [6.4, 2.6], [5, 4.2], [3.6, 2.6]], 'rouge', true),
    poly([[5, 1], [5, 4.2]], 'orange'), poly([[3.6, 2.6], [6.4, 2.6]], 'orange'),
    path('M 5 4.2 C 4 4.9 6 5.4 5 6', 'brun'),
  ] },
  { id: 'bateau', tier: 2, phrase: 'le bateau de Renard', ask: 'Renard part en bateau sur la rivière ! Tu le dessines ?', parts: [
    poly([[2.8, 4.6], [7.2, 4.6], [6.4, 5.8], [3.6, 5.8]], 'brun', true),
    poly([[5, 4.6], [5, 1.4]], 'brun'),
    poly([[5.15, 1.6], [6.9, 4.2], [5.15, 4.2]], 'rouge', true),
    poly([[4.85, 2.4], [3.4, 4.2], [4.85, 4.2]], 'orange', true),
    path('M 1.8 6.3 Q 2.5 5.8 3.2 6.3 Q 3.9 6.8 4.6 6.3 Q 5.3 5.8 6 6.3 Q 6.7 6.8 7.4 6.3', 'bleu'),
  ] },
  { id: 'voiture', tier: 3, phrase: 'la voiture de Renard', ask: 'Renard a besoin de sa voiture. Tu la dessines ?', parts: [
    path('M 1.8 5 L 1.8 3.9 C 1.8 3.6 2 3.5 2.3 3.5 L 3.3 3.5 L 4 2.4 L 6.2 2.4 L 6.9 3.5 L 7.7 3.5 C 8 3.5 8.2 3.6 8.2 3.9 L 8.2 5 Z', 'rouge'),
    poly([[3.9, 3.5], [4.4, 2.7], [5, 2.7], [5, 3.5]], 'bleu', true),
    poly([[5.3, 3.5], [5.3, 2.7], [5.9, 2.7], [6.3, 3.5]], 'bleu', true),
    circle(3.3, 5, 0.72, 'brun'), circle(6.7, 5, 0.72, 'brun'),
    circle(8, 4.1, 0.15, 'orange'),
    poly([[1.2, 5.78], [8.8, 5.78]], 'vert'),
  ] },
  { id: 'maison-renard', tier: 3, phrase: 'la maison de Renard', ask: 'Où habite Renard ? Dessine sa maison !', parts: [
    poly([[3.2, 6.1], [3.2, 3.4], [6.8, 3.4], [6.8, 6.1]], 'orange'),
    poly([[2.8, 3.4], [5, 1.6], [7.2, 3.4]], 'rouge', true),
    poly([[6, 2.42], [6, 1.2], [6.6, 1.2], [6.6, 2.91]], 'brun'),
    path('M 6.3 1.05 C 5.95 0.85 6.65 0.75 6.3 0.55', 'violet'),
    circle(4, 4.4, 0.45, 'bleu'),
    poly([[5, 6.1], [5, 4.5], [6, 4.5], [6, 6.1]], 'brun'),
    circle(5.8, 5.4, 0.06, 'orange'),
    poly([[2.4, 6.1], [7.6, 6.1]], 'vert'),
  ] },
  // Pour les grands : des animaux de la campagne plus élaborés (plus de traits, des courbes, des détails).
  { id: 'renard-assis', tier: 4, phrase: 'Renard assis dans l’herbe', ask: 'Et si tu dessinais Renard lui-même ?', parts: [
    path('M 3.6 2.2 Q 5 1.6 6.4 2.2 L 5 3.6 Z', 'orange'),
    poly([[3.7, 2.15], [3.9, 1], [4.5, 1.85]], 'orange', true),
    poly([[6.3, 2.15], [6.1, 1], [5.5, 1.85]], 'orange', true),
    circle(4.5, 2.5, 0.1, 'brun'), circle(5.5, 2.5, 0.1, 'brun'), circle(5, 3.45, 0.13, 'brun'),
    path('M 4.3 3.4 C 3.6 4.2 3.5 5.6 4 6.2 L 6 6.2 C 6.5 5.6 6.4 4.2 5.7 3.4', 'orange'),
    path('M 4.6 3.75 Q 5 5.1 5.4 3.75', 'jaune'),
    poly([[4.6, 5.4], [4.6, 6.2]], 'brun'), poly([[5.4, 5.4], [5.4, 6.2]], 'brun'),
    path('M 6 6.1 C 7.5 6.3 8.4 5.2 7.8 4.2 C 7.5 4.9 7 5.3 6.3 5.4', 'orange'),
    path('M 7.8 4.2 C 8.05 4.5 8.1 4.8 7.95 5.1', 'jaune'),
    poly([[2, 6.35], [8.6, 6.35]], 'vert'),
  ] },
  { id: 'herisson', tier: 4, phrase: 'un hérisson et sa pomme', parts: [
    poly([[2.6, 4.6], [2.6, 3.6], [3.2, 3.9], [3.5, 3], [4, 3.4], [4.5, 2.6], [4.9, 3.2], [5.5, 2.5], [5.8, 3.1], [6.4, 2.7], [6.6, 3.4], [7.2, 3.2], [7.2, 3.9], [7.8, 4]], 'brun'),
    path('M 2.6 4.6 C 2.8 5.3 3.4 5.4 7.6 5.3', 'brun'),
    path('M 7.8 4 C 8.6 4.3 9 4.7 9.1 5 L 7.6 5.3', 'orange'),
    circle(9.1, 5, 0.12, 'brun'), circle(8.15, 4.5, 0.09, 'brun'),
    poly([[3.6, 5.35], [3.5, 5.8]], 'brun'), poly([[4.6, 5.35], [4.6, 5.8]], 'brun'),
    poly([[6.2, 5.33], [6.2, 5.8]], 'brun'), poly([[7, 5.3], [7.1, 5.8]], 'brun'),
    circle(5, 2.05, 0.45, 'rouge'), poly([[5, 1.6], [5.1, 1.3]], 'vert'),
    path('M 5.1 1.4 Q 5.5 1.2 5.6 1.5 Q 5.3 1.6 5.1 1.4', 'vert'),
    poly([[1.5, 5.85], [9.5, 5.85]], 'vert'),
  ] },
  { id: 'chouette', tier: 4, phrase: 'une chouette sur sa branche', parts: [
    ellipse(5, 3.9, 1.6, 2, 'brun'),
    poly([[3.8, 2.4], [3.7, 1.5], [4.4, 2]], 'brun', true), poly([[6.2, 2.4], [6.3, 1.5], [5.6, 2]], 'brun', true),
    circle(4.35, 3, 0.55, 'jaune'), circle(5.65, 3, 0.55, 'jaune'),
    circle(4.35, 3, 0.18, 'brun'), circle(5.65, 3, 0.18, 'brun'),
    poly([[4.85, 3.4], [5.15, 3.4], [5, 3.8]], 'orange', true),
    path('M 4.3 4.4 Q 4.5 4.7 4.7 4.4 Q 4.9 4.7 5.1 4.4 Q 5.3 4.7 5.5 4.4 Q 5.7 4.7 5.9 4.4', 'orange'),
    path('M 4.5 4.95 Q 4.7 5.25 4.9 4.95 Q 5.1 5.25 5.3 4.95 Q 5.5 5.25 5.7 4.95', 'orange'),
    path('M 3.5 3.6 C 3 4.3 3.2 5.2 3.8 5.6', 'brun'), path('M 6.5 3.6 C 7 4.3 6.8 5.2 6.2 5.6', 'brun'),
    poly([[1.5, 6], [8.5, 6]], 'brun'),
    poly([[4.5, 5.8], [4.5, 6.15]], 'orange'), poly([[5.5, 5.8], [5.5, 6.15]], 'orange'),
    circle(8.3, 1.2, 0.5, 'jaune'),
  ] },
  { id: 'lapin', tier: 4, phrase: 'un lapin et sa carotte', parts: [
    circle(4, 3, 0.85, 'brun'),
    ellipse(3.7, 1.4, 0.25, 0.8, 'brun'), ellipse(4.3, 1.4, 0.25, 0.8, 'brun'),
    ellipse(5.2, 4.9, 1.7, 1.25, 'brun'),
    circle(6.95, 4.65, 0.35, 'jaune'),
    circle(3.75, 2.9, 0.1, 'brun'), circle(3.2, 3.25, 0.1, 'rouge'),
    poly([[3.2, 3.3], [2.4, 3.1]], 'brun'), poly([[3.2, 3.38], [2.4, 3.55]], 'brun'),
    poly([[4.2, 5.5], [4.2, 6.1]], 'brun'), ellipse(5.6, 6.05, 0.7, 0.2, 'brun'),
    poly([[2, 5.2], [2.6, 6.2], [2.9, 5]], 'orange', true),
    poly([[2.45, 5.05], [2.3, 4.6]], 'vert'), poly([[2.5, 5.05], [2.7, 4.55]], 'vert'),
    poly([[1.5, 6.4], [8.5, 6.4]], 'vert'),
  ] },
  { id: 'poule', tier: 4, phrase: 'une poule qui picore', parts: [
    path('M 3.4 2.6 C 3.6 3.2 4.2 3.6 4.8 3.6 C 5.8 3.6 6.6 3.2 7.2 2.2 C 7.6 2.8 7.6 3.6 7.2 4.6 C 6.5 6.2 3 5.8 3 4.2', 'orange'),
    circle(3.3, 2.5, 0.6, 'orange'),
    path('M 2.9 2 Q 3 1.5 3.25 1.9 Q 3.4 1.4 3.6 1.9 Q 3.8 1.6 3.85 2.1', 'rouge'),
    poly([[2.75, 2.45], [2.3, 2.62], [2.75, 2.8]], 'jaune', true),
    path('M 2.8 2.9 Q 2.75 3.3 2.95 3.25', 'rouge'),
    circle(3.2, 2.4, 0.09, 'brun'),
    path('M 4.6 4.3 C 5.4 4 6.2 4.3 6.4 4.8 C 5.8 5.2 5 5.1 4.6 4.3', 'brun'),
    poly([[4.6, 5.65], [4.6, 6.3]], 'jaune'), poly([[5.4, 5.7], [5.4, 6.3]], 'jaune'),
    poly([[4.3, 6.3], [4.9, 6.3]], 'jaune'), poly([[5.1, 6.3], [5.7, 6.3]], 'jaune'),
    circle(2.4, 6.1, 0.07, 'jaune'), circle(2, 5.95, 0.07, 'jaune'), circle(1.7, 6.2, 0.07, 'jaune'),
    poly([[1.5, 6.5], [8.5, 6.5]], 'vert'),
  ] },
];

export const NIVEAUX_DESSIN = { 1: 'Facile', 2: 'Moyen', 3: 'Difficile', 4: 'Pour les grands' };
/**
 * Difficulté ouverte selon la progression : exercices acquis (3 → modèles composés, 7 → modèles détaillés, 20 → animaux pour les grands).
 * Le mode démonstration ouvre tout. Aucune obligation : l'enfant dessine ce qu'il veut, le modèle n'est qu'une aide.
 */
export const tierFor = (acquis, demo = false) => (demo || acquis >= 20 ? 4 : acquis >= 7 ? 3 : acquis >= 3 ? 2 : 1);

/** Idées sans modèle : l'enfant invente. */
export const IDEES_LIBRES = ['ton animal préféré', 'ta famille', 'ton jouet préféré'];

/** Les modèles du plus simple au plus compliqué : par difficulté, puis par nombre de traits. */
export const DESSINS_TRIES = DESSINS.slice().sort((a, b) => a.tier - b.tier || a.parts.length - b.parts.length);

/** La suite d'idées proposée jusqu'à la difficulté `tier` : les modèles ouverts du plus simple au plus compliqué, puis les idées libres. */
export const suiteIdees = (tier) => [
  ...DESSINS_TRIES.filter((m) => m.tier <= tier).map((model) => ({ model, phrase: model.phrase })),
  ...IDEES_LIBRES.map((phrase) => ({ phrase })),
];

/**
 * L'idée qui suit `vu` (la phrase de la dernière idée montrée) dans la suite ; sans idée vue, la plus simple ; au bout, on recommence.
 * `reprendre` : on garde l'idée `vu` elle-même (on rouvre l'écran là où l'enfant s'était arrêté).
 */
export function ideeSuivante(tier, vu = '', { reprendre = false } = {}) {
  const suite = suiteIdees(tier);
  const i = suite.findIndex((x) => x.phrase === vu);
  if (i < 0) return suite[0];
  return reprendre ? suite[i] : suite[(i + 1) % suite.length];
}

/** Le modèle en SVG (couleurs conseillées si colors = true, sinon pointillés pâles pour décalquer sur la feuille). */
export function modelGroup(model, { dotted = false } = {}) {
  const attrs = dotted
    ? 'fill="none" stroke-opacity=".9" stroke-width=".12" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray=".01 .24"'
    : 'fill="none" stroke-width=".13" stroke-linecap="round" stroke-linejoin="round"';
  // Le calque garde les couleurs de la vignette (le jaune est un peu plus soutenu pour se voir en pointillés sur la feuille crème).
  return model.parts.map((p) => `<path d="${partPath(p)}" ${attrs} stroke="${dotted ? CALQUE_TONS[p.c] || TRAITS[p.c] : TRAITS[p.c]}"/>`).join('');
}
const CALQUE_TONS = { jaune: '#E0A81B' };
