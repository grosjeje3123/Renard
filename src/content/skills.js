// Contenu pédagogique (données). Ajouter un exercice = ajouter une entrée ici,
// sans toucher au moteur ni à l'interface.
import { P } from './helpers.js';
import { parsePath } from '../engine/pathdata.js';
import { LETTRES, hampe, ent, sortie, ovale } from './lettres.js';
import { CAPITALES, MAJUSCULES } from './majuscules.js';
import { CHIFFRES, CHIFFRES_TRACES } from './chiffres.js';
import { BOARD } from '../core/board.js';

const TAU = Math.PI * 2;

const lignes = () => {
  const strokes = [0, 1, 2, 3].map((i) => ({ d: new P().M(i * 1.9, 3).L(i * 1.9, 0).toString() }));
  return strokes;
};
// Les formes du niveau 1 sont calées sur les lignes du cahier (1 unité = 1 interligne, y vers le haut depuis la ligne d'écriture) :
// pieds sur la ligne d'écriture (y = 0) et sommets sur une ligne (y = 2 ou 3), jamais « entre deux lignes ».
// Un pont (courbe de Bézier à deux points de contrôle à la même hauteur h) culmine à 0,75 h : h = 8/3 donne exactement 2 interlignes.
const ponts = () => {
  const w = 2.4, h = 8 / 3;
  const p = new P().M(0, 0);
  for (let i = 0; i < 3; i++) p.C(i * w, h, i * w + w, h, i * w + w, 0);
  return [{ d: p.toString() }];
};
// Vague : du creux (ligne d'écriture) au sommet (ligne du haut, 2 interlignes plus haut), sans jamais s'arrêter entre les deux.
// Trois vagues complètes : on part du creux et on finit dans un creux.
const vagues = () => [{ d: new P().fn(0, 7.8, 130, (x) => [x, 1 - Math.cos((TAU * x) / 2.6)]).toString() }];
// Ruban : les boucles montent jusqu'à la ligne de 3 interlignes (hauteur 2b = 3) et reviennent toucher la ligne d'écriture.
const boucles = () => {
  const a = 0.62, b = 1.5;
  const g = (t) => [a * t - b * Math.sin(t), b * Math.cos(t) + b];
  return [{ d: new P().fn(Math.PI, 5 * Math.PI, 160, g).toString() }];
};

export const SKILLS = {
  lignes: {
    id: 'lignes', kind: 'graphisme', level: 1, title: 'La pluie', short: 'Traits droits',
    skillLabel: 'Tracer des lignes droites',
    strokes: lignes(),
    say: {
      intro: 'Regarde, il pleut ! Je dessine des gouttes de haut en bas.',
      how: 'Pars du point vert et descends tout droit.',
      bubble: 'Descends tout droit',
    },
    item: 'echarpe',
  },
  ronds: {
    id: 'ronds', kind: 'graphisme', level: 1, title: 'La bulle', short: 'Le rond',
    skillLabel: 'Tracer un rond',
    strokes: [{ d: new P().M(1.5 + 1.5 * Math.cos(1.047), 1.5 + 1.5 * Math.sin(1.047)).arc(1.5, 1.5, 1.5, 1.5, 60, 420).toString() }],
    say: {
      intro: 'Je dessine une bulle ! Je tourne vers la gauche, comme une horloge à l’envers.',
      how: 'Pars du point vert, tourne vers la gauche et referme le rond.',
      bubble: 'Tourne vers la gauche',
    },
    item: 'lunettes',
  },
  ponts: {
    id: 'ponts', kind: 'graphisme', level: 1, title: 'Les ponts', short: 'Les ponts',
    skillLabel: 'Tracer des ponts',
    strokes: ponts(),
    say: {
      intro: 'Des ponts pour passer la rivière ! Je monte, je passe au-dessus et je redescends.',
      how: 'Monte, passe au-dessus et redescends. Puis recommence.',
      bubble: 'Monte, passe, redescends',
    },
    item: 'chapeau',
  },
  vagues: {
    id: 'vagues', kind: 'graphisme', level: 1, title: 'La rivière', short: 'Les vagues',
    skillLabel: 'Tracer des vagues',
    strokes: vagues(),
    say: {
      intro: 'La rivière fait des vagues. Elles montent et elles descendent, doucement.',
      how: 'Suis la vague sans t’arrêter : le haut touche la ligne, le bas touche la ligne.',
      bubble: 'Suis la vague',
    },
    item: 'noeud',
  },
  boucles: {
    id: 'boucles', kind: 'graphisme', level: 1, title: 'Les rubans', short: 'Les boucles',
    skillLabel: 'Tracer des boucles',
    strokes: boucles(),
    say: {
      intro: 'Un ruban qui danse ! Je monte, je fais une boucle et j’avance.',
      how: 'Monte en tournant vers la gauche, fais la boucle et avance.',
      bubble: 'Fais la boucle',
    },
    item: 'medaille',
  },

  // ---- Niveau 2 : lettres cursives (tracés écrits droits, l'inclinaison est appliquée au chargement)
  i: {
    id: 'i', kind: 'letter', level: 2, glyph: 'i', word: 'iris', title: 'Le i', short: 'i comme iris',
    skillLabel: 'Écrire le i', sound: 'i',
    strokes: [
      { d: sortie(ent(new P(), 0.9), 0.9).toString() },
      { dot: [0.9, 2.85] },
    ],
    say: {
      intro: 'Le i, comme iris. Je monte en biais, je redescends tout droit avec la petite queue… et je n’oublie pas son point !',
      how: 'Monte en biais, descends tout droit, puis pose le point sur la ligne du haut.',
      bubble: 'Monte, descends, puis le point',
    },
    item: 'iris',
  },
  o: {
    id: 'o', kind: 'letter', level: 2, glyph: 'o', word: 'oiseau', title: 'Le o', short: 'o comme oiseau',
    skillLabel: 'Écrire le o', sound: 'o',
    strokes: [{ d: ovale(75, 415).C(1.5, 1.9, 1.8, 1.85, 2.1, 1.75).toString() }],
    say: {
      intro: 'Le o, comme oiseau. Je tourne vers la gauche et je ferme le rond.',
      how: 'Pars du point vert, tourne vers la gauche et ferme le rond.',
      bubble: 'Tourne et ferme le rond',
    },
    item: 'oiseau',
  },
  a: {
    id: 'a', kind: 'letter', level: 2, glyph: 'a', word: 'abeille', title: 'Le a', short: 'a comme abeille',
    skillLabel: 'Écrire le a', sound: 'a',
    strokes: [{ d: ovale(50, 380).L(1.55, 2.0).L(1.55, 0.45).C(1.55, 0.1, 1.75, 0.0, 2.15, 0.3).toString() }],
    say: {
      intro: 'Le a, comme abeille. Je fais un rond, puis je remonte et je descends tout droit le long du rond, avec la petite queue.',
      how: 'Fais le rond vers la gauche, remonte, puis descends tout droit avec la queue.',
      bubble: 'Un rond, puis descends',
    },
    item: 'abeille',
  },
  l: {
    id: 'l', kind: 'letter', level: 2, glyph: 'l', word: 'lanterne', title: 'Le l', short: 'l comme lanterne',
    skillLabel: 'Écrire le l', sound: 'l',
    strokes: [{ d: hampe(new P()).C(0.7, 0.1, 0.95, 0.0, 1.35, 0.3).toString() }],
    say: {
      intro: 'Le l, comme lanterne. Je monte haut, je fais une grande boucle et je redescends.',
      how: 'Monte jusqu’à la ligne du haut, fais la grande boucle, redescends.',
      bubble: 'Monte haut, grande boucle, descends',
    },
    item: 'lanterne',
  },
};

