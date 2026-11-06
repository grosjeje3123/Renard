// Contenu pédagogique (données). Ajouter un exercice = ajouter une entrée ici,
// sans toucher au moteur ni à l'interface.
import { P } from './helpers.js';
import { parsePath } from '../engine/pathdata.js';
import { LETTRES, hampe, ent, sortie, ovale } from './lettres.js';
import { CAPITALES } from './majuscules.js';
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
export function composeText(text, { period = false, skills = SKILLS } = {}) {
  const out = [];
  let cursor = 0;
  text.split(' ').forEach((word, wi) => {
    const paths = [], dots = [];
    if (wi) cursor += SPACE_GAP - WORD_GAP;
    for (const id of word) {
      const strokes = skills[id].strokes;
      const sk = skills[id];
      const xs = strokes.filter((st) => st.d).flatMap((st) => parsePath(st.d)).map((q) => (sk.upright ? q.x + BOARD.slant * q.y : q.x));
      const dx = cursor - Math.min(...xs);
      for (const st of strokes) (st.d ? paths : dots).push(st.d ? { d: shiftD(st.d, dx) } : { dot: [st.dot[0] + dx, st.dot[1]] });
      cursor += Math.max(...xs) - Math.min(...xs) + WORD_GAP;
    }
    out.push(...paths, ...dots);
  });
  if (period) out.push({ dot: [cursor - WORD_GAP + 0.55, 0] });
  return out;
}
/** Minuscules cursives (a–z) et majuscules d'imprimerie (A–Z) : le registre du tableau libre. */
export const ECRITURE = { ...SKILLS, ...CAPITALES };
export const composeWord = (letters, skills = SKILLS) => composeText(letters.join(''), { skills });

// ---- Niveau 3 : les sons, les mots, les phrases. Tout est composé avec les lettres : on n'écrit ici que du texte.
const GROUPES = ['ou', 'on', 'an', 'in', 'ch', 'oi', 'au', 'eau', 'ai', 'eu', 'gn', 'qu'];
const MOT_SECTIONS = [
  { id: 'premiers', title: 'Mes premiers mots', mots: ['il', 'la', 'le', 'loi', 'oie', 'aile'] },
  { id: 'sons', title: 'Les sons', groupes: GROUPES },
  { id: 'famille', title: 'La famille', mots: ['papa', 'maman', 'mamie', 'papi', 'tata', 'ami'] },
  { id: 'animaux', title: 'Les animaux', mots: ['chat', 'chien', 'lapin', 'souris', 'loup', 'ours', 'lion', 'vache', 'canard', 'cheval'] },
  { id: 'nature', title: 'La nature', mots: ['lune', 'soleil', 'fleur', 'arbre', 'pluie', 'neige', 'vent', 'sable'] },
  { id: 'maison', title: 'À la maison', mots: ['table', 'livre', 'porte', 'lit', 'sac', 'robe', 'pomme', 'poire', 'pain', 'lait'] },
  { id: 'couleurs', title: 'Les couleurs', mots: ['rouge', 'vert', 'bleu', 'jaune', 'noir', 'blanc', 'gris', 'rose'] },
  { id: 'phrases', title: 'Mes premières phrases', phrases: ['il pleut', 'il neige', 'papa lit', 'il a un ami', 'le chat dort', 'un ours dort', 'le bebe dort', 'tu as un ami', 'le lion rugit', 'il a un chien', 'mon ami joue', 'la lune brille', 'le loup a faim', 'le lapin saute'] },
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
    skills: ['lignes', 'ronds', 'ponts', 'vagues', 'boucles'],
    blurb: 'Lignes, ronds, ponts, vagues et boucles',
  },
  {
    id: 2, name: 'Les apprentis écrivains', classe: 'Début du CP', ages: 'CP', env: 'foret', available: true,
    sections: SEC2, skills: SEC2.flatMap((x) => x.skills),
    blurb: 'Les 26 lettres de l’alphabet, en cursive',
  },
  {
    id: 3, name: 'Les écrivains en herbe', classe: 'Fin du CP', ages: 'CP', env: 'village', available: true,
    sections: MOT_SECTIONS, skills: MOT_SECTIONS.flatMap((x) => x.skills), blurb: 'Les sons, les mots et les premières phrases',
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
