// Ma galerie : les dessins que l'enfant a choisi d'accrocher dans la forêt du renard.
// Visible seulement si les parents ont activé la galerie (réglage désactivé par défaut). Les dessins restent sur la tablette.
import { h, icon } from '../dom.js';
import { forestScene } from '../art.js';
import { bubble, makeSpeaker } from '../say.js';
import { sfx } from '../audio.js';
import { drawings, drawingSVG, galleryOn, unhang } from '../../core/galerie.js';

const TILTS = [-2.2, 1.6, -1, 2.4, -1.8, 1.1];
const dateFr = (t) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

export function galerie(root, app) {
  const st = app.state;
  root.classList.add('galerie');
  const bar = h('header', { class: 'bar' },
    h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour à l’accueil', onClick: () => { sfx('tap'); app.go('accueil'); }, html: icon('back', 26) }),
    h('div', { class: 'bar-title' }, h('h2', {}, 'Ma galerie'), h('p', {}, 'Tes dessins accrochés dans la forêt')));
  root.append(h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }), bar);

  // Galerie éteinte par les parents : on l'explique simplement, sans rien montrer.
  if (!galleryOn(st)) {
    root.append(h('div', { class: 'gal-empty' }, h('p', {}, 'La galerie n’est pas ouverte pour le moment.'), h('p', { class: 'muted' }, 'Un adulte peut l’ouvrir dans l’espace parents.'),
      h('button', { class: 'btn-big sm', type: 'button', onClick: () => app.go('accueil'), html: `${icon('back', 28)}<span>Accueil</span>` })));
    return undefined;
  }

  const foxHost = h('div', { class: 'gal-fox' });
  const b = bubble();
  const wall = h('div', { class: 'mur', role: 'list', 'aria-label': 'Dessins accrochés' });
  root.append(h('div', { class: 'galerie-body' }, h('aside', { class: 'gal-side' }, foxHost, b), h('div', { class: 'mur-wrap' }, wall)));

  const fox = app.makeFox(foxHost);
  const speaker = makeSpeaker(fox, b);
  let zoom = null, zoomFox = null;
  const closeZoom = () => { zoomFox?.destroy(); zoomFox = null; zoom?.remove(); zoom = null; };

  function openZoom(e) {
    if (zoom) return;
    sfx('pop');
    const status = h('p', { class: 'muted', 'aria-live': 'polite' });
    const del = h('button', { class: 'btn-sec sm', type: 'button', html: `${icon('trash', 22)}<span>Retirer de la galerie</span>` });
    let armed = 0;
    del.addEventListener('click', () => {
      if (!armed) { armed = setTimeout(() => { armed = 0; del.querySelector('span').textContent = 'Retirer de la galerie'; }, 3000); del.querySelector('span').textContent = 'Sûr ? Il disparaîtra'; return; }
      clearTimeout(armed); armed = 0;
      unhang(st, e.id); app.save(); sfx('pop');
      closeZoom(); draw();
      speaker.say('C’est retiré. La place est libre pour un autre dessin !', { icon: 'frame', silent: true });
    });
    const host = h('div', { class: 'res-fox' });
    zoom = h('div', { class: 'result gal-zoom', role: 'dialog', 'aria-label': e.title },
      h('div', { class: 'result-card' },
        h('h2', {}, e.title),
        h('div', { class: 'zoom-frame', html: drawingSVG(e, { cls: 'zoom-svg' }) }),
        h('p', { class: 'muted' }, `Dessiné le ${dateFr(e.t)}`),
        h('div', { class: 'res-actions' }, h('button', { class: 'btn-big sm', type: 'button', onClick: () => { sfx('tap'); closeZoom(); }, html: `${icon('check', 28)}<span>Fermer</span>` }), del),
        status),
      host);
    root.append(zoom);
    zoomFox = app.makeFox(host, { accessories: app.equipped() });
    zoomFox.setMood('joy', 2500);
  }

  function draw() {
    const list = drawings(st);
    wall.replaceChildren();
    if (!list.length) {
      wall.append(h('div', { class: 'mur-vide' }, h('p', {}, 'Ta galerie est vide.'), h('p', { class: 'muted' }, 'Fais un dessin, puis accroche-le ici avec le bouton « Accrocher dans la forêt ».'),
        h('button', { class: 'btn-big sm', type: 'button', onClick: () => { sfx('pop'); app.go('dessin'); }, html: `${icon('pencil', 28)}<span>Dessiner</span>` })));
      speaker.say('Ta galerie est vide. Dessine, puis accroche ton dessin dans la forêt !', { silent: true, icon: 'frame' });
      return;
    }
    list.forEach((e, i) => {
      const card = h('button', { class: 'cadre', type: 'button', role: 'listitem', style: { '--r': `${TILTS[i % TILTS.length]}deg` }, 'aria-label': `${e.title}, dessiné le ${dateFr(e.t)}. Voir en grand.`, onClick: () => openZoom(e) },
        h('span', { class: 'peg', 'aria-hidden': 'true' }),
        h('span', { class: 'cadre-img', html: drawingSVG(e) }),
        h('span', { class: 'cadre-titre' }, e.title),
        h('span', { class: 'cadre-date' }, dateFr(e.t)));
      wall.append(card);
    });
    speaker.say('Voilà tes dessins ! Touche-en un pour le voir en grand.', { silent: true, icon: 'frame' });
  }
  draw();

  return () => { closeZoom(); fox.destroy(); };
}