// ---- Calage sur les lignes du cahier
// Une lettre écrite à main levée « flotte » un peu (le pied à 0,1, la boucle du l à 3,15…). Pour l'enfant, mieux vaut un repère net :
// le pied de chaque lettre sur la ligne d'écriture, le haut des petites lettres sur la ligne de 2 interlignes, le haut du l sur la ligne de 3,
// le point du i sur cette même ligne de 3. On étire donc la lettre verticalement (transformation affine : les courbes restent des courbes).
const fx = (v) => String(Math.round(v * 1000) / 1000);
/** Applique f aux ordonnées d'un chemin absolu (M L C Q) ; les abscisses ne bougent pas. */
const mapY = (d, f) => {
  let k = 0;
  return d.replace(/[MLCQZ]|-?\d*\.?\d+(?:e-?\d+)?/gi, (t) => {
    if (/[MLCQZ]/i.test(t)) { k = 0; return t; }
    return k++ % 2 === 1 ? fx(f(parseFloat(t))) : t;
  });
};
export const DOT_HEIGHT = 3; // le point du i se pose sur la ligne de 3 interlignes
function snapToLines(sk, height) {
  const ys = sk.strokes.filter((st) => st.d).flatMap((st) => parsePath(st.d)).map((q) => q.y);
  const lo = Math.min(...ys), hi = Math.max(...ys);
  const f = (y) => ((y - lo) / (hi - lo)) * height;
  sk.strokes = sk.strokes.map((st) => (st.d ? { ...st, d: mapY(st.d, f) } : { ...st, dot: [st.dot[0], DOT_HEIGHT] }));
}
// Les 21 autres lettres de l'alphabet (src/content/lettres.js) rejoignent les cinq premières.
for (const L of LETTRES) {
  SKILLS[L.id] = {
    id: L.id, kind: 'letter', level: 2, glyph: L.id, word: L.word, title: `Le ${L.id}`, short: `${L.id} comme ${L.word}`,
    skillLabel: `Écrire le ${L.id}`, sound: L.id, strokes: L.strokes,
    say: { intro: L.intro, how: L.how, bubble: L.bubble },
    item: L.id === 'e' ? 'ecureuil' : null,
  };
}
/** Hauteur de la lettre au-dessus de la ligne d'écriture (2 = petite lettre, 3 = lettre à hampe) ; les jambages (p g q j y) restent tels que dessinés. */
export const HAUTEUR = { i: 2, o: 2, a: 2, e: 2, u: 2, c: 2, n: 2, m: 2, r: 2, s: 2, v: 2, w: 2, x: 2, l: 3, t: 2.5, d: 2.5, b: 3, h: 3, k: 3 };
for (const [id, height] of Object.entries(HAUTEUR)) snapToLines(SKILLS[id], height);
/** Le f monte à la ligne de 3 interlignes et descend sous la ligne : on cale seulement le haut. */
{
  const sk = SKILLS.f;
  const hi = Math.max(...sk.strokes.filter((st) => st.d).flatMap((st) => parsePath(st.d)).map((q) => q.y));
  sk.strokes = sk.strokes.map((st) => (st.d ? { ...st, d: mapY(st.d, (y) => (y > 0 ? (y * 3) / hi : y)) } : st));
}

