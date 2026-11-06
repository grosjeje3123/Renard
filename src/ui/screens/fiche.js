// Fiche animal à lire (et à écouter) : quelques petits faits, un défi pour bouger et une phrase à raconter.
import { h, icon, sleep } from '../dom.js';
import { forestScene } from '../art.js';
import { stickerSVG } from '../animals.js';
import { bubble, makeSpeaker, fr } from '../say.js';
import { STICKER_BY_ID } from '../../content/stickers.js';
import { FICHES, factsOf } from '../../content/fiches.js';
import { sfx, speak, stopSpeaking } from '../audio.js';

export function fiche(root, app, id) {
  const st = app.state, s = STICKER_BY_ID[id];
  // L'animal du jour pour commencer est offert à la lecture même sans vignette (le hérisson).
  if (!s || (!st.stickers?.[id] && id !== 'herisson')) { app.go('album'); return; }
  const from = app.ficheFrom || 'album';
  app.ficheFrom = null;
  st.fiches = st.fiches || {};
  st.fiches[id] = (st.fiches[id] || 0) + 1;
  app.save();
  root.classList.add('fiche');

  const foxHost = h('div', { class: 'side-fox' });
  const b = bubble();
  const facts = factsOf(s);
  let alive = true, reading = false;
  const items = facts.map((t, i) => h('li', { class: 'fact' },
    h('button', { class: 'fact-say', type: 'button', 'aria-label': 'Écouter cette phrase', html: icon('speaker', 24), onClick: () => { sfx('tap'); sayFact(i); } }),
    h('p', {}, fr(t))));
  const move = FICHES[s.animal]?.move;
  const readBtn = h('button', { class: 'btn-sec', type: 'button', html: `${icon('speaker', 22)}<span>Tout lire</span>` });

  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour', onClick: () => app.go(from), html: icon('back', 26) }),
      h('div', { class: 'bar-title' }, h('h2', {}, s.name), h('p', {}, 'Fiche animal'))),
    h('div', { class: 'fiche-body' },
      h('aside', { class: 'side' }, foxHost, b),
      h('div', { class: 'fiche-main' },
        h('div', { class: 'fiche-top' }, h('div', { class: 'fiche-art', html: stickerSVG(s.animal) }), h('ul', { class: 'facts' }, items)),
        move ? h('div', { class: 'fiche-box' }, h('strong', {}, 'Bouge avec le renard'), h('p', {}, move)) : null,
        h('div', { class: 'fiche-box' }, h('strong', {}, 'Raconte'), h('p', {}, 'Dis à un adulte une chose que tu as retenue.')),
        h('div', { class: 'fiche-foot' }, readBtn, h('button', { class: 'btn-big sm', type: 'button', onClick: () => { sfx('pop'); app.go(from); }, html: `${icon('check', 28)}<span>J’ai fini</span>` })))),
  );

  const fox = app.makeFox(foxHost);
  const speaker = makeSpeaker(fox, b);
  speaker.say(`Voici ${s.name.charAt(0).toLowerCase()}${s.name.slice(1)} ! Touche un haut-parleur pour l’écouter, ou « Tout lire ».`, { silent: true, icon: 'book' });

  const mark = (i) => items.forEach((li, k) => li.classList.toggle('on', k === i));
  async function sayFact(i) {
    mark(i);
    await speak(facts[i], { onStart: () => fox.talk(true), onEnd: () => fox.talk(false) });
  }
  readBtn.addEventListener('click', async () => {
    if (reading) { reading = false; stopSpeaking(); mark(-1); return; }
    sfx('tap');
    reading = true;
    for (let i = 0; i < facts.length && reading && alive; i++) {
      await sayFact(i);
      await sleep(st.settings.voix ? 350 : 1800); // sans voix, le temps de lire en silence
    }
    reading = false; mark(-1);
  });
  return () => { alive = false; reading = false; stopSpeaking(); fox.destroy(); };
}
