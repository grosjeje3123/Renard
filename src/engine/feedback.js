// Retours pédagogiques : toujours un compliment précis d'abord, puis au plus un conseil.
// Ordre des conseils : sens et départ (ce qu'on ne corrige plus une fois pris l'habitude),
// puis forme, proportions, lignes, enfin fluidité.

export const PRAISE = {
  start: ['Tu as bien commencé au point vert !', 'Bon départ !'],
  direction: ['Tu as suivi le bon sens !', 'Tu vas dans le bon sens !'],
  shape: ['Quel joli tracé !', 'Tu as bien suivi le chemin !', 'Ta forme est très réussie !'],
  size: ['Tu as pris la bonne place !', 'La taille est parfaite !'],
  lines: ['Ton écriture est bien posée sur la ligne !', 'Tu as bien respecté les lignes !'],
  flow: ['Quel beau geste, tout en douceur !', 'Tu écris sans t’arrêter, super !'],
};

export const TIPS = [
  ['sens-inverse', 'Regarde les flèches : on va dans l’autre sens.'],
  ['depart-loin', 'On commence au point vert.'],
  ['point-loin', 'Le point se pose juste au-dessus.'],
  ['point-trop-long', 'Pour le point, tape une seule fois.'],
  ['incomplet', 'Continue jusqu’au bout du chemin !'],
  ['trop-petit', 'Tu peux faire un peu plus grand !'],
  ['trop-grand', 'Un peu plus petit, pour rester dans les lignes.'],
  ['flotte', 'Va jusqu’à la ligne du bas.'],
  ['descend-trop', 'Pose bien sur la ligne du bas.'],
  ['haut-court', 'Monte jusqu’à la ligne du haut.'],
  ['haut-depasse', 'Ne dépasse pas la ligne du haut.'],
  ['hors-chemin', 'Essaie de rester sur le chemin.'],
  ['tremble', 'Va tout doucement, sans trembler.'],
  ['leve', 'Essaie de ne pas lever ton doigt.'],
  ['pause', 'Tu peux avancer sans t’arrêter.'],
];

export const LEAD = {
  3: ['Bravo !', 'Magnifique !', 'Super travail !'],
  2: ['Très bien !', 'Joli !', 'C’est bien !'],
  1: ['Bien essayé !', 'Tu y es presque !'],
  0: ['Pas de souci, on réessaie.'],
};
const MOOD = { 3: 'joy', 2: 'encourage', 1: 'encourage', 0: 'think' };

let lastPick = {};
const pick = (key, arr) => {
  let i = Math.floor(Math.random() * arr.length);
  if (arr.length > 1 && lastPick[key] === i) i = (i + 1) % arr.length;
  lastPick[key] = i;
  return arr[i];
};

export function buildFeedback(evaluation, opts = {}) {
  const { stars, criteria, tags } = evaluation;
  const lead = pick('lead' + stars, LEAD[stars]);
  const tip = TIPS.find(([tag]) => tags.includes(tag));
  let praise = null;
  if (stars >= 2) {
    const order = ['direction', 'start', 'shape', 'lines', 'size', 'flow'];
    const best = order.filter((k) => criteria[k] >= 0.85).sort((a, b) => criteria[b] - criteria[a])[0];
    if (best && (!tip || !tip[0].startsWith(best))) praise = pick('p' + best, PRAISE[best]);
  }
  const parts = [lead];
  if (stars === 3) { if (praise) parts.push(praise); }
  else {
    if (praise) parts.push(praise);
    if (tip) parts.push(tip[1]);
  }
  if (stars === 0 && opts.rewatch) parts.push('Regardons ensemble.');
  return { mood: MOOD[stars], text: parts.join(' '), tip: tip ? tip[0] : null, stars };
}
