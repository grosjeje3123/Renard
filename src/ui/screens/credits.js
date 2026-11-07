// Crédits : qui a fait quoi, d'où viennent les voix, les polices et les outils. Texte dans content/credits.js.
import { h, icon } from '../dom.js';
import { forestScene } from '../art.js';
import { sfx, hasClips } from '../audio.js';
import { CREDITS } from '../../content/credits.js';
import { version } from '../version.js';

export function credits(root, app) {
  root.classList.add('parents', 'credits');
  const sections = CREDITS.map(([titre, corps]) => {
    const paras = Array.isArray(corps) ? corps : hasClips() ? corps.voixIA : corps.voixSysteme;
    return h('section', { class: 'pcard' }, h('h3', {}, titre), ...paras.map((t) => h('p', { class: 'cr-p' }, t)));
  });
  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour aux options', onClick: () => { sfx('tap'); app.go('options'); }, html: icon('back', 26) }),
      h('h2', {}, 'Crédits')),
    h('div', { class: 'pgrid' }, sections),
    h('p', { class: 'cr-version' }, `Renard · ${version()}`),
  );
}