// ---- Niveau 3 : petits mots écrits lettre par lettre (lettres détachées : on lève le crayon entre les lettres).
// Un mot est composé à partir des tracés des lettres déjà apprises, mises côte à côte ; les points des « i »
// viennent à la fin du mot, comme à l'école. Les liaisons entre lettres ne sont pas encore évaluées.
/** Décale un chemin absolu (M L C Q) de dx sur l'axe x. */
const shiftD = (d, dx) => {
  let k = 0;
  return d.replace(/[MLCQZ]|-?\d*\.?\d+(?:e-?\d+)?/gi, (t) => {
    if (/[MLCQZ]/i.test(t)) { k = 0; return t; }
    return fx(parseFloat(t) + (k++ % 2 === 0 ? dx : 0));
  });
};
const WORD_GAP = 0.6; // entre deux lettres d'un mot
const SPACE_GAP = 1.5; // entre deux mots d'une phrase
/**
 * Écrit un texte (lettres a–z, espaces) avec les tracés des lettres : lettres détachées, points des i et des j à la fin de chaque mot,
 * point final de la phrase si `period`.
 */
export function composeText(text, { period = false, skills = SKILLS, gap = WORD_GAP, space = SPACE_GAP } = {}) {
  const out = [];
  let cursor = 0;
  text.split(' ').forEach((word, wi) => {
    const paths = [], dots = [];
    if (wi) cursor += space - gap;
    for (const id of word) {
      const strokes = skills[id].strokes;
      const sk = skills[id];
      const xs = strokes.filter((st) => st.d).flatMap((st) => parsePath(st.d)).map((q) => (sk.upright ? q.x + BOARD.slant * q.y : q.x));
      const dx = cursor - Math.min(...xs);
      for (const st of strokes) (st.d ? paths : dots).push(st.d ? { d: shiftD(st.d, dx) } : { dot: [st.dot[0] + dx, st.dot[1]] });
      cursor += Math.max(...xs) - Math.min(...xs) + gap;
    }
    out.push(...paths, ...dots);
  });
  if (period) out.push({ dot: [cursor - gap + 0.55, 0] });
  return out;
}
// ---- Niveau 1 (suite) : les 26 majuscules d'imprimerie, la grande étape de la grande section avant le CP.
// Mêmes tracés que le tableau libre (majuscules.js), mais droits dès le départ (`slant: 0`) : on les pose tels quels sur le cahier.
// Pas de récompense d'objet (le niveau 1 en a déjà) : l'enfant gagne des étoiles, et ses majuscules servent ensuite à écrire son prénom.
const MAJ_TEXTES = {
  A: ['Je monte en pointe, je redescends de l’autre côté… et je pose la barre au milieu !', 'Monte en pointe, redescends, puis trace la barre au milieu.', 'Une pointe, puis la barre'],
  B: ['Je descends tout droit, puis je fais deux bedaines vers la droite.', 'Descends tout droit. Puis repars du haut et fais deux bedaines.', 'Un bâton, deux bedaines'],
  C: ['Je tourne vers la gauche, comme une lune ouverte à droite.', 'Pars en haut à droite, tourne vers la gauche et finis en bas à droite.', 'Tourne et ouvre à droite'],
  D: ['Je descends tout droit, puis je fais une grande bedaine vers la droite.', 'Descends tout droit. Puis repars du haut et fais une grande bedaine jusqu’en bas.', 'Un bâton, une grande bedaine'],
  E: ['Un bâton, et trois barres : en haut, au milieu et en bas.', 'Descends tout droit. Puis trace trois barres vers la droite : en haut, au milieu, en bas.', 'Un bâton, trois barres'],
  F: ['Un bâton, et deux barres : en haut et au milieu.', 'Descends tout droit. Puis trace deux barres vers la droite : en haut, puis au milieu.', 'Un bâton, deux barres'],
  G: ['Je fais un grand C, et je rentre une petite barre au milieu.', 'Fais un grand C qui remonte jusqu’au milieu, puis rentre une barre vers la gauche.', 'Un grand C, puis une barre'],
  H: ['Deux bâtons, et une barre au milieu pour les relier.', 'Descends tout droit à gauche, puis à droite. Trace la barre au milieu.', 'Deux bâtons, une barre'],
  I: ['Un seul bâton, tout droit, de haut en bas.', 'Pars du point vert et descends tout droit.', 'Descends tout droit'],
  J: ['Je descends tout droit, et je fais un crochet vers la gauche.', 'Descends tout droit, puis recourbe vers la gauche en bas.', 'Descends, puis le crochet'],
  K: ['Un bâton, puis un V couché qui touche le bâton.', 'Descends tout droit. Puis pars en haut à droite, touche le bâton, et redescends en bas à droite.', 'Un bâton, puis un V couché'],
  L: ['Je descends tout droit, puis je pars vers la droite.', 'Descends tout droit, puis trace la barre vers la droite.', 'Descends, puis la barre'],
  M: ['Je monte, je descends jusqu’au milieu, je remonte, et je redescends.', 'Monte tout droit, descends en biais, remonte en biais, puis redescends tout droit.', 'Monte, descends, remonte, descends'],
  N: ['Je monte tout droit, je descends en biais, et je remonte tout droit.', 'Monte tout droit, descends en biais, puis remonte tout droit.', 'Monte, descends en biais, monte'],
  O: ['Un grand rond : je tourne vers la gauche et je le ferme.', 'Pars du point vert, tourne vers la gauche et ferme le grand rond.', 'Un grand rond'],
  P: ['Je descends tout droit, puis je fais une bedaine en haut.', 'Descends tout droit. Puis repars du haut et fais une bedaine jusqu’au milieu.', 'Un bâton, une bedaine'],
  Q: ['Je fais un grand rond, et une petite queue en bas à droite.', 'Fais le grand rond vers la gauche. Puis trace la petite queue en biais.', 'Un rond, puis la queue'],
  R: ['Je fais un P, puis une jambe en biais.', 'Descends tout droit. Fais la bedaine en haut. Puis trace la jambe en biais vers le bas.', 'Un P, puis la jambe'],
  S: ['Je serpente : je tourne à gauche, puis à droite.', 'Pars en haut à droite, tourne vers la gauche, puis vers la droite, et finis en bas à gauche.', 'Serpente comme un serpent'],
  T: ['Une barre en haut, puis un bâton qui descend du milieu.', 'Trace la barre vers la droite. Puis descends tout droit, au milieu.', 'Une barre, puis un bâton'],
  U: ['Je descends, je tourne en bas, et je remonte.', 'Descends tout droit, arrondis en bas, puis remonte tout droit.', 'Descends, arrondis, remonte'],
  V: ['Je descends en biais, et je remonte en biais.', 'Descends en biais jusqu’en bas, puis remonte en biais.', 'Descends, puis remonte'],
  W: ['Deux V qui se touchent : je descends, je remonte, je redescends, je remonte.', 'Descends en biais, remonte un peu, redescends, puis remonte en haut.', 'Deux V côte à côte'],
  X: ['Deux traits en biais qui se croisent.', 'Descends en biais de haut à gauche vers le bas à droite. Puis de haut à droite vers le bas à gauche.', 'Deux traits qui se croisent'],
  Y: ['Deux bras qui se rejoignent, puis un bâton vers le bas.', 'Descends en biais jusqu’au milieu depuis la gauche. Puis depuis la droite, et continue tout droit jusqu’en bas.', 'Deux bras, puis un bâton'],
  Z: ['Une barre en haut, un biais, une barre en bas.', 'Trace la barre en haut, descends en biais, puis trace la barre en bas.', 'Barre, biais, barre'],
};
const MAJ_SECTIONS = [
  { id: 'maj_batons', title: 'Les majuscules en bâtons', lettres: 'ILTEFH' },
  { id: 'maj_pointes', title: 'Les majuscules pointues', lettres: 'VANMWZ' },
  { id: 'maj_croix', title: 'Les croix et les crochets', lettres: 'KXYUJ' },
  { id: 'maj_rondes', title: 'Les majuscules rondes', lettres: 'OCQGS' },
  { id: 'maj_bedaines', title: 'Les majuscules à bedaine', lettres: 'DPBR' },
];
for (const sec of MAJ_SECTIONS) {
  sec.skills = [...sec.lettres].map((L) => {
    const id = `maj_${L}`;
    const [intro, how, bubble] = MAJ_TEXTES[L];
    SKILLS[id] = {
      id, kind: 'letter', level: 1, capital: true, slant: 0, glyph: L, section: sec.id,
      title: `Le ${L} majuscule`, short: `Le ${L} majuscule`, label: L,
      skillLabel: `Écrire le ${L} majuscule`,
      strokes: MAJUSCULES[L],
      say: { intro: `Le ${L} majuscule. ${intro}`, how, bubble },
      item: null,
    };
    return id;
  });
}

