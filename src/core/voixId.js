// Voix enregistrées du renard : identifiant stable d'une phrase, et découpage d'un texte en phrases.
// L'application joue le fichier voix/<id>.mp3 s'il existe, sinon elle retombe sur la voix du système.
// Fonctions pures, partagées par l'application et par tools/paroles.mjs (qui produit la liste à enregistrer).

/** Texte « canonique » : espaces ordinaires, un seul blanc entre les mots. */
export const normaliser = (t) => String(t).normalize('NFC').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Découpe en phrases : après . ! ? … suivis d'une majuscule ou d'un guillemet ouvrant. « Bravo ! Tu as réussi. » → 2 phrases. */
export function decouper(texte) {
  const t = normaliser(texte);
  if (!t) return [];
  return t.split(/(?<=[.!?…])\s+(?=[A-ZÀ-ÖØ-ÞŒ«“"(])/u).map((s) => s.trim()).filter(Boolean);
}

/** Identifiant d'une phrase : FNV-1a 32 bits du texte canonique, en 8 caractères hexadécimaux. */
export function idPhrase(phrase) {
  const t = normaliser(phrase);
  let h = 0x811c9dc5;
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
