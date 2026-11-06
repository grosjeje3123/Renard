// Les 26 majuscules d'imprimerie (capitales « bâtons »), telles qu'on les apprend d'abord à l'école : de haut en bas et de gauche à droite,
// avec des traits droits et des arrondis simples. Hauteur : 3 interlignes (jusqu'à la ligne du haut, comme la boucle du l).
// Les majuscules cursives, plus complexes, s'apprennent plus tard (CE1).
// Mêmes conventions que les minuscules (lettres.js) : 1 unité = 1 interligne, y vers le haut depuis la ligne d'écriture.
import { P } from './helpers.js';
import { BOARD } from '../core/board.js';

const H = 3;
const cx = 1.2, cy = H / 2, rx = 1.25, ry = H / 2;
const at = (a) => [cx + rx * Math.cos((a * Math.PI) / 180), cy + ry * Math.sin((a * Math.PI) / 180)];
/** Arc d'ellipse de la hauteur d'une majuscule, de a0 à a1 degrés. */
const arc = (a0, a1) => { const [x, y] = at(a0); return new P().M(x, y).arc(cx, cy, rx, ry, a0, a1); };
const line = (...pts) => { const p = new P().M(...pts[0]); for (const q of pts.slice(1)) p.L(...q); return p; };

/** Une panse (P, R, B) : de la tige, vers la droite, et retour à la tige. */
const panse = (y0, y1, w) => new P().M(0.3, y1).L(0.9, y1).C(0.9 + w, y1, 0.9 + w, y0, 0.9, y0).L(0.3, y0);

const T = (...strokes) => strokes.map((p) => ({ d: p.toString() }));

export const MAJUSCULES = {
  A: T(line([0, 0], [1.15, H], [2.3, 0]), line([0.55, 1.0], [1.75, 1.0])),
  B: T(line([0.3, H], [0.3, 0]), new P().M(0.3, H).L(1.0, H).C(2.1, H, 2.1, 1.6, 1.0, 1.6).C(2.5, 1.6, 2.5, 0, 1.0, 0).L(0.3, 0)),
  C: T(arc(40, 320)),
  D: T(line([0.3, H], [0.3, 0]), new P().M(0.3, H).L(0.8, H).C(2.8, H, 2.8, 0, 0.8, 0).L(0.3, 0)),
  E: T(line([0.3, H], [0.3, 0]), line([0.3, H], [2.1, H]), line([0.3, 1.5], [1.8, 1.5]), line([0.3, 0], [2.1, 0])),
  F: T(line([0.3, H], [0.3, 0]), line([0.3, H], [2.1, H]), line([0.3, 1.5], [1.8, 1.5])),
  G: T(arc(40, 360).L(1.3, cy)),
  H: T(line([0.3, H], [0.3, 0]), line([2.1, H], [2.1, 0]), line([0.3, 1.5], [2.1, 1.5])),
  I: T(line([0.9, H], [0.9, 0])),
  J: T(new P().M(1.6, H).L(1.6, 0.9).C(1.6, -0.3, 0.3, -0.3, 0.1, 0.8)),
  K: T(line([0.3, H], [0.3, 0]), line([2.1, H], [0.3, 1.2], [2.2, 0])),
  L: T(line([0.3, H], [0.3, 0]), line([0.3, 0], [2.0, 0])),
  M: T(line([0, 0], [0, H], [1.3, 0.5], [2.6, H], [2.6, 0])),
  N: T(line([0, 0], [0, H], [2.1, 0], [2.1, H])),
  O: T(arc(80, 440)),
  P: T(line([0.3, H], [0.3, 0]), panse(1.4, H, 1.1).L(0.3, 1.4)),
  Q: T(arc(80, 440), line([1.3, 0.9], [2.4, -0.4])),
  R: T(line([0.3, H], [0.3, 0]), panse(1.5, H, 1.1), line([1.0, 1.5], [2.2, 0])),
  S: T(new P().M(2.0, 2.55).C(1.6, 3.15, 0.35, 3.2, 0.3, 2.3).C(0.25, 1.5, 2.05, 1.6, 2.1, 0.7).C(2.15, -0.15, 0.6, -0.2, 0.1, 0.5)),
  T: T(line([0.1, H], [2.3, H]), line([1.2, H], [1.2, 0])),
  U: T(new P().M(0.2, H).L(0.2, 1.0).C(0.2, -0.3, 2.0, -0.3, 2.0, 1.0).L(2.0, H)),
  V: T(line([0.1, H], [1.15, 0], [2.2, H])),
  W: T(line([0, H], [0.7, 0], [1.5, 2.0], [2.3, 0], [3.0, H])),
  X: T(line([0.1, H], [2.2, 0]), line([2.2, H], [0.1, 0])),
  Y: T(line([0.1, H], [1.15, 1.4]), line([2.2, H], [1.15, 1.4], [1.15, 0])),
  Z: T(line([0.2, H], [2.1, H], [0.2, 0], [2.2, 0])),
};

/**
 * Les majuscules sont DROITES (pas penchées comme l'écriture cursive) : or le cahier incline tous les tracés de lettres et de mots
 * (x += pente × y, voir core/template.js). On les « pré-incline » donc en sens inverse (x −= pente × y) : après l'inclinaison du
 * cahier, elles retrouvent exactement leur dessin droit. `upright` dit à composeText de les mesurer dans ce repère final.
 */
const NUM = /[MLCQZ]|-?\d*\.?\d+(?:e-?\d+)?/gi;
const r3 = (v) => String(+v.toFixed(3));
const redresse = (strokes) => strokes.map((st) => {
  if (!st.d) return st;
  const nums = (st.d.match(NUM) || []).filter((t) => !/[MLCQZ]/i.test(t)).map(parseFloat);
  for (let i = 0; i + 1 < nums.length; i += 2) nums[i] -= BOARD.slant * nums[i + 1];
  let k = 0;
  return { ...st, d: st.d.replace(NUM, (t) => (/[MLCQZ]/i.test(t) ? t : r3(nums[k++]))) };
});

/** Registre prêt pour composeText : « A » → { strokes } (tracés pré-inclinés en sens inverse, `upright`). */
export const CAPITALES = Object.fromEntries(Object.entries(MAJUSCULES).map(([id, strokes]) => [id, { id, strokes: redresse(strokes), upright: true }]));