// ---- Niveau 1 (fin) : les chiffres de 0 à 9, droits comme les majuscules (chiffres.js), pour compter et écrire son âge.
const NOMS_CHIFFRES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const CHIFFRES_TEXTES = [
  ['Je fais un ovale : je pars du haut et je tourne vers la gauche.', 'Pars du haut, tourne vers la gauche et ferme l’ovale.', 'Un ovale bien fermé'],
  ['Je pars de la petite pointe, je monte, puis je descends tout droit.', 'Pars de la petite pointe, monte jusqu’en haut, puis descends tout droit.', 'Monte, puis descends tout droit'],
  ['Je fais un petit chapeau, je descends en biais, et je trace la barre en bas.', 'Fais le chapeau vers la droite, descends en biais jusqu’en bas, puis trace la barre.', 'Un chapeau, un biais, une barre'],
  ['Je fais deux ventres l’un sous l’autre, qui s’ouvrent vers la gauche.', 'Fais le premier ventre, reviens au milieu, puis fais le deuxième ventre.', 'Deux ventres vers la droite'],
  ['Je descends en biais, je vais vers la droite, puis je trace un bâton qui descend.', 'Descends en biais, trace la barre vers la droite. Puis repars du haut et descends tout droit.', 'Un biais, une barre, un bâton'],
  ['Je descends un peu, je fais un ventre, et je pose le chapeau.', 'Descends un peu, puis fais le grand ventre vers la droite. Pose le chapeau en haut.', 'Un ventre, puis le chapeau'],
  ['Je descends en courbe, et je ferme une boucle en bas.', 'Pars en haut à droite, descends en courbe, tourne en bas et ferme la boucle.', 'Descends, puis la boucle'],
  ['Je trace une barre en haut, puis je descends en biais.', 'Trace la barre vers la droite, puis descends en biais jusqu’en bas.', 'Une barre, puis un biais'],
  ['Je fais un petit rond en haut, un grand rond en bas, en un seul trait.', 'Pars en haut, tourne vers la gauche, croise au milieu, fais le rond du bas, et remonte.', 'Deux ronds, en un seul trait'],
  ['Je fais un petit rond en haut, et un bâton qui descend.', 'Fais le rond en haut, tourne vers la gauche, ferme-le, puis descends tout droit.', 'Un rond, puis un bâton'],
];
const CHIFFRES_SECTION = {
  id: 'chiffres', title: 'Les chiffres',
  skills: Object.keys(CHIFFRES_TRACES).map((D) => {
    const id = `chf_${D}`;
    const [intro, how, bubble] = CHIFFRES_TEXTES[+D];
    SKILLS[id] = {
      id, kind: 'letter', level: 1, chiffre: true, slant: 0, glyph: D, section: 'chiffres',
      title: `Le chiffre ${D}`, short: `Le chiffre ${D}`, label: D,
      skillLabel: `Écrire le chiffre ${D}`,
      strokes: CHIFFRES_TRACES[D],
      say: { intro: `Le chiffre ${NOMS_CHIFFRES[+D]}. ${intro}`, how, bubble },
      item: null,
    };
    return id;
  }),
};

