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
  let started = false, timer = 0;
  const start = () => {
    if (started) return;
    started = true;
    unlockAudio();
    const d = jingle(); // 0 si les sons ou la mélodie sont coupés
    fox.setMood('joy', 1600);
    root.classList.add('leaving');
    timer = setTimeout(() => { app.splashDone = true; app.replace(needsWelcome(app.state) ? 'bienvenue' : 'accueil'); }, d ? 1200 : 300);
  };
  root.addEventListener('click', start);
  go.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); } });
  return () => { clearTimeout(timer); fox.destroy(); };
}
