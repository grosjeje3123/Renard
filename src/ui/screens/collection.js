// Mes trésors : l'accueil regroupe ici les deux collections de l'enfant, expliquées simplement.
// Les objets (pour habiller le renard et décorer sa forêt) et l'album des vignettes d'animaux de la campagne. Adresse : #collection.
import { h, icon } from '../dom.js';
import { forestScene } from '../art.js';
import { bubble, makeSpeaker } from '../say.js';
import { sfx } from '../audio.js';
import { unlockedItems } from '../../core/progress.js';
import { ITEMS } from '../../content/skills.js';
import { STICKERS } from '../../content/stickers.js';

export function collection(root, app) {
  const st = app.state;
  const foxHost = h('div', { class: 'side-fox' });
  const b = bubble();
  const nObj = unlockedItems(st).length, nStk = Object.keys(st.stickers || {}).length;
  const carte = (id, route, ico, titre, texte, compte) => h('button', {
    class: 'jeu-card', type: 'button', 'data-coll': id,
    onClick: () => { sfx('pop'); app.collectionFrom = 'collection'; app.go(route); },
  },
    h('span', { class: 'jc-ico', html: icon(ico, 54) }),
    h('span', { class: 'jc-body' }, h('h3', {}, titre), h('p', {}, texte), h('p', { class: 'jc-note' }, compte)));
  root.classList.add('levels', 'jeux', 'collection');
  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour à l’accueil', onClick: () => app.go('accueil'), html: icon('back', 26) }),
      h('h2', {}, 'Mes trésors')),
    h('div', { class: 'levels-body' },
      h('div', { class: 'jeux-grid' },
        carte('objets', 'tresors', 'chest', 'Les objets du renard', 'Une écharpe, des lunettes, un chapeau… pour habiller le renard et décorer sa forêt.', `${nObj} sur ${Object.keys(ITEMS).length}`),
        carte('album', 'album', 'album', 'Mon album d’animaux', 'Des animaux de la campagne, chacun avec sa petite histoire.', `${nStk} sur ${STICKERS.length}`)),
      h('aside', { class: 'side' }, foxHost, b)),
  );
  const fox = app.makeFox(foxHost);
  const speaker = makeSpeaker(fox, b);
  speaker.say('Ici, il y a tout ce que tu as gagné : les objets du renard, et ton album d’animaux.', { once: 'collection' });
  return () => fox.destroy();
}
