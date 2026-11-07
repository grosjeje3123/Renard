// Épaisseur du trait des exercices guidés (le chemin du guide et la trace laissée par le doigt).
//  - « Selon le niveau » (par défaut) : épais au niveau 1, de plus en plus fin ensuite, comme les lignes d'un cahier qui se resserrent.
//  - Les parents peuvent fixer une épaisseur (fin, moyen, épais) pour tous les exercices.
//  - Si l'enfant a du mal, le trait s'épaissit d'un cran (deux au plus), pour cet exercice seulement.
// C'est purement visuel : la tolérance du moteur de reconnaissance ne change pas (voir core/tolerance.js). Un chemin plus
// étroit est donc plus exigeant pour l'œil que pour le moteur : suivre le chemin garantit la réussite, pas l'inverse.

export const EPAISSEURS = [['auto', 'Selon le niveau'], ['fin', 'Fin'], ['moyen', 'Moyen'], ['epais', 'Épais']];

/** Multiplicateur par niveau (1 = l'épaisseur du niveau 2, celle d'origine). */
export const PAR_NIVEAU = { 1: 1.2, 2: 1, 3: 0.8, 4: 0.7 };
const FIXE = { fin: 0.75, moyen: 1, epais: 1.4 };

/** Un cran d'aide = ×1,25 ; deux crans au plus (≈ ×1,56). */
export const CRAN = 1.25;
export const MAX_CRANS = 2;
export const MAX_EPAISSEUR = 1.7;

/**
 * Largeur maximale du chemin (en multiple de l'original) selon le type d'exercice : dans un mot, les lettres voisines
 * ne doivent pas se mélanger ; une lettre cursive a de petites boucles (le « e » se remplirait) ; les formes, les majuscules
 * et les chiffres du niveau 1 sont grands.
 */
const CHEMIN_MAX = { graphisme: 1.5, capitale: 1.2, minuscule: 1.05, word: 1 };
const typeDe = (skill) => (skill.kind === 'letter' ? (skill.capital || skill.chiffre ? 'capitale' : 'minuscule') : skill.kind);

/** Épaisseur de base : celle du niveau, ou celle que les parents ont fixée. */
export function baseEpaisseur(settings = {}, level = 2) {
  const choix = settings.trait || 'auto';
  return choix === 'auto' ? PAR_NIVEAU[level] ?? 0.7 : FIXE[choix] ?? 1;
}

/** L'exercice est-il difficile pour l'enfant ? Trois essais au moins, et moins de 0,55 de moyenne sur les cinq derniers. */
export function peineHistorique(st, skillId) {
  const s = st.skills?.[skillId];
  if (!s || s.mastered || !s.history || s.history.length < 3) return false;
  const last = s.history.slice(-5);
  return last.reduce((a, h) => a + (h.sc ?? 0), 0) / last.length < 0.55;
}

/** Cette séance : un cran après 2 essais ratés (moins de 2 étoiles), deux crans après 5. */
export const peineSeance = (log = []) => {
  const rates = log.filter((l) => l.stars < 2).length;
  return rates >= 5 ? 2 : rates >= 2 ? 1 : 0;
};

/** Nombre de crans d'aide (0 à 2), ou 0 si les parents ont coupé l'aide. */
export function crans(st, skillId, log = []) {
  if (st.settings?.traitAide === false) return 0;
  return Math.min(MAX_CRANS, (peineHistorique(st, skillId) ? 1 : 0) + peineSeance(log));
}

/**
 * Multiplicateurs à appliquer au dessin : `ink` (trace du doigt), `route` (chemin du guide), `aux` (pointillés, flèches,
 * démonstration : ils suivent à moitié pour rester lisibles).
 */
export function epaisseur(st, skill, log = []) {
  const n = crans(st, skill.id, log);
  const ink = Math.min(MAX_EPAISSEUR, baseEpaisseur(st.settings, skill.level) * CRAN ** n);
  const type = typeDe(skill);
  // L'aide élargit un peu le chemin d'une minuscule (les boucles se resserrent, mais l'enfant en a besoin) ; jamais celui d'un mot.
  const route = Math.min(ink, (CHEMIN_MAX[type] ?? 1.2) + (type === 'minuscule' ? 0.08 * n : 0));
  return { ink: round(ink), route: round(route), aux: round(1 + (ink - 1) / 2), crans: n };
}

const round = (x) => Math.round(x * 1000) / 1000;
