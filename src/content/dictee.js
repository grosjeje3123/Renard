// La dictée : le renard dit la lettre, le chiffre ou le mot, l'enfant l'écrit sans modèle.
// Les phrases dites sont construites ici pour que la liste des paroles à enregistrer (tools/paroles.mjs) les connaisse toutes.

/** Le nom des lettres, tel qu'on le dit en classe (et tel qu'une voix de synthèse le prononce sans hésiter). */
export const NOMS_LETTRES = {
  a: 'a', b: 'bé', c: 'cé', d: 'dé', e: 'e', f: 'effe', g: 'gé', h: 'ache', i: 'i', j: 'ji', k: 'ka', l: 'elle', m: 'emme',
  n: 'enne', o: 'o', p: 'pé', q: 'ku', r: 'erre', s: 'esse', t: 'té', u: 'u', v: 'vé', w: 'double vé', x: 'ixe', y: 'i grec', z: 'zède',
};
export const NOMS_CHIFFRES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];

/**
 * Ce que dit le renard pour faire écrire cet exercice (jamais affiché : l'enfant écoute, il ne lit pas la réponse).
 * Pour un mot ou un son, la consigne et le mot sont deux phrases : un silence les sépare comme dans une vraie dictée,
 * et le mot seul est un enregistrement de voix qui sert aussi aux autres mots de la même famille.
 */
export function dicteeDit(skill) {
  if (skill.kind === 'letter') {
    if (skill.chiffre) return `Écris le chiffre « ${NOMS_CHIFFRES[+skill.glyph]} ».`;
    const nom = NOMS_LETTRES[skill.glyph.toLowerCase()];
    return skill.capital ? `Écris la lettre « ${nom} » en majuscule.` : `Écris la lettre « ${nom} ».`;
  }
  if (skill.phrase) return skill.majMot ? `Écris la phrase en majuscules. « ${skill.word.toLowerCase()} ».` : `Écris la phrase. « ${skill.word.toLowerCase()} ».`;
  const mot = `« ${skill.word.toLowerCase()} ».`;
  if (skill.majMot) return `Écris le mot en majuscules. ${mot}`;
  if (skill.groupe) return `Écris le son. ${mot}`;
  return `Écris le mot. ${mot}`;
}

export const DICTEE_INVITE = 'Écoute bien, puis écris !';
export const DICTEE_FIN = 'Bravo ! La dictée est terminée !';
/** Annonce d'un palier gagné (la prochaine dictée sera un peu plus difficile). */
export const DICTEE_MONTE = {
  2: 'Tu es fort ! La prochaine fois, je te dicterai des sons et des petits mots.',
  3: 'Tu es fort ! La prochaine fois, je te dicterai des mots.',
  4: 'Tu es fort ! La prochaine fois, je te dicterai de petites phrases.',
};
export const DICTEE_PAS_ENCORE = 'Réussis d’abord quelques exercices.';
export const DICTEE_SANS_VOIX = 'Remets la voix du renard pour écouter.';
