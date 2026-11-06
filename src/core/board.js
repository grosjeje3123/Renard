// Le "cahier" : espace de coordonnées partagé par le dessin, le gabarit et l'analyse.
// 1 unité = 1 interligne. L'axe y du cahier va vers le bas.
export const BOARD = {
  W: 10,
  H: 7,
  baseline: 5, // ligne d'écriture (trait épais)
  xHeight: 3, // hauteur des petites lettres : 2 interlignes
  ascender: 2, // hauteur des grandes lettres : 3 interlignes
  slant: 0.06, // inclinaison de l'écriture cursive : presque droite, comme l'alphabet de la classe (~3,5°)
};
