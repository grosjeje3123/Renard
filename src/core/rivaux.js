// Lettres voisines : l'enfant a-t-il écrit une autre lettre que celle demandée ?
// Le moteur compare un tracé au gabarit attendu ; à lui seul, il accepte volontiers un « o » pour un « a » ou un « n » pour un « m »,
// car ces lettres se ressemblent. Ici, on compare aussi le tracé aux autres lettres cursives d'un seul trait : si l'une d'elles
// lui ressemble nettement plus que la lettre demandée, l'essai n'est pas validé et le renard le dit gentiment.
// Seulement quand l'enfant écrit sans suivre le guide plein (pointillés, tout seul, dictée) : sur le guide, il suit un chemin tracé.
import { SKILLS } from '../content/skills.js';
import { parsePath } from '../engine/pathdata.js';
import { resample, resampleN, polyLength, bbox } from '../engine/geometry.js';
import { recognizer } from '../engine/recognizer.js';
import { BOARD } from './board.js';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
/** Il faut que l'autre lettre soit réussie (deux étoiles) et dépasse la lettre demandée d'au moins cette marge. Réglée par simulation (voir test/rivaux.test.js). */
export const MARGE_RIVALE = 0.04;

const corps = {};
/** Le trait unique d'une lettre cursive (incliné, y vers le haut) ; null pour les lettres à plusieurs traits (t, x). */
function corpsDe(l) {
  if (l in corps) return corps[l];
  const paths = (SKILLS[l]?.strokes || []).filter((s) => s.d);
  if (paths.length !== 1) return (corps[l] = null);
  const pts = parsePath(paths[0].d).map((p) => ({ x: p.x + BOARD.slant * p.y, y: p.y }));
  return (corps[l] = { pts, bb: bbox(pts) });
}

const cache = new Map();
/** Les gabarits des autres lettres, posés à la place du trait attendu (même ligne d'écriture, même milieu). */
export function rivaux(tStroke) {
  if (!tStroke || tStroke.kind !== 'path' || tStroke.mark || !tStroke.of || !ALPHABET.includes(tStroke.of) || !corpsDe(tStroke.of)) return [];
  const cx = tStroke.bbox.x0 + tStroke.bbox.w / 2, base = tStroke.base;
  const key = `${tStroke.of}|${cx.toFixed(2)}|${base}`;
  if (cache.has(key)) return cache.get(key);
  const out = [];
  for (const l of ALPHABET) {
    const c = l === tStroke.of ? null : corpsDe(l);
    if (!c) continue;
    const dx = cx - (c.bb.x0 + c.bb.w / 2);
    const pts = resample(c.pts.map((p) => ({ x: p.x + dx, y: base - p.y })), 0.06);
    out.push({ id: l, stroke: { index: tStroke.index, kind: 'path', pts, length: polyLength(pts), start: pts[0], end: pts[pts.length - 1], bbox: bbox(pts), of: l, base } });
  }
  if (cache.size > 400) cache.clear();
  cache.set(key, out);
  return out;
}

// ---- Tri rapide. Une évaluation complète coûte cher (plusieurs dizaines de millisecondes sur une tablette modeste) : on ne peut pas
// en faire vingt-cinq par trait. On compare donc d'abord la silhouette du tracé à celle de chaque lettre (32 points, centrés,
// alignement temporel) : c'est quasi gratuit. Seules les une ou deux lettres qui ressemblent plus au tracé que la lettre demandée
// passent ensuite l'évaluation complète, qui tranche.
const N = 32;
const profils = {};
const centrer = (pts) => {
  const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length, cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  return pts.map((p) => ({ x: p.x - cx, y: p.y - cy }));
};
/** Silhouette d'une lettre dans le repère du cahier (y vers le bas), centrée. */
const profil = (l) => (profils[l] ||= centrer(resampleN(corpsDe(l).pts.map((p) => ({ x: p.x, y: -p.y })), N)));
/** Écart moyen entre deux silhouettes parcourues dans le même sens, du début à la fin (alignement temporel, extrémités fixées). */
export function ecartSilhouette(A, B) {
  const n = A.length, m = B.length;
  let prev = new Float64Array(m), cur = new Float64Array(m);
  const d = (i, j) => Math.hypot(A[i].x - B[j].x, A[i].y - B[j].y);
  prev[0] = d(0, 0);
  for (let j = 1; j < m; j++) prev[j] = prev[j - 1] + d(0, j);
  for (let i = 1; i < n; i++) {
    cur[0] = prev[0] + d(i, 0);
    for (let j = 1; j < m; j++) cur[j] = d(i, j) + Math.min(prev[j], cur[j - 1], prev[j - 1]);
    [prev, cur] = [cur, prev];
  }
  return prev[m - 1] / (n + m);
}
/** Une autre lettre n'est examinée de près que si sa silhouette est au moins aussi proche du tracé que celle de la lettre demandée (à ce facteur près). */
export const SEUIL_SILHOUETTE = 1.0;

/**
 * La lettre que le tracé imite nettement mieux que celle demandée, ou null.
 * `ev` : l'évaluation du tracé contre la lettre demandée ; `ctx` : le contexte du moteur pour cet essai.
 */
export function autreLettre(tStroke, user, ctx, ev, marge = MARGE_RIVALE, seuil = SEUIL_SILHOUETTE) {
  if (!ctx?.align || !ev || ev.score < 0.3) return null; // sur le guide plein, ou tracé sans rapport : rien à comparer
  const liste = rivaux(tStroke);
  const pts = user?.points || [];
  if (!liste.length || pts.length < 4) return null;
  const A = centrer(resampleN(pts, N));
  const cible = ecartSilhouette(A, profil(tStroke.of));
  const proches = liste.map((r) => ({ r, e: ecartSilhouette(A, profil(r.id)) })).filter((x) => x.e < cible * seuil).sort((a, b) => a.e - b.e).slice(0, 2);
  let best = null;
  for (const { r } of proches) {
    const e = recognizer.evaluateStroke(r.stroke, user, ctx);
    if (e.stars >= 2 && e.score >= ev.score + marge && (!best || e.score > best.score)) best = { id: r.id, score: e.score };
  }
  return best;
}

/** L'évaluation corrigée quand une autre lettre a été reconnue : une étoile au plus, et le conseil « on dirait une autre lettre ». */
export function avecRivale(tStroke, user, ctx, ev) {
  const r = autreLettre(tStroke, user, ctx, ev);
  if (!r) return ev;
  const score = Math.min(ev.score, 0.5);
  return { ...ev, score, stars: Math.min(ev.stars, 1), tags: ['autre-lettre', ...ev.tags.filter((t) => t !== 'autre-lettre')], confusion: r.id };
}
