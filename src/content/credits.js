// Crédits de l'application (données) : à relire et corriger ici, sans toucher à l'interface.
// `voixIA` et `voixSysteme` : seul l'un des deux s'affiche, selon que des voix enregistrées sont livrées ou non.

/** [titre, [paragraphes]] */
export const CREDITS = [
  ['L’idée', [
    'Renard accompagne les enfants de 4 à 8 ans dans leurs premiers gestes d’écriture : les formes, les majuscules, les lettres attachées, puis les mots et les phrases.',
    'Une application imaginée et dirigée par Jérôme Hosdez, pour apprendre à écrire sans pression : jamais de note, jamais de perte.',
  ]],
  ['Qui a créé Renard ?', [
    'Renard a été conçu par un parent, enseignant et chercheur, pour apprendre à écrire pas à pas, avec plaisir et sans pression.',
    'Normalien, docteur en mécanique et chercheur-ingénieur, Jérôme Hosdez a consacré une partie de son parcours à l’enseignement et à la transmission des connaissances. Avec Renard, il met cette expérience au service d’un apprentissage fondamental : apprendre à écrire, progressivement, avec plaisir et confiance.',
    'Sans publicité, sans compte, sans achat intégré : rien ne quitte la tablette.',
  ]],
  ['La fabrication', [
    'Programmation, dessins et sons réalisés avec Claude, l’assistant d’intelligence artificielle d’Anthropic, sous la direction de Jérôme Hosdez.',
  ]],
  ['Les dessins', [
    'Le renard, les animaux de l’album, la forêt et tous les modèles de dessin sont des illustrations originales, créées pour l’application. Aucune banque d’images n’a été utilisée.',
  ]],
  ['Les lettres', [
    'Les tracés suivent les modèles d’écriture enseignés à l’école en France : l’écriture cursive pour les minuscules, les capitales d’imprimerie pour les majuscules. Ils ont été dessinés pour Renard.',
  ]],
  ['La musique et les sons', [
    'La petite mélodie de marimba et tous les sons sont fabriqués par l’application elle-même, note après note. Aucun enregistrement, aucun fichier audio.',
  ]],
  ['La voix du renard', {
    voixIA: ['Les voix du renard sont des voix de synthèse, générées par une intelligence artificielle : ce ne sont pas les voix d’une personne. Quand une phrase n’a pas été préparée (un prénom, par exemple), le renard utilise la voix française de la tablette.', 'Synthèse vocale libre Piper (Rhasspy, licence MIT), voix française « siwis » entraînée sur le corpus SIWIS de l’université d’Édimbourg (licence CC BY 4.0).'],
    voixSysteme: ['Le renard parle avec la voix française de la tablette (la synthèse vocale du système). S’il reste muet, un adulte peut installer une voix française : l’espace parents explique comment.'],
  }],
  ['Les polices', [
    'Fredoka (Fredoka Project Authors) et Nunito (Nunito Project Authors), sous licence SIL Open Font License 1.1.',
  ]],
  ['La technique', [
    'Une application web (HTML, CSS et JavaScript) emballée pour Android avec Capacitor (licence MIT). Pas de pistage, pas de publicité, pas de compte.',
  ]],
  ['Ta vie privée', [
    'Tout reste sur cette tablette : la progression, le prénom, les dessins accrochés. Rien n’est envoyé sur Internet.',
  ]],
];
