// Comment ça marche : tout sur une seule page, sans défiler.
// À gauche, un seul cahier montre les trois étapes l'une après l'autre (le guide, puis on efface et ce sont les pointillés, puis tout seul),
// racontées par le renard ; on touche une étape pour la revoir. À droite, pour les parents, les conditions de réussite en un coup d'œil.
// Montrée au premier lancement, et toujours accessible par le bouton « Démarche ». Adresse : #methode ou #methode-<exercice> (on y enchaîne).
import { h, icon, sleep } from '../dom.js';
import { forestScene, templateOf } from '../art.js';
import { Board } from '../board.js';
import { bubble, makeSpeaker } from '../say.js';
import { sfx } from '../audio.js';
import { REGLES } from '../../content/regles.js';

/** L'exemple montré : un geste simple et net, qui a un point de départ, un sens et un chemin. */
const EXEMPLE = 'vagues';

export const ETAPES = [
  { titre: 'Le guide', court: 'Je suis le chemin avec mon doigt : point vert pour partir, flèches pour le sens.' },
  { titre: 'Les pointillés', court: 'Le chemin s’efface : je suis les points.' },
  { titre: 'Tout seul', court: 'Plus d’aide : j’écris de mémoire, en partant du point vert.' },
];

/** Les conditions de réussite, pour les parents. */
const CONDITIONS = [
  ['Un essai réussi', '2 étoiles sur 3 ou plus.'],
  ['Un exercice acquis', 'une réussite à chaque étape ; la dernière, tout seul, sans revoir le modèle.'],
  ['Si c’est difficile', '3 ratés de suite : retour à l’étape d’avant, le renard remontre le geste. Jamais de punition.'],
  ['S’il est à l’aise', 'il saute le guide, puis passe au défi « tout seul » d’emblée.'],
];

export function methode(root, app, arg) {
  const st = app.state, set = st.settings;
  set.methodeVue = true; // vue une fois : l'accueil n'y renvoie plus
  app.save();
  const suite = arg && arg !== 'accueil' ? `exercice-${arg}` : null;

  const foxHost = h('div', { class: 'mt-fox' });
  const b = bubble();
  const host = h('div', { class: 'board-host mt-one' });
  const steps = ETAPES.map((e, i) => h('button', { class: 'mt-pill', type: 'button', 'data-etape': String(i), 'aria-label': `Étape ${i + 1} sur 3 : ${e.titre}. Toucher pour revoir.` },
    h('span', { class: 'mt-n', 'aria-hidden': 'true' }, String(i + 1)), h('span', {}, e.titre)));

  const go = h('button', { class: 'btn-big sm', type: 'button', html: `${icon(suite ? 'play' : 'check', 30)}<span>${suite ? 'C’est parti !' : 'Compris !'}</span>` });
  const again = h('button', { class: 'btn-sec sm', type: 'button', html: `${icon('replay', 22)}<span>Revoir</span>` });

  root.classList.add('levels', 'methode');
  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': suite ? 'Passer' : 'Retour à l’accueil', onClick: () => { sfx('tap'); app.go(suite || 'accueil'); }, html: icon(suite ? 'close' : 'back', 26) }),
      h('div', { class: 'bar-title' }, h('h2', {}, 'Comment ça marche ?'), h('p', {}, 'Chaque exercice se fait en trois étapes'))),
    h('div', { class: 'mt2' },
      h('section', { class: 'mt2-show' },
        h('div', { class: 'mt-pills' }, steps),
        host,
        h('div', { class: 'mt-talk' }, foxHost, h('div', { class: 'mt-talk-r' }, b))),
      h('section', { class: 'mt2-rules', 'aria-label': 'Pour les parents : les conditions de réussite' },
        h('p', { class: 'wl-kicker' }, 'Pour les parents'),
        h('h3', {}, 'Les conditions de réussite'),
        h('dl', { class: 'regles mt-cond' }, CONDITIONS.flatMap(([k, t]) => [h('dt', {}, k), h('dd', {}, t)])),
        h('h3', {}, 'Ce que le renard regarde'),
        h('ul', { class: 'mt-crit' }, REGLES.map((r) => h('li', {}, h('strong', {}, r.titre), ' : ', r.texte.charAt(0).toLowerCase() + r.texte.slice(1).replace(/\.$/, '')))),
        h('div', { class: 'mt-actions' }, again, go))),
  );

  // Un seul cahier : on montre l'étape, puis on efface et on passe à la suivante (le vrai plateau, avec ses vraies règles d'affichage).
  const board = new Board(host, templateOf(EXEMPLE), {});
  board.setProgress(0, 0);
  board.enable(false);
  const fox = app.makeFox(foxHost);
  const speaker = makeSpeaker(fox, b);
  let alive = true, run = 0;
  const montrer = (i) => {
    steps.forEach((s, k) => { s.classList.toggle('on', k === i); s.classList.toggle('past', k < i); });
    board.cancelDemo();
    board.setPhase(i);
  };
  const lignes = [
    () => speaker.say('Étape 1 : le guide. Je suis le chemin avec mon doigt.', { mood: 'neutral', icon: 'eye', ms: 2600 }),
    () => speaker.say('Étape 2 : les pointillés. Je suis les points.', { mood: 'neutral', icon: 'eye', ms: 2600 }),
    () => speaker.say('Étape 3 : tout seul ! J’écris de mémoire, comme un grand.', { mood: 'joy', icon: 'star', ms: 2800 }),
  ];

  async function raconter(seule = -1) {
    const mine = ++run, live = () => alive && mine === run;
    if (seule < 0) await Promise.all([speaker.say('Pour chaque exercice, on fait trois étapes. Regarde !', { mood: 'wave', icon: 'hand', ms: 2400 }), sleep(1800)]);
    for (let i = seule < 0 ? 0 : seule; i < 3; i++) {
      if (!live()) return;
      montrer(i);
      const demo = sleep(450).then(() => live() && board.playDemo());
      await Promise.all([lignes[i](), sleep(3400), demo]);
      if (seule >= 0) return;
    }
    if (!live()) return;
    steps.forEach((s) => { s.classList.remove('on'); s.classList.add('past'); });
    await speaker.say('Quand tu as réussi les trois étapes, l’exercice est gagné !', { mood: 'joy', icon: 'star', ms: 2800 });
  }

  montrer(0);
  steps.forEach((s, i) => s.addEventListener('click', () => { sfx('tap'); raconter(i); }));
  again.addEventListener('click', () => { sfx('tap'); raconter(); });
  go.addEventListener('click', () => { sfx('pop'); app.go(suite || 'accueil'); });
  setTimeout(() => alive && raconter(), 500);
  return () => { alive = false; run++; board.destroy(); fox.destroy(); };
}
