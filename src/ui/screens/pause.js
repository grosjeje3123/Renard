// Pause à choix : bouger, lire une fiche sur un animal, ou écrire sur le cahier. Jamais une punition :
// le renard propose, l'enfant choisit. Selon le réglage des parents, c'est une suggestion, une sieste du renard
// de quelques minutes (pause douce) ou la fin de la journée (limite du jour).
import { h, icon, pick } from '../dom.js';
import { forestScene } from '../art.js';
import { bubble, makeSpeaker } from '../say.js';
import { stickerSVG } from '../animals.js';
import { STICKERS, STICKER_BY_ID } from '../../content/stickers.js';
import { FICHES } from '../../content/fiches.js';
import { blocked, sleepRemaining, takeBreak, beginSleep, breakDue, overrideLimit } from '../../core/progress.js';
import { sfx } from '../audio.js';

const clock = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

export function pause(root, app) {
  const st = app.state;
  root.classList.add('pause');
  // Arriver ici, c'est déjà prendre sa pause : le compteur d'activité repart de zéro.
  if (st.settings.pauseMode === 'douce' && sleepRemaining(st) === 0 && breakDue(st)) beginSleep(st);
  takeBreak(st);
  app.save();
  const block = blocked(st);

  const owned = STICKERS.filter((s) => st.stickers?.[s.id]);
  const ficheId = owned.slice().sort((a, b) => (st.fiches?.[a.id] || 0) - (st.fiches?.[b.id] || 0))[0]?.id || 'herisson';
  const recent = Object.entries(st.skills).filter(([, s]) => s.sessions > 0).sort((a, b) => (b[1].last || 0) - (a[1].last || 0))[0]?.[0] || 'lignes';
  const moveSticker = pick(owned.length ? owned : [STICKER_BY_ID.herisson]);

  const foxHost = h('div', { class: 'side-fox' });
  const b = bubble();
  const movePanel = h('div', { class: 'move-panel', hidden: true });
  const status = h('p', { class: 'pause-status', 'aria-live': 'polite' });
  const footer = h('div', { class: 'pause-foot' });

  const card = (ic, title, sub, onClick) => h('button', { class: 'pause-card', type: 'button', onClick, html: `<span class="pc-ico">${icon(ic, 46)}</span><strong>${title}</strong><small>${sub}</small>` });
  const cards = [
    card('run', 'Bouger', 'Un petit défi avec le renard', () => {
      sfx('pop');
      movePanel.hidden = false;
      movePanel.replaceChildren(
        h('div', { class: 'mv-art', html: stickerSVG(moveSticker.animal) }),
        h('div', { class: 'mv-text' }, h('h3', {}, moveSticker.name), h('p', {}, FICHES[moveSticker.animal]?.move || 'Bouge comme cet animal !'),
          h('button', { class: 'btn-sec sm', type: 'button', onClick: () => { sfx('win'); fox.setMood('joy', 2500); speaker.say('Bravo, quelle belle pause !', { mood: 'joy', ms: 2500 }); movePanel.hidden = true; } }, 'C’est fait !')));
      speaker.say(FICHES[moveSticker.animal]?.move || 'Bouge comme cet animal !', { mood: 'joy', ms: 3500, icon: 'star' });
      movePanel.scrollIntoView?.({ block: 'nearest' });
    }),
    card('book', 'Lire un animal', owned.length ? 'Une fiche à lire avec le renard' : 'Un animal pour commencer', () => { sfx('pop'); app.ficheFrom = 'pause'; app.fichePick = ficheId; app.go(`fiche-${ficheId}`); }),
    card('pencil', 'Écrire sur le cahier', 'Du vrai papier, avec ton crayon', () => { sfx('pop'); app.cahierFrom = 'pause'; app.go(`cahier-${recent}`); }),
  ];

  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour à l’accueil', onClick: () => app.go('accueil'), html: icon('back', 26) }),
      h('div', { class: 'bar-title' }, h('h2', {}, 'Pause'), h('p', {}, 'Le renard propose, tu choisis'))),
    h('div', { class: 'pause-body' },
      h('aside', { class: 'side' }, foxHost, b),
      h('div', { class: 'pause-main' }, status, h('div', { class: 'pause-cards' }, cards), movePanel, footer)),
  );

  const fox = app.makeFox(foxHost);
  const speaker = makeSpeaker(fox, b);
  let timer = 0, stopHold = () => {};

  if (block === 'limit') {
    fox.setMood('sleep');
    status.textContent = 'Aujourd’hui, c’est fini : à demain !';
    speaker.say('On a bien travaillé aujourd’hui. À demain ! Tu peux quand même bouger, lire ou écrire sur ton cahier.', { icon: 'moon' });
    const ring = h('span', { class: 'ring' });
    const hold = h('button', { class: 'btn-sec sm hold', type: 'button' }, ring, h('span', {}, 'Un adulte peut continuer (maintenir 2 s)'));
    footer.append(hold);
    let raf = 0, t0 = 0;
    stopHold = () => { cancelAnimationFrame(raf); ring.style.setProperty('--p', '0'); };
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / 2000);
      ring.style.setProperty('--p', String(k));
      if (k >= 1) { stopHold(); sfx('unlock'); overrideLimit(st); app.save(); app.go('accueil'); return; }
      raf = requestAnimationFrame(tick);
    };
    hold.addEventListener('pointerdown', (e) => { e.preventDefault(); t0 = performance.now(); raf = requestAnimationFrame(tick); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => hold.addEventListener(ev, stopHold));
  } else if (block === 'sleep') {
    fox.setMood('sleep');
    const back = h('button', { class: 'btn-big sm', type: 'button', hidden: true, onClick: () => { sfx('pop'); app.go('accueil'); }, html: `${icon('play', 28)}<span>Je reviens !</span>` });
    footer.append(back);
    const update = () => {
      const left = sleepRemaining(st);
      if (left > 0) { status.textContent = `Le renard fait la sieste : encore ${clock(left)}`; return; }
      clearInterval(timer);
      status.textContent = 'Le renard est réveillé !';
      fox.setMood('joy', 2500);
      back.hidden = false;
    };
    update();
    timer = setInterval(update, 1000);
    speaker.say('Je fais une petite sieste. Pendant ce temps, tu peux bouger, lire ou écrire sur ton cahier !', { icon: 'moon' });
  } else {
    status.textContent = '';
    footer.append(h('button', { class: 'btn-sec', type: 'button', onClick: () => { sfx('tap'); app.go('accueil'); } }, 'Je continue à jouer'));
    speaker.say('J’ai bien travaillé avec toi ! On fait autre chose un petit moment ?', { mood: 'joy', ms: 2500, icon: 'moon' });
  }
  return () => { clearInterval(timer); stopHold(); fox.destroy(); };
}
