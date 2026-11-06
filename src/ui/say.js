// Bulle de parole du renard : texte court, pictogramme, lecture à voix haute, bouche animée.
import { h, icon } from './dom.js';
import { speak } from './audio.js';

/** Typographie française : espace insécable avant ? ! : ; et autour des guillemets. */
export const fr = (t) => t.replace(/ ([?!:;»])/g, '\u00A0$1').replace(/« /g, '«\u00A0').replace(/(\d) (?=\d{3}\b)/g, '$1\u00A0');

export function bubble({ big = false } = {}) {
  const ico = h('span', { class: 'b-ico', 'aria-hidden': 'true' });
  const p = h('p', { class: 'b-text', 'aria-live': 'polite' });
  const btn = h('button', { class: 'b-say', type: 'button', 'aria-label': 'Écouter le renard', html: icon('speaker', 22) });
  return h('div', { class: 'bubble' + (big ? ' big' : '') }, ico, p, btn);
}

/** Consignes d'arrivée déjà lues dans cette session (pour ne pas les répéter à chaque retour sur l'écran). */
const dejaLues = new Set();

export function makeSpeaker(fox, bubbleEl) {
  const p = bubbleEl.querySelector('.b-text');
  const ico = bubbleEl.querySelector('.b-ico');
  let last = '';
  const api = {
    async say(text, { mood, icon: ic, ms, silent = false, once = null, dit } = {}) {
      last = text;
      if (once) { if (dejaLues.has(once)) silent = true; else dejaLues.add(once); } // `once` : lu à voix haute la première fois seulement
      p.textContent = fr(text);
      ico.innerHTML = ic ? icon(ic, 30) : '';
      ico.hidden = !ic;
      bubbleEl.classList.remove('pop'); void bubbleEl.offsetWidth; bubbleEl.classList.add('pop');
      if (mood) fox.setMood(mood, ms ?? 2800);
      if (silent) return;
      await speak(text, { dit, onStart: () => fox.talk(true), onEnd: () => fox.talk(false) });
    },
    repeat() { return last ? api.say(last) : Promise.resolve(); },
    get last() { return last; },
  };
  bubbleEl.querySelector('.b-say').addEventListener('click', () => api.repeat());
  return api;
}