/** Minuscules cursives (a–z), majuscules d'imprimerie (A–Z) et chiffres (0–9) : le registre du tableau libre. */
export const ECRITURE = { ...SKILLS, ...CAPITALES, ...CHIFFRES };
export const composeWord = (letters, skills = SKILLS) => composeText(letters.join(''), { skills });

// ---- Niveau 3 : les sons, les mots, les phrases. Tout est composé avec les lettres : on n'écrit ici que du texte.
const GROUPES = ['ou', 'on', 'an', 'in', 'ch', 'oi', 'au', 'eau', 'ai', 'eu', 'gn', 'qu'];
// L'échelle de la fin du niveau 3 : des mots, puis des phrases, du plus simple au plus difficile.
// La difficulté d'un texte, c'est d'abord sa longueur (nombre de lettres), puis la difficulté de ses lettres : celles qu'on apprend
// d'abord comptent 1 (i, o, a, l, e), puis 2 (u, t, n, m, r), 3 (c, d, s, g, q), 4 (b, h, k, f, p) et 5 (j, y, v, w, x, z), comme dans l'ordre du niveau 2.
const POIDS_LETTRE = Object.fromEntries(['ioale', 'utnmr', 'cdsgq', 'bhkfp', 'jyvwxz'].flatMap((g, i) => [...g].map((l) => [l, i + 1])));
/** Nombre de lettres d'un mot ou d'une phrase (sans les espaces). */
export const nbLettres = (t) => t.replace(/ /g, '').length;
/** Poids total des lettres : à longueur égale, c'est ce qui départage le plus simple du plus difficile. */
export const difficulte = (t, poids = POIDS_LETTRE) => [...t.replace(/ /g, '')].reduce((a, l) => a + (poids[l] || 0), 0);
const parDifficulte = (liste) => [...liste].sort((a, b) => nbLettres(a) - nbLettres(b) || difficulte(a) - difficulte(b) || a.localeCompare(b, 'fr'));

