// Comment ça marche : la démarche d'un exercice, montrée en vrai avec trois petits cahiers (le guide, les pointillés, tout seul).
// Le renard raconte les trois étapes l'une après l'autre ; on peut toucher une étape pour la revoir. Montrée une fois avant le premier exercice
// lancé depuis l'accueil, et toujours accessible depuis le bouton « Comment ça marche ». Adresse : #methode ou #methode-<exercice> (on y enchaîne).
import { h, icon, sleep } from '../dom.js';
import { forestScene, templateOf } from '../art.js';
import { Board } from '../board.js';
import { bubble, makeSpeaker } from '../say.js';
import { sfx } from '../audio.js';
import { reglesList } from './parents-tools.js';
import { REGLES_NOTE } from '../../content/regles.js';

/** L'exemple montré : un geste simple et net, qui a un point de départ, un sens et un chemin. */
const EXEMPLE = 'vagues';

export const ETAPES = [
  { titre: 'Le guide', court: 'Je suis le chemin', texte: 'Le renard montre le geste. Je le refais avec mon doigt, sur le chemin : le point vert pour commencer, les flèches pour le sens.' },
  { titre: 'Les pointillés', court: 'Je suis les points', texte: 'Le chemin plein disparaît. Il ne reste que des points : je les suis, et le geste devient le mien.' },
  { titre: 'Tout seul', court: 'J’écris de mémoire', texte: 'Plus d’aide ! Je pars du point vert et j’écris de mémoire, comme un grand.' },
];

export function methode(root, app, arg) {
  const st = app.state, set = st.settings;
  set.methodeVue = true; // vue une fois : l'accueil n'y renvoie plus
  app.save();
  const suite = arg && arg !== 'accueil' ? `exercice-${arg}` : null;

  const tpl = templateOf(EXEMPLE);
  const foxHost = h('div', { class: 'side-fox' });
  const b = bubble();
  const boards = [], cards = [];

  const steps = ETAPES.map((e, i) => {
    const host = h('div', { class: 'board-host mt-board' });
    const card = h('button', { class: 'mt-step', type: 'button', 'aria-label': `Étape ${i + 1} sur 3 : ${e.titre}. ${e.court}. Toucher pour revoir.`, 'data-etape': String(i) },
      h('span', { class: 'mt-head' }, h('span', { class: 'mt-n', 'aria-hidden': 'true' }, String(i + 1)), h('strong', {}, e.titre)),
      host,
      h('span', { class: 'mt-court' }, e.court),
      h('span', { class: 'mt-text' }, e.texte));
    cards.push(card);
    return { host, card };
  });

  const go = h('button', { class: 'btn-big', type: 'button', html: `${icon(suite ? 'play' : 'check', 34)}<span>${suite ? 'C’est parti !' : 'Compris !'}</span>` });
  const again = h('button', { class: 'btn-sec sm', type: 'button', html: `${icon('replay', 22)}<span>Revoir</span>` });

  root.classList.add('levels', 'methode');
  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': suite ? 'Passer' : 'Retour à l’accueil', onClick: () => { sfx('tap'); app.go(suite || 'accueil'); }, html: icon(suite ? 'close' : 'back', 26) }),
      h('div', { class: 'bar-title' }, h('h2', {}, 'Comment ça marche ?'), h('p', {}, 'Chaque exercice se fait en trois étapes'))),
    h('div', { class: 'mt-body' },
      h('aside', { class: 'side' }, foxHost, b),
      h('div', { class: 'mt-main' },
        h('div', { class: 'mt-steps' }, steps.map((s) => s.card)),
        h('p', { class: 'mt-foot' }, 'Trois étapes réussies, et l’exercice est gagné ! Si c’est difficile, le renard revient en arrière et montre le geste : il n’y a jamais de punition.'),
        h('div', { class: 'mt-actions' }, again, go),
        h('details', { class: 'mt-adultes', open: '' },
          h('summary', {}, 'Pour les adultes : ce que le renard regarde'),
          reglesList(),
          h('p', { class: 'muted' }, REGLES_NOTE)))),
  );

  // Trois cahiers, un par étape : la même lettre, avec de moins en moins d'aide (c'est le vrai plateau, avec ses vraies règles d'affichage).
  steps.forEach((s, i) => {
    const bd = new Board(s.host, tpl, {});
    bd.setPhase(i);
    bd.setProgress(0, 0);
    bd.enable(false);
    boards.push(bd);
  });

  const fox = app.makeFox(foxHost);
  const speaker = makeSpeaker(fox, b);
  let alive = true, run = 0;
  const mark = (k) => cards.forEach((c, i) => c.classList.toggle('on', i === k));
  const pause = (ms) => sleep(ms);

  async function raconter(from = -1) {
    const mine = ++run, live = () => alive && mine === run;
    boards.forEach((bd) => bd.cancelDemo());
    mark(-1);
    if (from < 0) {
      await Promise.all([speaker.say('Pour chaque exercice, on fait trois étapes. Regarde !', { mood: 'wave', icon: 'hand', ms: 2400 }), pause(2200)]);
    }
    const lignes = [
      () => speaker.say('Étape 1 : le guide. Je suis le chemin avec mon doigt.', { mood: 'neutral', icon: 'eye', ms: 2600 }),
      () => speaker.say('Étape 2 : les pointillés. Je suis les points.', { mood: 'neutral', icon: 'eye', ms: 2600 }),
      () => speaker.say('Étape 3 : tout seul ! J’écris de mémoire, comme un grand.', { mood: 'joy', icon: 'star', ms: 2800 }),
    ];
    for (let i = Math.max(0, from); i < 3; i++) {
      if (!live()) return;
      mark(i);
      cards[i].scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      const demo = pause(500).then(() => live() && boards[i].playDemo());
      await Promise.all([lignes[i](), pause(3000), demo]);
      if (from >= 0) break; // une étape touchée : on ne raconte que celle-là
    }
    if (!live()) return;
    mark(-1);
    if (from < 0) await Promise.all([speaker.say('Quand tu as réussi les trois étapes, l’exercice est gagné !', { mood: 'joy', icon: 'star', ms: 2800 }), pause(2400)]);
  }

  cards.forEach((c, i) => c.addEventListener('click', () => { sfx('tap'); raconter(i); }));
  again.addEventListener('click', () => { sfx('tap'); raconter(); });
  go.addEventListener('click', () => { sfx('pop'); app.go(suite || 'accueil'); });

  setTimeout(() => alive && raconter(), 500);
  return () => { alive = false; run++; boards.forEach((bd) => bd.destroy()); fox.destroy(); };
}
