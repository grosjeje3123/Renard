// Présentation du premier lancement : le prénom, la classe, la main qui écrit. Trois questions, toutes passables.
// Le renard lit chaque question à voix haute ; un adulte peut aider pour répondre. La classe règle le niveau de départ
// (la grande section ouvre aussi les majuscules d'emblée) : on n'a plus à tout débloquer à la main.
import { h, icon } from '../dom.js';
import { forestScene } from '../art.js';
import { bubble, makeSpeaker } from '../say.js';
import { sfx } from '../audio.js';
import { CLASSES, setClasse, cleanName } from '../../core/progress.js';
import { seg } from './parents-tools.js';

export function bienvenue(root, app) {
  const st = app.state, set = st.settings;
  const revisit = set.accueilFait; // ouverte depuis Options : on peut refaire les choix
  root.classList.add('home', 'welcome');
  const foxHost = h('div', { class: 'home-fox', role: 'button', tabindex: '0', 'aria-label': 'Caresser le renard' });
  const b = bubble({ big: true });
  const dots = h('div', { class: 'wl-dots', 'aria-hidden': 'true' }, [0, 1, 2, 3].map(() => h('i')));
  const body = h('div', { class: 'wl-body' });
  const panel = h('div', { class: 'home-panel wl-panel' }, h('h1', { class: 'logo sm' }, 'Renard'), b, body, dots);
  const skip = h('button', { class: 'btn-sec sm wl-skip', type: 'button', onClick: () => { sfx('tap'); finish(false); } }, revisit ? 'Fermer' : 'Passer');

  root.append(
    h('div', { class: 'scene-wrap', html: forestScene() }),
    h('header', { class: 'top-right' }, skip),
    h('div', { class: 'home-main' }, foxHost, panel),
  );
  const fox = app.makeFox(foxHost);
  const speaker = makeSpeaker(fox, b);
  foxHost.addEventListener('click', () => { sfx('giggle'); fox.setMood('joy', 1400); });
  let timer = 0;

  function finish(said) {
    clearTimeout(timer);
    set.accueilFait = true;
    app.applySettings();
    if (said) sfx('win');
    app.replace(revisit ? 'options' : 'accueil');
  }
  const mark = (i) => [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));

  // ---- 1. Le prénom
  function stepName() {
    mark(0);
    const input = h('input', { class: 'wl-input', type: 'text', maxlength: '16', value: st.name, placeholder: 'Ton prénom', autocomplete: 'off', autocapitalize: 'words', 'aria-label': 'Prénom de l’enfant' });
    const next = h('button', { class: 'btn-big sm', type: 'button', html: `<span>Suivant</span>${icon('arrowR', 28)}` });
    const go = () => { st.name = cleanName(input.value); app.save(); sfx('pop'); stepClasse(); };
    next.addEventListener('click', go);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    body.replaceChildren(input, h('p', { class: 'muted' }, 'Facultatif. Un adulte peut aider à écrire. Le prénom reste sur cette tablette.'), next);
    speaker.say('Bonjour ! Je m’appelle Renard. Et toi, comment tu t’appelles ?', { mood: 'wave', icon: 'hand' });
  }

  // ---- 2. La classe
  function stepClasse() {
    mark(1);
    const tiles = CLASSES.map((c) => h('button', { class: `wl-tile${set.classe === c.id ? ' on' : ''}`, type: 'button', 'data-classe': c.id },
      h('strong', {}, c.label), h('small', {}, c.sub)));
    tiles.forEach((t, i) => t.addEventListener('click', () => {
      sfx('pop');
      setClasse(st, CLASSES[i].id); app.applySettings();
      tiles.forEach((x, k) => x.classList.toggle('on', k === i));
      timer = setTimeout(stepMain, 380);
    }));
    body.replaceChildren(h('div', { class: 'wl-grid' }, tiles), h('p', { class: 'muted' }, 'Le renard ouvre d’emblée ce qui précède. Tu pourras changer dans les options.'));
    speaker.say('Tu es en quelle classe ?', { icon: 'book' });
  }

  // ---- 3. La main
  function stepMain() {
    mark(2);
    const mains = [['gauche', 'Main gauche'], ['droite', 'Main droite']]; // dans l'ordre où on les voit : la main gauche à gauche, la main droite à droite
    const tiles = mains.map(([id, label]) => h('button', { class: `wl-tile hand ${id}${(set.main || 'droite') === id && revisit ? ' on' : ''}`, type: 'button', 'data-main': id },
      h('span', { class: 'wl-hand', html: icon('hand', 64) }), h('strong', {}, label)));
    tiles.forEach((t, i) => t.addEventListener('click', () => {
      sfx('pop');
      set.main = mains[i][0]; app.applySettings();
      tiles.forEach((x, k) => x.classList.toggle('on', k === i));
      timer = setTimeout(stepAdulte, 380);
    }));
    body.replaceChildren(h('div', { class: 'wl-grid two' }, tiles), h('p', { class: 'muted' }, 'Pour un gaucher, l’écran passe en miroir.'));
    speaker.say('Et tu écris avec quelle main ?', { icon: 'hand' });
  }

  // ---- 4. Pour les adultes : le temps d'écran (valeurs conseillées déjà choisies, modifiables plus tard dans l'espace parents)
  function stepAdulte() {
    mark(3);
    const pauseSeg = seg('Pause conseillée après', [[10, '10 min'], [15, '15 min'], [20, '20 min'], [0, 'Jamais']], set.pauseMin, (v) => { set.pauseMin = v; app.save(); });
    const limite = set.pauseMode === 'limite' ? set.limiteMin : 0;
    const limSeg = seg('Limite par jour', [[0, 'Aucune'], [20, '20 min'], [30, '30 min'], [45, '45 min'], [60, '1 h']], limite, (v) => {
      if (v) { set.pauseMode = 'limite'; set.limiteMin = v; } else if (set.pauseMode === 'limite') set.pauseMode = 'suggestion';
      app.save();
    });
    const next = h('button', { class: 'btn-big sm', type: 'button', html: `<span>Suivant</span>${icon('arrowR', 28)}` });
    next.addEventListener('click', () => { sfx('pop'); stepEnd(); });
    body.replaceChildren(
      h('div', { class: 'wl-adulte' },
        h('p', { class: 'wl-kicker' }, 'Pour les adultes'),
        h('div', { class: 'wl-row' }, h('strong', {}, 'Le renard propose une pause après'), pauseSeg),
        h('div', { class: 'wl-row' }, h('strong', {}, 'Limite par jour'), limSeg),
        h('p', { class: 'muted' }, 'Seul le temps d’activité compte, et le renard n’interrompt jamais un essai. Tout se change plus tard dans l’espace parents (cadenas de l’accueil, appui de deux secondes).')),
      next);
    speaker.say('Une question pour un adulte : combien de temps on écrit ensemble ?', { icon: 'moon' });
  }

  // ---- 5. En route
  function stepEnd() {
    mark(4);
    const go = h('button', { class: 'btn-big', type: 'button', html: `${icon('play', 34)}<span>C’est parti !</span>` });
    go.addEventListener('click', () => finish(true));
    body.replaceChildren(go);
    speaker.say('Super ! On va bien s’amuser ensemble.', { mood: 'joy', icon: 'star' });
    sfx('ok');
  }

  stepName();
  return () => { clearTimeout(timer); fox.destroy(); };
}
