// Choix de la voix du renard parmi les voix françaises installées sur l'appareil.
// Fonctions pures (testables sans navigateur) : le classement privilégie les voix qui restent
// sur l'appareil (aucun texte envoyé sur Internet) puis les plus naturelles.

/** Voix « plus naturelles » : mots que les systèmes utilisent dans le nom des voix de meilleure qualité. */
const QUALITE = /premium|enhanced|am[ée]lior[ée]e?|natural|neural|naturelle|siri|haute qualit[ée]/i;
/** Voix robotiques connues : à éviter quand il existe autre chose. */
const ROBOT = /espeak|compact|pico|festival|mbrola/i;

export const timbres = { naturel: 1.0, renard: 1.12 };
export const vitesses = { lent: 0.8, normal: 0.92, vif: 1.0 };

/** Une voix du navigateur → description simple, ou null si elle n'est pas française. */
export function describeVoice(v) {
  const lang = String(v.lang || '').replace('_', '-');
  if (!/^fr/i.test(lang)) return null;
  return { name: v.name, lang, local: v.localService !== false, voice: v };
}

/** Note d'une voix : plus c'est haut, mieux c'est. Les voix en ligne reçoivent un malus fort. */
export function scoreVoice(d) {
  let s = 0;
  if (/^fr-FR$/i.test(d.lang)) s += 30;
  else if (/^fr$/i.test(d.lang)) s += 22;
  else s += 8; // fr-CA, fr-BE, fr-CH : acceptables mais accent différent de celui de l'école
  if (d.local) s += 100;
  if (QUALITE.test(d.name)) s += 40;
  if (ROBOT.test(d.name)) s -= 60;
  return s;
}

/** Voix françaises triées de la meilleure à la moins bonne (égalité : ordre alphabétique, stable). */
export function rankVoices(list) {
  return list
    .map(describeVoice)
    .filter(Boolean)
    .map((d) => ({ ...d, score: scoreVoice(d) }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'fr'));
}

/**
 * Voix à utiliser. Un choix explicite des parents l'emporte. Sinon on prend la meilleure voix locale ;
 * s'il n'y en a aucune, on prend quand même la meilleure voix disponible (un enfant de 5 ans ne lit pas
 * les consignes) et l'espace parents l'indique.
 */
export function chooseVoice(list, wanted = '') {
  const ranked = rankVoices(list);
  if (wanted) {
    const w = ranked.find((d) => d.name === wanted);
    if (w) return { ...w, reason: 'choix' };
  }
  const local = ranked.find((d) => d.local);
  if (local) return { ...local, reason: 'auto' };
  if (ranked[0]) return { ...ranked[0], reason: 'enligne' };
  return null;
}

/** Libellé court pour la liste des parents. */
export function voiceLabel(d) {
  const quality = QUALITE.test(d.name) ? ' · plus naturelle' : '';
  return `${d.name} (${d.lang}) — ${d.local ? 'sur l’appareil' : 'en ligne'}${quality}`;
}
