// L'alphabet cursif : un gabarit par lettre (données). 1 unité = 1 interligne ; y vers le haut depuis la ligne d'écriture.
// Petites lettres : 2 interlignes de haut ; lettres à hampe (b d f h k l t) : 3 (d et t : 2,5) ; jambages (f g j p q y) : jusqu'à 1,75 sous la ligne.
// Les formes suivent l'alphabet affiché en classe (modèle Nathan) : petite attaque en biais au départ des lettres qui montent,
// boucles hautes étroites et allongées, e avec sa barre, v et w arrondis, x en « c à l'envers » + « c », r à toit plat…
// Tous les gabarits sont dessinés directement sur les lignes (pas besoin de les « caler » ensuite). L'inclinaison de l'écriture
// est appliquée au chargement (voir core/template.js). Une lettre = un ou plusieurs traits ; les points (i, j) sont des traits à part.
import { P } from './helpers.js';

/** Petite attaque : on part un peu au-dessus de la ligne et on monte en biais jusqu'à la hauteur des petites lettres, en x. */
export const ent = (p, x = 0.9) => p.M(0, 0.9).C(0.2, 1.15, x - 0.4, 1.7, x, 2.0);
/** Queue de sortie : descend jusqu'à la ligne et repart vers la droite. */
export const sortie = (p, x) => p.L(x, 0.45).C(x, 0.1, x + 0.2, 0.0, x + 0.6, 0.3);
/** Ovale d'une lettre ronde (a c d g o q) : 2 interlignes de haut, 2·RX de large, centré en (RX, 1). */
export const RX = 0.78;
export const ovale = (a0, a1, rx = RX) => new P().M(rx + rx * Math.cos((a0 * Math.PI) / 180), 1 + Math.sin((a0 * Math.PI) / 180)).arc(rx, 1, rx, 1, a0, a1);
/**
 * Grande boucle de hampe (l, b, h, k, f), comme au tableau : petite attaque, montée en biais (qui croise la tige
 * à 1,1 interligne), boucle étroite tout en haut, puis descente tout droit en x = 0,7 jusqu'à la ligne.
 */
export const hampe = (p) => p.M(0, 0.55).C(0.55, 0.85, 1.1, 1.45, 1.55, 2.3).C(1.85, 2.8, 1.5, 3.1, 1.1, 3.0).C(0.75, 2.9, 0.7, 2.6, 0.7, 2.2).L(0.7, 0.45);
/** Un pont (n, m, p) : de la tige (hauteur 1) jusqu'au haut du pont, puis la descente en x1. */
const pont = (p, x0, x1) => p.L(x0, 1.0).C(x0, 1.75, x0 + 0.25, 1.98, x0 + 0.55, 1.98).C(x1 - 0.15, 1.98, x1, 1.7, x1, 1.2);

const d = (p) => ({ d: p.toString() });

