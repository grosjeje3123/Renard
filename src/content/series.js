// Les phrases dites par le renard autour des séries (fête de fin de série, annonce du nombre de séries).
// Réunies ici pour que la liste des paroles à enregistrer (tools/paroles.mjs) les connaisse toutes.

export const feteSerie = (titre) => `Bravo ! Tu as fini la série « ${titre} » !`;
export const feteNiveau = (nom) => `Bravo ! Tu as fini tout le niveau « ${nom} » ! Quelle belle aventure !`;
/** Après la fête : ce qu'on peut faire ensuite. */
export const FETE_SUITE = 'On passe à la série suivante, ou on fait un petit dessin pour fêter ça ?';
export const FETE_SUITE_NIVEAU = 'Tu peux faire un petit dessin pour fêter ça, ou choisir ta prochaine aventure !';
/** Série finie alors qu'il reste des séries plus tôt dans le niveau : pas de « suivante », on retourne à la carte. */
export const FETE_SUITE_CARTE = 'Tu peux faire un petit dessin pour fêter ça, ou retourner à la carte !';
/** La première fois qu'on ouvre la carte d'un niveau : combien de séries, et ce qui se passe à la fin de chacune. */
export const introSeries = (n) => `Dans cette aventure, il y a ${n} séries. Quand tu as fini une série, on fait la fête !`;
