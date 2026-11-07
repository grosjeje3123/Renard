// Les chiffres de 0 à 9, en écriture d'imprimerie droite, comme on les apprend d'abord à l'école : on part toujours du haut
// pour aller vers le bas (sauf le 1, qui démarre par sa petite pointe en bas à gauche, puis remonte et redescend).
// Hauteur : 3 interlignes (HAUTEUR), comme les majuscules, pour qu'un prénom suivi d'un âge reste harmonieux. Les tracés du 4 (ouvert, en deux traits) et du 5 (le « chapeau » en dernier) suivent
// l'usage le plus courant ; certains modèles d'école diffèrent un peu.
// Mêmes conventions que lettres.js et majuscules.js : 1 unité = 1 interligne, y vers le haut depuis la ligne d'écriture.
import { P } from './helpers.js';
import { redresse } from './majuscules.js';

/** Hauteur finale des chiffres, en interlignes. Les tracés ci-dessous sont dessinés sur 2 de haut, puis étirés. */
export const HAUTEUR = 3;
const H = 2;
const NUM = /[MLCQZ]|-?\d*\.?\d+(?:e-?\d+)?/gi;
const r3 = (v) => String(+v.toFixed(3));
/** Étire un tracé : x × sx, y × sy. */
const etire = (strokes, sx, sy) => strokes.map((st) => {
  const nums = (st.d.match(NUM) || []).filter((t) => !/[MLCQZ]/i.test(t)).map(parseFloat);
  let k = 0;
  return { ...st, d: st.d.replace(NUM, (t) => (/[MLCQZ]/i.test(t) ? t : r3(nums[k] * (k++ % 2 ? sy : sx)))) };
});
const line = (...pts) => { const p = new P().M(...pts[0]); for (const q of pts.slice(1)) p.L(...q); return p; };
const T = (...strokes) => strokes.map((p) => ({ d: p.toString() }));

const BASE = {
  0: T(new P().M(0.75, H).arc(0.75, H / 2, 0.72, H / 2, 90, 450)),
  1: T(line([0.05, 1.3], [0.6, H], [0.6, 0])),
  2: T(new P().M(0.1, 1.55).C(0.2, 2.15, 1.3, 2.3, 1.4, 1.5).C(1.45, 1.05, 0.7, 0.6, 0.05, 0).L(1.55, 0)),
  3: T(new P().M(0.1, 1.7).C(0.25, 2.25, 1.35, 2.3, 1.35, 1.55).C(1.35, 1.15, 0.9, 1.0, 0.55, 1.0).C(1.1, 1.0, 1.55, 0.75, 1.5, 0.4).C(1.4, -0.2, 0.3, -0.2, 0.05, 0.35)),
  4: T(line([1.2, H], [0.05, 0.55], [1.55, 0.55]), line([1.2, H], [1.2, 0])),
  5: T(new P().M(0.2, H).L(0.1, 1.05).C(0.55, 1.35, 1.5, 1.3, 1.5, 0.65).C(1.5, 0, 0.5, -0.15, 0, 0.25), line([0.2, H], [1.4, H])),
  6: T(new P().M(1.2, H).C(0.5, 1.8, 0.05, 1.1, 0.05, 0.65).C(0.05, -0.15, 1.5, -0.2, 1.5, 0.55).C(1.5, 1.2, 0.55, 1.35, 0.1, 0.75)),
  7: T(line([0.05, H], [1.45, H], [0.5, 0])),
  8: T(new P().M(1.15, 1.65).C(1.2, 2.3, 0.1, 2.3, 0.1, 1.55).C(0.1, 1.0, 1.5, 0.95, 1.5, 0.45).C(1.5, -0.2, 0.05, -0.2, 0.05, 0.45).C(0.05, 1.0, 1.15, 1.05, 1.15, 1.65)),
  9: T(new P().M(1.45, 1.55).C(1.45, 2.3, 0.05, 2.3, 0.05, 1.4).C(0.05, 0.85, 1.1, 0.75, 1.45, 1.25).L(1.45, 0.6).C(1.45, 0.1, 0.9, 0, 0.3, 0.15)),
};

export const CHIFFRES_TRACES = Object.fromEntries(Object.entries(BASE).map(([k, st]) => [k, etire(st, 1.12, HAUTEUR / H)]));

/** Registre prêt pour composeText : « 5 » → { strokes } (pré-inclinés en sens inverse, comme les majuscules : le cahier les redresse). */
export const CHIFFRES = Object.fromEntries(Object.entries(CHIFFRES_TRACES).map(([id, strokes]) => [id, { id, strokes: redresse(strokes), upright: true }]));