const PALIERS_MOTS = [
  { id: 'mots_p1', title: 'Les tout petits mots', max: 3, mots: ['ma', 'un', 'tu', 'roi', 'une', 'mon', 'rat', 'rue', 'nid', 'zoo', 'riz', 'bus'] },
  { id: 'mots_p2', title: 'Les mots de 4 lettres', max: 4, mots: ['moto', 'main', 'nuit', 'gare', 'dent', 'pied', 'bois', 'jour', 'cube', 'kiwi'] },
  { id: 'mots_p3', title: 'Les mots de 5 lettres', max: 5, mots: ['balle', 'route', 'tigre', 'avion', 'singe', 'plage', 'jouet', 'fruit', 'herbe', 'wagon', 'merci', 'lundi'] },
  { id: 'mots_p4', title: 'Les mots de 6 lettres', max: 6, mots: ['ballon', 'maison', 'tortue', 'orange', 'citron', 'bateau', 'girafe', 'jardin', 'crayon', 'pyjama', 'samedi'] },
  { id: 'mots_p5', title: 'Les mots de 7 lettres', max: 7, mots: ['bonjour', 'bonsoir', 'chameau', 'poussin', 'piscine', 'biscuit', 'cuisine', 'poisson'] },
  { id: 'mots_p6', title: 'Les mots de 8 lettres', max: 8, mots: ['cartable', 'papillon', 'tracteur', 'chocolat', 'champion', 'vacances', 'mercredi'] },
  { id: 'mots_p7', title: 'Les très grands mots', max: 99, mots: ['crocodile', 'dinosaure', 'parapluie', 'kangourou', 'xylophone', 'coccinelle', 'grenouille', 'hirondelle', 'champignon'] },
];
const PHRASES_ECHELLE = [
  'tu lis', 'il dort', 'il joue', 'elle rit', 'il pleut', 'il neige', 'papa lit', 'papa rit', 'il a un ami', 'maman lit',
  'tu as un ami', 'mon ami joue', 'il a un chien', 'le chat dort', 'un ours dort', 'le bebe dort', 'le lion rugit', 'le loup a faim',
  'la lune brille', 'le lapin saute', 'le chien aboie', 'la pluie tombe', 'la vache mange', 'je sais ecrire', 'le soleil brille', 'papa lit un livre',
  'le renard a faim', 'le lapin a un nid',
  'le petit chat dort', 'tu as un joli livre', 'le chat aime le lait', 'le renard est malin', 'le chien est gentil', 'le soleil est chaud',
  'le chat lit un livre', 'le chat boit du lait',
];
const PALIERS_PHRASES = [
  { id: 'phr_p1', title: 'Mes premières phrases', max: 8 },
  { id: 'phr_p2', title: 'Des phrases courtes', max: 11 },
  { id: 'phr_p3', title: 'Des phrases plus longues', max: 14 },
  { id: 'phr_p4', title: 'Les grandes phrases', max: 99 },
];
const palier = (paliers, t) => paliers.find((p) => nbLettres(t) <= p.max);
const ECHELLE_MOTS = PALIERS_MOTS.map(({ id, title, max, mots }) => ({ id, title, max, mots: parDifficulte(mots) }));
const ECHELLE_PHRASES = PALIERS_PHRASES.map((p) => ({ id: p.id, title: p.title, max: p.max, phrases: parDifficulte(PHRASES_ECHELLE.filter((t) => palier(PALIERS_PHRASES, t) === p)) }));

const MOT_SECTIONS = [
  { id: 'premiers', title: 'Mes premiers mots', mots: ['il', 'la', 'le', 'loi', 'oie', 'aile'] },
  { id: 'sons', title: 'Les sons', groupes: GROUPES },
  { id: 'famille', title: 'La famille', mots: ['papa', 'maman', 'mamie', 'papi', 'tata', 'ami'] },
  { id: 'animaux', title: 'Les animaux', mots: ['chat', 'chien', 'lapin', 'souris', 'loup', 'ours', 'lion', 'vache', 'canard', 'cheval'] },
  { id: 'nature', title: 'La nature', mots: ['lune', 'soleil', 'fleur', 'arbre', 'pluie', 'neige', 'vent', 'sable'] },
  { id: 'maison', title: 'À la maison', mots: ['table', 'livre', 'porte', 'lit', 'sac', 'robe', 'pomme', 'poire', 'pain', 'lait'] },
  { id: 'couleurs', title: 'Les couleurs', mots: ['rouge', 'vert', 'bleu', 'jaune', 'noir', 'blanc', 'gris', 'rose'] },
  ...ECHELLE_MOTS,
  ...ECHELLE_PHRASES,
];
const needsOf = (text) => [...new Set(text.replace(/ /g, ''))];
const mkText = (sec, text, kind) => {
  const id = `${kind === 'phrase' ? 'phr' : kind === 'groupe' ? 'son' : 'mot'}_${text.replace(/ /g, '_')}`;
  const dots = /[ij]/.test(text);
  const n = needsOf(text).length;
  const L = n === 1 ? 'la lettre' : 'les lettres';
  SKILLS[id] = {
    id, kind: 'word', level: 3, glyph: text, word: text, section: sec.id,
    groupe: kind === 'groupe', phrase: kind === 'phrase',
    title: kind === 'groupe' ? `Le son « ${text} »` : kind === 'phrase' ? `La phrase « ${text} »` : `Le mot « ${text} »`,
    label: text, short: kind === 'groupe' ? `Le son « ${text} »` : kind === 'phrase' ? `La phrase « ${text} »` : `Le mot « ${text} »`,
    skillLabel: kind === 'groupe' ? `Écrire le son « ${text} »` : kind === 'phrase' ? `Écrire la phrase « ${text} »` : `Écrire le mot « ${text} »`,
    needs: needsOf(text),
    strokes: composeText(text, { period: kind === 'phrase' }),
    say: kind === 'groupe'
      ? { intro: `Le son « ${text} » s’écrit avec ${text.length} lettres : ${[...text].join(', ')}. Je les écris l’une après l’autre.`, how: `Écris les lettres l’une après l’autre, de gauche à droite${dots ? ', puis pose le point' : ''}.`, bubble: 'Lettre après lettre' }
      : kind === 'phrase'
        ? { intro: `La phrase « ${text} ». J’écris les mots l’un après l’autre, et je pose un point à la fin.`, how: 'Écris chaque mot lettre par lettre, puis pose le point final sur la ligne.', bubble: 'Mot après mot, puis le point' }
        : { intro: `Le mot « ${text} ». J’écris ${L} une par une, et je lève le crayon entre les lettres.`, how: `Écris les lettres une par une, de gauche à droite${dots ? ', puis pose le point du i à la fin' : ''}.`, bubble: 'Lettre par lettre' },
    item: null,
  };
  return id;
};
for (const sec of MOT_SECTIONS) {
  sec.skills = [
    ...(sec.groupes || []).map((t) => mkText(sec, t, 'groupe')),
    ...(sec.mots || []).map((t) => mkText(sec, t, 'mot')),
    ...(sec.phrases || []).map((t) => mkText(sec, t, 'phrase')),
  ];
}

