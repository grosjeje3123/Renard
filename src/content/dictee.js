// La dictée : le renard dit la lettre, le chiffre, le mot ou la phrase, l'enfant l'écrit sans modèle.
// Les phrases dites sont construites ici pour que la liste des paroles à enregistrer (tools/paroles.mjs) les connaisse toutes.

/** Le nom des lettres, tel qu'on le dit en classe (et tel qu'une voix de synthèse le prononce sans hésiter). */
export const NOMS_LETTRES = {
  a: 'a', b: 'bé', c: 'cé', d: 'dé', e: 'e', f: 'effe', g: 'gé', h: 'ache', i: 'i', j: 'ji', k: 'ka', l: 'elle', m: 'emme',
  n: 'enne', o: 'o', p: 'pé', q: 'ku', r: 'erre', s: 'esse', t: 'té', u: 'u', v: 'vé', w: 'double vé', x: 'ixe', y: 'i grec', z: 'zède',
};
import { isWriting, nbLettres } from './skills.js';
export const NOMS_CHIFFRES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];

/** Au-delà, le cahier d'une dictée deviendrait trop serré. */
export const DICTEE_MAX_MOT = 8, DICTEE_MAX_PHRASE = 12;
/** En dessous, un mot dit seul n'est plus qu'une syllabe (« il », « la », « roi ») : trop court pour être compris à coup sûr à l'oreille. */
export const DICTEE_MIN_MOT = 4;

/**
 * Ce qui se dicte : les lettres, les chiffres, les mots de 4 à 8 lettres et les petites phrases.
 * Jamais un graphisme, jamais un son seul (« in », « on », « gn » : une syllabe isolée se comprend mal, et plusieurs écritures
 * font le même son), jamais un mot de moins de quatre lettres.
 */
export function seDicte(skill) {
  if (!skill || !isWriting(skill)) return false;
  if (skill.kind === 'letter') return true;
  if (skill.groupe) return false;
  const n = nbLettres(skill.word);
  return skill.phrase ? n <= DICTEE_MAX_PHRASE : n >= DICTEE_MIN_MOT && n <= DICTEE_MAX_MOT;
}

/**
 * Ce que dit le renard pour faire écrire cet exercice (jamais affiché : l'enfant écoute, il ne lit pas la réponse).
 * Un mot ou une petite phrase est toujours dit dans la consigne (« Écris le mot maman. »), d'une seule traite : une voix de
 * synthèse prononce nettement un mot porté par une phrase, beaucoup moins bien un mot lancé tout seul.
 */
export function dicteeDit(skill) {
  if (skill.kind === 'letter') {
    if (skill.chiffre) return `Écris le chiffre « ${NOMS_CHIFFRES[+skill.glyph]} ».`;
    const nom = NOMS_LETTRES[skill.glyph.toLowerCase()];
    return skill.capital ? `Écris la lettre « ${nom} » en majuscule.` : `Écris la lettre « ${nom} ».`;
  }
  const mot = `« ${skill.word.toLowerCase()} »`;
  if (skill.phrase) return skill.majMot ? `Écris la phrase ${mot} en majuscules.` : `Écris la phrase ${mot}.`;
  return skill.majMot ? `Écris le mot ${mot} en majuscules.` : `Écris le mot ${mot}.`;
}

export const DICTEE_INVITE = 'Écoute bien, puis écris !';
export const DICTEE_FIN = 'Bravo ! La dictée est terminée !';
/** Annonce d'un palier gagné (la prochaine dictée sera un peu plus difficile). */
export const DICTEE_MONTE = {
  2: 'Tu es fort ! La prochaine fois, je te dicterai de petits mots.',
  3: 'Tu es fort ! La prochaine fois, je te dicterai des mots plus longs.',
  4: 'Tu es fort ! La prochaine fois, je te dicterai de petites phrases.',
};
export const DICTEE_PAS_ENCORE = 'Réussis d’abord quelques exercices.';
export const DICTEE_SANS_VOIX = 'Remets la voix du renard pour écouter.';
