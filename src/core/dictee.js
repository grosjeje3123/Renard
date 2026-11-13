// Dictée : choix des exercices à dicter et suivi. Une dictée vérifie ce que l'enfant sait déjà écrire sans modèle :
// elle ne change jamais la maîtrise d'un exercice (voir progress.js) et ne donne ni vignette ni accessoire.
import { SKILLS, skillOrder, isWriting, nbLettres } from '../content/skills.js';
import { skillState, isSkillOpen } from './progress.js';

export const DICTEE_N = 5;
/** La dictée surprise, proposée en cours de route (tous les 5 exercices acquis, ou après une série fêtée) : courte. */
export const SURPRISE_N = 3;
export const surpriseOk = (st) => st.settings.dicteeSurprise !== false && !st.settings.demo && !!st.settings.voix && dicteePossible(st);
const MAX_LETTRES_MOT = 8, MAX_LETTRES_PHRASE = 12; // au-delà, le cahier d'une dictée deviendrait trop serré

/**
 * La dictée se complique avec l'enfant : 1 = lettres et chiffres ; 2 = sons et petits mots (3 lettres au plus) ; 3 = mots ;
 * 4 = petites phrases. Toujours parmi ce qu'il a déjà acquis : on ne dicte jamais ce qui n'a pas été appris.
 */
export const DICTEE_PALIERS = { 1: 'des lettres', 2: 'des sons et des petits mots', 3: 'des mots', 4: 'de petites phrases' };
export const palier = (s) => (s.kind === 'letter' ? 1 : s.phrase ? 4 : s.groupe || nbLettres(s.word) <= 3 ? 2 : 3);

const dictable = (id) => {
  const s = SKILLS[id];
  if (!s || !isWriting(s)) return false;
  if (s.kind === 'letter') return true;
  return nbLettres(s.word) <= (s.phrase ? MAX_LETTRES_PHRASE : MAX_LETTRES_MOT);
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

/** Le palier de la prochaine dictée : celui gagné par l'enfant, sans dépasser ce qu'il a appris. */
export function palierDictee(st) {
  const dispo = Math.max(1, ...dicteePool(st).map((id) => palier(SKILLS[id])));
  return Math.min(Math.max(1, st.dicteePalier || 1), dispo);
}

/**
 * Les exercices de cette dictée : surtout ceux du palier en cours (60 %), complétés par des révisions des paliers d'avant ;
 * dans chaque groupe, d'abord ceux qu'on n'a jamais dictés, puis les moins récemment dictés (pas de tirage au sort).
 */
export function dicteeItems(st, n = DICTEE_N) {
  const pool = dicteePool(st), p = palierDictee(st);
  const dernier = (id) => st.dictees?.[id]?.t || 0;
  const tri = (ids) => ids.map((id, i) => ({ id, i })).sort((a, b) => dernier(a.id) - dernier(b.id) || a.i - b.i).map((x) => x.id);
  const actuels = tri(pool.filter((id) => palier(SKILLS[id]) === p));
  const avant = tri(pool.filter((id) => palier(SKILLS[id]) < p));
  const out = actuels.slice(0, p === 1 ? n : Math.ceil(n * 0.6));
  for (const id of [...avant, ...actuels.slice(out.length)]) if (out.length < n && !out.includes(id)) out.push(id);
  // dans l'ordre du plus simple au plus difficile : on commence par une révision
  return out.slice(0, n).sort((x, y) => palier(SKILLS[x]) - palier(SKILLS[y]));
}

/**
 * Bilan d'une dictée : 4 réussites sur 5 (ou 3 sur 3) font monter d'un palier, une seule réussite ou moins fait redescendre.
 * Retourne le nouveau palier s'il a changé, sinon null.
 */
export function bilanDictee(st, etoiles) {
  const faits = etoiles.filter((x) => x != null);
  if (!faits.length) return null;
  const ok = faits.filter((x) => x >= 2).length, avant = palierDictee(st);
  const dispo = Math.max(1, ...dicteePool(st).map((id) => palier(SKILLS[id])));
  let nouveau = avant;
  if (ok >= Math.ceil(faits.length * 0.8) && faits.length >= 3) nouveau = Math.min(4, avant + 1);
  else if (ok <= Math.floor(faits.length * 0.3)) nouveau = Math.max(1, avant - 1);
  st.dicteePalier = nouveau;
  return nouveau !== avant && nouveau <= dispo ? nouveau : null;
}

/** Note le résultat d'une dictée pour un exercice (étoiles de 0 à 3). */
export function recordDictee(st, id, stars, now = Date.now()) {
  st.dictees = st.dictees || {};
  const d = st.dictees[id] || { n: 0, best: 0, last: 0, t: 0 };
  st.dictees[id] = { n: d.n + 1, best: Math.max(d.best, stars), last: stars, t: now };
  return st.dictees[id];
}

export const dicteesFaites = (st) => Object.values(st.dictees || {}).reduce((a, d) => a + d.n, 0);
