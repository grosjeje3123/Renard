// Premier écran à l'ouverture de l'application : « Touche pour jouer ». Le geste de l'enfant débloque le son (règle des tablettes),
// et la petite mélodie de marimba peut alors jouer ; on enchaîne ensuite sur l'accueil, ou sur la présentation si la tablette est neuve.
import { h, icon } from '../dom.js';
import { forestScene } from '../art.js';
import { unlockAudio, jingle } from '../audio.js';
import { needsWelcome } from '../../core/progress.js';

export function demarrage(root, app) {
  root.classList.add('home', 'splash');
  const foxHost = h('div', { class: 'home-fox', 'aria-hidden': 'true' });
  const go = h('button', { class: 'btn-big pulse', type: 'button', html: `${icon('play', 34)}<span>Touche pour jouer</span>` });
  root.append(
    h('div', { class: 'scene-wrap', html: forestScene() }),
    h('div', { class: 'home-main' },
      foxHost,
      h('div', { class: 'home-panel' },
        h('h1', { class: 'logo' }, 'Renard'),
        h('p', { class: 'tagline' }, 'Mon compagnon pour apprendre à écrire'),
        go)),
  );
  const fox = app.makeFox(foxHost);
  fox.setMood('wave', 2800);
  let started = false, timer = 0, parti = false, debut = 0;
  const suite = () => { if (parti) return; parti = true; clearTimeout(timer); app.splashDone = true; app.replace(needsWelcome(app.state) ? 'bienvenue' : 'accueil'); };
  const start = () => {
    if (started) { if (Date.now() - debut > 1200) suite(); return; } // un deuxième toucher (après un moment) passe à la suite sans attendre la fin de la musique
    started = true; debut = Date.now();
    unlockAudio();
    const d = jingle(); // 0 si les sons ou la mélodie sont coupés
    fox.setMood('joy', d ? Math.round(d * 1000) : 1600);
    root.classList.add('leaving');
    timer = setTimeout(suite, d ? Math.round(d * 1000 - 400) : 300); // on enchaîne quand l'accord final vient de tomber
  };
  root.addEventListener('click', start);
  go.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } });
  return () => { clearTimeout(timer); fox.destroy(); };
}
