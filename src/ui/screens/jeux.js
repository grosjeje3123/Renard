// Les jeux : de petits défis qui vérifient ce que l'enfant sait déjà, sans rien changer à ses acquis (ni note, ni minuteur, ni perdant).
// L'accueil les regroupe : le tableau libre, le dessin, la dictée (et la galerie si les parents l'ont activée). Adresse : #jeux.
import { h, icon } from '../dom.js';
import { forestScene } from '../art.js';
import { bubble, makeSpeaker } from '../say.js';
import { dicteePossible, dicteesFaites } from '../../core/dictee.js';
import { DICTEE_PAS_ENCORE, DICTEE_SANS_VOIX } from '../../content/dictee.js';
import { sfx } from '../audio.js';
import { galleryOn } from '../../core/galerie.js';

/** La liste des jeux : pour chacun, s'il est jouable maintenant et, sinon, ce qu'il faut pour le débloquer. */
export const JEUX = [
  {
    id: 'tableau', route: 'tableau', ico: 'tableau', titre: 'Le tableau',
    texte: 'Écris ce que tu veux : ton prénom, un mot… ou dessine.',
    etat: () => ({ ok: true, note: 'Pour le plaisir, sans note' }),
  },
  {
    id: 'dessin', route: 'dessin', ico: 'pencil', titre: 'Le dessin',
    texte: 'Des modèles à suivre, des animaux pour les grands, ou la feuille blanche.',
    etat: () => ({ ok: true, note: 'Pour le plaisir, sans note' }),
  },
  {
    id: 'galerie', route: 'galerie', ico: 'frame', titre: 'Ma galerie', cache: (st) => !galleryOn(st),
    texte: 'Les dessins accrochés dans la forêt.',
    etat: () => ({ ok: true, note: '' }),
  },
  {
    id: 'dictee', route: 'dictee', ico: 'speaker', titre: 'La dictée',
    texte: 'Le renard dit une lettre ou un mot. Écoute, puis écris !',
    etat: (st) => {
      if (!st.settings.voix) return { ok: false, note: DICTEE_SANS_VOIX };
      if (!dicteePossible(st)) return { ok: false, note: DICTEE_PAS_ENCORE };
      const n = dicteesFaites(st);
      return { ok: true, note: n ? `${n} exercice${n > 1 ? 's' : ''} dicté${n > 1 ? 's' : ''} jusqu’ici` : 'Cinq petits exercices' };
    },
  },
];

export function jeux(root, app) {
  const st = app.state;
  const foxHost = h('div', { class: 'side-fox' });
  const b = bubble();
  root.classList.add('levels', 'jeux');

  const cards = JEUX.filter((j) => !j.cache?.(st)).map((j) => {
    const e = j.etat(st);
    return h('button', {
      class: `jeu-card${e.ok ? '' : ' off'}`, type: 'button', 'data-jeu': j.id, 'aria-disabled': e.ok ? 'false' : 'true',
      onClick: () => { if (e.ok) { sfx('pop'); app.tableauFrom = 'jeux'; app.dessinFrom = 'jeux'; app.go(j.route); } else { sfx('oops'); speaker.say(e.note, { mood: 'encourage' }); } },
    },
      h('span', { class: 'jc-ico', html: icon(j.ico, 54) }),
      h('span', { class: 'jc-body' }, h('h3', {}, j.titre), h('p', {}, j.texte), h('p', { class: 'jc-note' }, e.note)));
  });

  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour à l’accueil', onClick: () => app.go('accueil'), html: icon('back', 26) }),
      h('h2', {}, 'Les jeux'),
    ),
    h('div', { class: 'levels-body' },
      h('div', { class: 'jeux-grid' }, cards),
      h('aside', { class: 'side' }, foxHost, b),
    ),
  );
  const fox = app.makeFox(foxHost);
  const speaker = makeSpeaker(fox, b);
  speaker.say('Écrire, dessiner, ou une petite dictée ? Choisis !', { once: 'jeux' });
  return () => fox.destroy();
}