// ---- Niveau 1 (fin) : des mots, puis des phrases, en MAJUSCULES d'imprimerie, du plus simple au plus difficile.
// Même échelle qu'au niveau 3 (longueur, puis difficulté des lettres), mais la difficulté d'une lettre suit ici l'ordre des familles de majuscules.
// Un mot ne s'ouvre que lorsque ses majuscules ont été essayées (comme les mots du niveau 3 avec leurs lettres).
const ECART_MAJ = 1.15, ESPACE_MAJ = 2.6; // entre deux majuscules, entre deux mots : plus large que les cursives, pour que les « routes » du guide ne se chevauchent pas
const POIDS_MAJ = Object.fromEntries(MAJ_SECTIONS.flatMap((sec, i) => [...sec.lettres].map((L) => [L, i + 1])));
const parDifficulteMaj = (liste) => [...liste].sort((a, b) => nbLettres(a) - nbLettres(b) || difficulte(a, POIDS_MAJ) - difficulte(b, POIDS_MAJ) || a.localeCompare(b, 'fr'));
const MOTS_MAJ = [
  { id: 'mm_p1', title: 'Mes premiers mots en capitales', max: 3, mots: ['IL', 'LA', 'LE', 'UN', 'TU', 'LIT', 'OUI', 'ROI', 'RAT', 'BUS'] },
  { id: 'mm_p2', title: 'Les mots de 4 lettres', max: 4, mots: ['LUNE', 'PAPA', 'MAIN', 'DENT', 'NUIT', 'GARE', 'MOTO', 'JOUR', 'PAIN', 'LAIT'] },
  { id: 'mm_p3', title: 'Les mots de 5 lettres', max: 5, mots: ['MAMAN', 'AVION', 'BALLE', 'TIGRE', 'ROUTE', 'SINGE', 'FRUIT', 'LUNDI', 'MERCI'] },
  { id: 'mm_p4', title: 'Les grands mots', max: 99, mots: ['BALLON', 'MAISON', 'ORANGE', 'BATEAU', 'JARDIN', 'CRAYON', 'BONJOUR', 'CARTABLE'] },
];
// Les capitales sont deux fois plus larges que les cursives : au-delà de 8 lettres, une phrase serait trop réduite à l'écran (moins d'un centimètre de haut).
const PHRASES_MAJ = ['je lis', 'tu lis', 'il dort', 'il joue', 'je joue', 'elle rit', 'il a faim', 'il pleut', 'il neige', 'papa lit', 'papa rit', 'tu as faim', 'il a un ami', 'maman lit'].map((t) => t.toUpperCase());
const PAL_PHRASES_MAJ = [
  { id: 'mp_p1', title: 'Mes premières phrases en capitales', max: 6 },
  { id: 'mp_p2', title: 'Des phrases courtes', max: 8 },
];
const SECTIONS_MAJ_TEXTES = [
  ...MOTS_MAJ.map(({ id, title, mots }) => ({ id, title, mots: parDifficulteMaj(mots) })),
  ...PAL_PHRASES_MAJ.map((p) => ({ id: p.id, title: p.title, phrases: parDifficulteMaj(PHRASES_MAJ.filter((t) => PAL_PHRASES_MAJ.find((q) => nbLettres(t) <= q.max) === p)) })),
];
const mkTexteMaj = (sec, text, phrase) => {
  const id = `${phrase ? 'mp' : 'mm'}_${text.replace(/ /g, '_')}`;
  const n = needsOf(text).length;
  SKILLS[id] = {
    id, kind: 'word', level: 1, glyph: text, word: text, section: sec.id, phrase, groupe: false, majMot: true,
    title: phrase ? `La phrase « ${text} »` : `Le mot « ${text} »`,
    label: text, short: phrase ? `La phrase « ${text} »` : `Le mot « ${text} »`,
    skillLabel: phrase ? `Écrire la phrase « ${text} » en capitales` : `Écrire le mot « ${text} » en capitales`,
    needs: needsOf(text).map((L) => `maj_${L}`),
    strokes: composeText(text, { period: phrase, skills: CAPITALES, gap: ECART_MAJ, space: ESPACE_MAJ }),
    say: phrase
      ? { intro: `La phrase « ${text} », en majuscules. J’écris les mots l’un après l’autre, et je pose un point à la fin.`, how: 'Écris chaque mot lettre par lettre, bien droit, puis pose le point final sur la ligne.', bubble: 'Ma phrase en capitales' }
      : { intro: `Le mot « ${text} », en majuscules. J’écris ${n === 1 ? 'la lettre' : 'les lettres'} une par une, de gauche à droite.`, how: 'Écris les lettres une par une, de gauche à droite, bien droites, en levant le crayon entre les lettres.', bubble: 'Lettre par lettre' },
    item: null,
  };
  return id;
};
for (const sec of SECTIONS_MAJ_TEXTES) sec.skills = [...(sec.mots || []).map((t) => mkTexteMaj(sec, t, false)), ...(sec.phrases || []).map((t) => mkTexteMaj(sec, t, true))];