export const LETTRES = [
  {
    id: 'e', word: 'écureuil', hauteur: 2,
    strokes: [d(new P().M(0.35, 1.1).C(0.6, 1.12, 0.9, 1.12, 1.15, 1.1).C(1.5, 1.1, 1.6, 1.95, 0.85, 1.98).C(0.3, 2.0, 0.0, 1.55, 0.0, 1.0).C(0.0, 0.35, 0.35, 0.0, 0.85, 0.0).C(1.25, 0.0, 1.5, 0.2, 1.65, 0.5))],
    intro: 'Le e, comme écureuil. Je pars du milieu, je trace la barre vers la droite, puis je fais le tour en rond vers la gauche.',
    how: 'Pars du point vert, trace la barre vers la droite, puis fais le tour du e en tournant vers la gauche.',
    bubble: 'La barre, puis le tour',
  },
  {
    id: 'u', word: 'ukulélé',
    strokes: [d(ent(new P(), 0.8).L(0.8, 0.7).C(0.8, 0.15, 1.05, 0.0, 1.3, 0.0).C(1.6, 0.0, 1.85, 0.3, 1.85, 0.9).L(1.85, 2.0).L(1.85, 0.45).C(1.85, 0.1, 2.05, 0.0, 2.45, 0.3))],
    intro: 'Le u, comme ukulélé. Je monte, je descends en rond, je remonte et je redescends avec la petite queue.',
    how: 'Monte en biais, descends en arrondi, remonte, puis redescends avec la queue.',
    bubble: 'Monte, arrondis, remonte',
  },
  {
    id: 't', word: 'tortue',
    strokes: [
      d(new P().M(0, 1.0).C(0.25, 1.25, 0.6, 1.55, 0.93, 1.9).L(0.93, 2.5).L(0.93, 0.7).C(0.93, 0.15, 1.2, 0.0, 1.5, 0.0).C(1.85, 0.0, 2.05, 0.3, 2.15, 0.7)),
      d(new P().M(0.75, 2.1).L(1.95, 2.1)),
    ],
    intro: 'Le t, comme tortue. Je monte en pointe, je redescends tout droit avec la petite queue, puis je pose la barre en travers.',
    how: 'Monte en pointe, descends tout droit, tourne avec la queue, puis lève le crayon et trace la barre.',
    bubble: 'Monte en pointe, descends, la barre',
  },
  {
    id: 'c', word: 'chat',
    strokes: [d(ovale(50, 320))],
    intro: 'Le c, comme chat. Je commence comme un rond, mais je m’arrête avant de le fermer.',
    how: 'Pars du point vert, tourne vers la gauche, et arrête-toi : le rond reste ouvert.',
    bubble: 'Un rond ouvert',
  },
  {
    id: 'd', word: 'dauphin',
    strokes: [d(ovale(50, 380).L(1.55, 2.5).L(1.55, 0.45).C(1.55, 0.1, 1.75, 0.0, 2.15, 0.3))],
    intro: 'Le d, comme dauphin. Je fais un rond, puis je monte tout droit et je redescends avec la petite queue.',
    how: 'Fais le rond, monte tout droit plus haut que le rond, puis redescends avec la queue.',
    bubble: 'Un rond, monte haut, descends',
  },
  {
    id: 'n', word: 'nuage',
    strokes: [d(pont(new P().M(0, 0.85).C(0.15, 1.3, 0.35, 1.98, 0.7, 1.98).C(0.95, 1.98, 1.05, 1.8, 1.05, 1.5).L(1.05, 0.1), 1.05, 2.1).L(2.1, 0.5).C(2.1, 0.1, 2.3, 0.0, 2.7, 0.3))],
    intro: 'Le n, comme nuage. Je monte, je descends, je remonte et je fais un pont rond.',
    how: 'Monte en arrondi, descends tout droit, remonte sur ton trait, fais un pont et descends.',
    bubble: 'Monte, descends, un pont',
  },
  {
    id: 'm', word: 'mouton',
    strokes: [d(pont(pont(new P().M(0, 0.9).C(0.15, 1.3, 0.35, 1.98, 0.7, 1.98).C(0.95, 1.98, 1.05, 1.8, 1.05, 1.5).L(1.05, 0.1), 1.05, 2.15).L(2.15, 0.1), 2.15, 3.25).L(3.25, 0.5).C(3.25, 0.1, 3.45, 0.0, 3.85, 0.3))],
    intro: 'Le m, comme mouton. Comme le n, mais avec deux ponts.',
    how: 'Monte en arrondi, descends, puis fais deux ponts de suite.',
    bubble: 'Deux ponts',
  },
  {
    id: 'r', word: 'rivière',
    strokes: [d(new P().M(0, 0.95).C(0, 1.45, 0.0, 1.8, 0.2, 1.95).C(0.5, 2.0, 0.85, 2.0, 1.1, 1.9).C(1.2, 1.8, 1.2, 1.65, 1.15, 1.45).L(0.95, 0.5).C(0.9, 0.1, 1.2, 0.0, 1.55, 0.25))],
    intro: 'Le r, comme rivière. Je monte tout droit, je fais un petit toit plat vers la droite, puis je descends jusqu’à la ligne.',
    how: 'Monte tout droit, glisse vers la droite en gardant le trait plat, puis descends jusqu’à la ligne.',
    bubble: 'Monte, toit plat, descends',
  },
  {
    id: 's', word: 'soleil',
    strokes: [d(new P().M(0, 0.35).C(0.3, 0.7, 0.7, 1.4, 1.2, 1.95).C(1.45, 1.85, 2.0, 1.5, 2.0, 0.95).C(2.0, 0.35, 1.7, 0.0, 1.25, 0.0).C(1.0, 0.0, 0.85, 0.1, 0.75, 0.25))],
    intro: 'Le s, comme soleil. Je monte en pointe, je descends en faisant le ventre bien rond, et je reviens un peu vers la gauche.',
    how: 'Monte en biais jusqu’en haut, tourne et descends en arrondi, puis reviens un peu vers la gauche.',
    bubble: 'Monte, ventre rond',
  },
  {
    id: 'p', word: 'papillon',
    strokes: [d(ent(new P(), 0.85).L(0.85, -1.75).L(0.85, 1.0).C(0.85, 1.75, 1.1, 1.98, 1.4, 1.98).C(1.8, 1.98, 1.95, 1.7, 1.95, 1.15).L(1.95, 0.5).C(1.95, 0.1, 2.15, 0.0, 2.55, 0.3))],
    intro: 'Le p, comme papillon. Je monte, je descends tout droit sous la ligne, je remonte et je fais un pont.',
    how: 'Monte en biais, descends tout droit sous la ligne, remonte sur ton trait, puis fais un pont.',
    bubble: 'Monte, descends sous la ligne, un pont',
  },
  {
    id: 'b', word: 'ballon',
    strokes: [d(hampe(new P()).C(0.7, 0.05, 1.0, -0.02, 1.3, 0.0).C(1.85, 0.0, 2.1, 0.5, 2.1, 1.0).C(2.1, 1.4, 2.2, 1.7, 2.65, 1.7))],
    intro: 'Le b, comme ballon. Je fais la grande boucle du l, je descends tout droit, puis je fais le ventre et je finis par un petit bec.',
    how: 'Monte haut, fais la grande boucle, descends tout droit, puis arrondis le ventre vers la droite et finis par un petit bec.',
    bubble: 'Grande boucle, descends, ventre',
  },
  {
    id: 'h', word: 'hibou',
    strokes: [d(hampe(new P()).L(0.7, 1.1).C(0.7, 1.7, 0.95, 1.98, 1.3, 1.98).C(1.7, 1.98, 1.9, 1.7, 1.9, 1.15).L(1.9, 0.5).C(1.9, 0.1, 2.1, 0.0, 2.5, 0.3))],
    intro: 'Le h, comme hibou. Je fais la grande boucle du l, puis je remonte et je fais un pont.',
    how: 'Monte haut, fais la grande boucle, descends, remonte et fais un pont.',
    bubble: 'Comme le l, puis un pont',
  },
  {
    id: 'k', word: 'koala',
    strokes: [d(hampe(new P()).L(0.7, 1.65).C(1.0, 1.85, 1.4, 1.8, 1.4, 1.45).C(1.4, 1.2, 1.05, 1.1, 0.7, 1.15).C(1.05, 1.05, 1.55, 0.9, 1.55, 0.4).C(1.55, 0.1, 1.8, 0.0, 2.15, 0.3))],
    intro: 'Le k, comme koala. Je fais comme un l, puis une petite boucle au milieu et la jambe.',
    how: 'Fais la grande boucle et descends, remonte sur le trait, fais la petite boucle, puis descends avec la jambe.',
    bubble: 'Comme le l, petite boucle, jambe',
  },
  {
    id: 'f', word: 'fleur',
    strokes: [d(new P().M(-0.4, 0.7).C(0.0, 0.9, 0.6, 1.7, 1.0, 2.45).C(1.2, 2.85, 1.05, 3.05, 0.7, 3.0).C(0.35, 2.95, 0.3, 2.6, 0.3, 2.2).C(0.3, 1.4, 0.3, 0.4, 0.3, -0.9).C(0.3, -1.45, 0.0, -1.75, -0.3, -1.65).C(-0.65, -1.5, -0.3, -0.7, 0.35, 0.0).C(0.7, 0.35, 1.0, 0.8, 1.35, 1.0))],
    intro: 'Le f, comme fleur. Une grande boucle en haut, une boucle en bas, et elles se croisent sur la ligne.',
    how: 'Monte haut, fais la grande boucle, descends sous la ligne, fais la boucle du bas et reviens.',
    bubble: 'Boucle en haut, boucle en bas',
  },
  {
    id: 'g', word: 'grenouille',
    strokes: [d(ovale(50, 380).L(1.55, 2.0).L(1.55, -1.05).C(1.55, -1.5, 1.3, -1.78, 0.95, -1.73).C(0.55, -1.68, 0.4, -1.3, 0.7, -0.95).C(1.0, -0.6, 1.75, -0.1, 2.15, 0.4))],
    intro: 'Le g, comme grenouille. Je fais un rond, je descends sous la ligne, je fais une boucle et je remonte.',
    how: 'Fais le rond, descends sous la ligne, tourne vers la gauche, puis remonte en croisant ton trait.',
    bubble: 'Un rond, descends, boucle, remonte',
  },
  {
    id: 'q', word: 'quille',
    strokes: [d(ovale(50, 380).L(1.55, 2.0).L(1.55, -1.75))],
    intro: 'Le q, comme quille. Je fais un rond, puis je descends tout droit sous la ligne.',
    how: 'Fais le rond, puis descends tout droit sous la ligne.',
    bubble: 'Un rond, puis descends tout droit',
  },
  {
    id: 'j', word: 'jardin',
    strokes: [
      d(ent(new P(), 0.85).L(0.85, -1.0).C(0.85, -1.45, 0.6, -1.78, 0.25, -1.73).C(-0.15, -1.68, -0.2, -1.3, 0.1, -0.95).C(0.4, -0.6, 1.0, -0.1, 1.45, 0.45)),
      { dot: [0.85, 3] },
    ],
    intro: 'Le j, comme jardin. Comme un i qui descend sous la ligne, avec son point.',
    how: 'Monte en biais, descends sous la ligne, fais la boucle en croisant ton trait, puis pose le point en haut.',
    bubble: 'Monte, descends, recourbe, point',
  },
  {
    id: 'y', word: 'yaourt',
    strokes: [d(ent(new P(), 0.75).L(0.75, 0.7).C(0.75, 0.15, 1.0, 0.0, 1.25, 0.0).C(1.55, 0.0, 1.8, 0.3, 1.8, 0.9).L(1.8, 2.0).L(1.8, -1.0).C(1.8, -1.45, 1.55, -1.78, 1.2, -1.73).C(0.8, -1.68, 0.75, -1.3, 1.05, -0.95).C(1.35, -0.6, 1.95, -0.1, 2.4, 0.5))],
    intro: 'Le y, comme yaourt. Comme un u, mais la deuxième jambe descend sous la ligne.',
    how: 'Fais comme un u, mais la dernière descente va sous la ligne ; fais la boucle et remonte en croisant ton trait.',
    bubble: 'Comme un u qui descend plus bas',
  },
  {
    id: 'v', word: 'vache',
    strokes: [d(new P().M(0, 1.05).C(0.15, 1.5, 0.35, 1.95, 0.65, 1.95).C(0.85, 1.95, 0.95, 1.8, 0.95, 1.5).L(0.95, 0.7).C(0.95, 0.15, 1.2, 0.0, 1.4, 0.0).C(1.65, 0.0, 1.75, 0.3, 1.75, 0.8).L(1.75, 1.85).C(1.85, 1.7, 2.2, 1.7, 2.65, 1.7))],
    intro: 'Le v, comme vache. Je descends, j’arrondis au fond, je remonte tout droit et je pars vers la droite.',
    how: 'Descends, arrondis au fond, remonte tout droit, puis tire un petit trait vers la droite.',
    bubble: 'Descends, arrondis, remonte',
  },
  {
    id: 'w', word: 'wagon',
    strokes: [d(new P().M(0, 1.05).C(0.15, 1.5, 0.35, 1.95, 0.65, 1.95).C(0.85, 1.95, 0.95, 1.8, 0.95, 1.5).L(0.95, 0.7).C(0.95, 0.15, 1.2, 0.0, 1.4, 0.0).C(1.65, 0.0, 1.8, 0.3, 1.85, 0.8).L(1.85, 1.95).L(1.85, 0.7).C(1.85, 0.15, 2.1, 0.0, 2.3, 0.0).C(2.55, 0.0, 2.7, 0.3, 2.7, 0.8).L(2.7, 1.85).C(2.8, 1.7, 3.15, 1.7, 3.6, 1.7))],
    intro: 'Le w, comme wagon. Comme deux v collés l’un à l’autre.',
    how: 'Descends en rond, remonte, descends en rond, remonte, et finis par un petit trait vers la droite.',
    bubble: 'Deux creux',
  },
  {
    id: 'x', word: 'xylophone',
    strokes: [
      d(new P().M(0.05, 1.5).C(0.15, 1.9, 0.8, 2.05, 1.15, 1.6).C(1.45, 1.2, 1.45, 0.8, 1.15, 0.4).C(0.8, -0.05, 0.15, 0.1, 0.05, 0.5)),
      d(new P().M(2.55, 1.5).C(2.45, 1.9, 1.8, 2.05, 1.45, 1.6).C(1.15, 1.2, 1.15, 0.8, 1.45, 0.4).C(1.8, -0.05, 2.45, 0.1, 2.55, 0.5)),
    ],
    intro: 'Le x, comme xylophone. Un c à l’envers, puis un c : ils se touchent au milieu.',
    how: 'D’abord un c à l’envers (qui s’ouvre vers la gauche) ; lève le crayon, puis un c normal à droite, qui touche le premier au milieu.',
    bubble: 'Un c à l’envers, puis un c',
  },
  {
    id: 'z', word: 'zèbre',
    strokes: [d(new P().M(0, 1.35).C(0.1, 1.75, 0.3, 1.95, 0.65, 1.95).L(1.75, 1.95).L(0.55, 0.65).C(1.0, 0.85, 1.75, 0.7, 1.8, -0.1).C(1.85, -0.9, 1.45, -1.65, 0.85, -1.7).C(0.35, -1.75, 0.0, -1.5, 0.3, -1.1))],
    intro: 'Le z, comme zèbre. Je commence en haut, je trace la barre vers la droite, je descends en biais, puis je fais le ventre et je descends sous la ligne pour enrouler.',
    how: 'Commence en haut, trace la barre vers la droite, descends en biais, fais le ventre, descends sous la ligne et enroule vers la gauche.',
    bubble: 'Barre, biais, ventre, enroulé',
  },
];
