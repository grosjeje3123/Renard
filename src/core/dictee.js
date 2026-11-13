// Dictée : choix des exercices à dicter et suivi. Une dictée vérifie ce que l'enfant sait déjà écrire sans modèle :
// elle ne change jamais la maîtrise d'un exercice (voir progress.js) et ne donne ni vignette ni accessoire.
import { SKILLS, skillOrder, isWriting, nbLettres } from '../content/skills.js';
import { skillState, isSkillOpen } from './progress.js';

export const DICTEE_N = 5;
/** La dictée surprise, proposée en cours de route (tous les 5 exercices acquis, ou après une série fêtée) : courte. */
export const SURPRISE_N = 3;
export const surpriseOk = (st) => st.settings.dicteeSurprise !== false && !st.settings.demo && !!st.settings.voix && dicteePossible(st);
const MAX_LETTRES_MOT = 5; // un mot plus long ferait un cahier trop réduit pour une dictée

const dictable = (id) => {
  const s = SKILLS[id];
  return !!s && isWriting(s) && !s.phrase && (s.kind === 'letter' || nbLettres(s.word) <= MAX_LETTRES_MOT);
};

/** Exercices que l'enfant sait déjà : les acquis ; à défaut, ceux qu'il a essayés ; en démonstration, tous ceux qui sont ouverts. */
export function dicteePool(st) {
  const all = skillOrder.filter(dictable);
  let pool = all.filter((id) => skillState(st, id).mastered);
  if (pool.length < 3) pool = all.filter((id) => skillState(st, id).sessions > 0);
  if (pool.length < 3 && st.settings?.demo) pool = all.filter((id) => isSkillOpen(st, id));
  return pool;
}

export const dicteePossible = (st) => dicteePool(st).length >= 2;

/**
 * Les exercices de cette dictée : d'abord ceux qu'on n'a jamais dictés, puis les moins récemment dictés (pas de tirage au sort :
 * la répétition est espacée) ; mélange de lettres (3 au plus) et de mots (2 au plus) quand il y en a.
 */
export function dicteeItems(st, n = DICTEE_N) {
  const pool = dicteePool(st);
  const dernier = (id) => st.dictees?.[id]?.t || 0;
  const tri = (ids) => ids.map((id, i) => ({ id, i })).sort((a, b) => dernier(a.id) - dernier(b.id) || a.i - b.i).map((x) => x.id);
  const lettres = tri(pool.filter((id) => SKILLS[id].kind === 'letter'));
  const mots = tri(pool.filter((id) => SKILLS[id].kind === 'word'));
  const out = [...lettres.slice(0, 3), ...mots.slice(0, 2)];
  for (const id of [...lettres.slice(3), ...mots.slice(2)]) if (out.length < n) out.push(id);
  return out.slice(0, n);
}

/** Note le résultat d'une dictée pour un exercice (étoiles de 0 à 3). */
export function recordDictee(st, id, stars, now = Date.now()) {
  st.dictees = st.dictees || {};
  const d = st.dictees[id] || { n: 0, best: 0, last: 0, t: 0 };
  st.dictees[id] = { n: d.n + 1, best: Math.max(d.best, stars), last: stars, t: now };
  return st.dictees[id];
}

export const dicteesFaites = (st) => Object.values(st.dictees || {}).reduce((a, d) => a + d.n, 0);