const SEC2 = [
  { id: 'premieres', title: 'Mes premières lettres', skills: ['i', 'o', 'a', 'l', 'e'] },
  { id: 'pointes', title: 'Les petites pointes', skills: ['u', 't', 'n', 'm', 'r'] },
  { id: 'rondes', title: 'Les lettres rondes', skills: ['c', 'd', 's', 'g', 'q'] },
  { id: 'grandes', title: 'Les grandes lettres', skills: ['b', 'h', 'k', 'f', 'p'] },
  { id: 'voyage', title: 'Les lettres qui voyagent', skills: ['j', 'y', 'v', 'w', 'x', 'z'] },
];

export const LEVELS = [
  {
    id: 1, name: 'Les petits explorateurs', classe: 'Avant le CP', ages: 'MS · GS', env: 'foret', available: true,
    // `core` : les formes de départ (récompenses, vignette du hibou) ; les majuscules viennent ensuite, par familles
    core: ['lignes', 'ronds', 'ponts', 'vagues', 'boucles'],
    sections: [{ id: 'formes', title: 'Les formes', skills: ['lignes', 'ronds', 'ponts', 'vagues', 'boucles'] }, ...MAJ_SECTIONS, CHIFFRES_SECTION, ...SECTIONS_MAJ_TEXTES],
    skills: ['lignes', 'ronds', 'ponts', 'vagues', 'boucles', ...MAJ_SECTIONS.flatMap((x) => x.skills), ...CHIFFRES_SECTION.skills, ...SECTIONS_MAJ_TEXTES.flatMap((x) => x.skills)],
    blurb: 'Les formes, les majuscules, les chiffres, puis des mots et des phrases',
  },
  {
    id: 2, name: 'Les apprentis écrivains', classe: 'Début du CP', ages: 'CP', env: 'foret', available: true,
    sections: SEC2, skills: SEC2.flatMap((x) => x.skills),
    blurb: 'Les 26 lettres de l’alphabet, en cursive',
  },
  {
    id: 3, name: 'Les écrivains en herbe', classe: 'Fin du CP', ages: 'CP', env: 'village', available: true,
    sections: MOT_SECTIONS, skills: MOT_SECTIONS.flatMap((x) => x.skills), blurb: 'Les sons, les mots et les phrases, du plus simple au plus difficile',
  },
  {
    id: 4, name: 'Les petits auteurs', classe: 'CE1', ages: 'CE1', env: 'bibliotheque', available: false,
    skills: [], blurb: 'Phrases, dictées et petites histoires',
  },
];

export const ITEMS = {
  echarpe: { id: 'echarpe', type: 'accessoire', name: 'L’écharpe rouge', skill: 'lignes' },
  lunettes: { id: 'lunettes', type: 'accessoire', name: 'Les lunettes rondes', skill: 'ronds' },
  chapeau: { id: 'chapeau', type: 'accessoire', name: 'Le chapeau d’explorateur', skill: 'ponts' },
  noeud: { id: 'noeud', type: 'accessoire', name: 'Le nœud papillon', skill: 'vagues' },
  medaille: { id: 'medaille', type: 'accessoire', name: 'La médaille d’explorateur', skill: 'boucles' },
  iris: { id: 'iris', type: 'decor', name: 'L’iris', skill: 'i' },
  oiseau: { id: 'oiseau', type: 'decor', name: 'L’oiseau', skill: 'o' },
  abeille: { id: 'abeille', type: 'decor', name: 'L’abeille', skill: 'a' },
  lanterne: { id: 'lanterne', type: 'decor', name: 'La lanterne', skill: 'l' },
  ecureuil: { id: 'ecureuil', type: 'decor', name: 'L’écureuil', skill: 'e' },
};

export const skillOrder = LEVELS.flatMap((l) => l.skills);
/** Lettres et mots (écriture) par opposition aux exercices de graphisme du niveau 1. */
export const isWriting = (skill) => skill.kind === 'letter' || skill.kind === 'word';
