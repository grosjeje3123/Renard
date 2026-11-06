import { h, icon } from '../dom.js';
import { forestScene } from '../art.js';
import { stickerSVG } from '../animals.js';
import { bubble, makeSpeaker, fr } from '../say.js';
import { LEVELS } from '../../content/skills.js';
import { STICKERS, STICKER_BY_ID, ALBUM_PAGES } from '../../content/stickers.js';
import { stickerCount } from '../../core/progress.js';
import { sfx, speak, stopSpeaking } from '../audio.js';

// Petite inclinaison fixe par place : les vignettes semblent collées à la main, sans jamais bouger d'une visite à l'autre.
const TILT = [-3, 2.5, -1.5, 3.5, -3.5, 1.5, -2, 3];

const dateFr = (t) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

export function album(root, app) {
  const st = app.state;
  const have = st.stickers || {};
  const n = stickerCount(st);
  const foxHost = h('div', { class: 'side-fox' });
  const b = bubble();
  root.classList.add('album');

  const slot = (s, i) => {
    const got = !!have[s.id];
    const el = h('button', {
      class: `stk${got ? ' got' : ' lockedi'}${s.gold ? ' gold' : ''}`, type: 'button', 'data-id': s.id,
      style: { '--tilt': got ? `${TILT[i % TILT.length]}deg` : '0deg' },
      'aria-label': got ? `${s.name}. Toucher pour la regarder.` : `Vignette à gagner : ${s.how}`,
    },
      h('div', { class: 'stk-pic', html: stickerSVG(s.animal, { locked: !got }) }),
      h('p', { class: 'stk-name' }, got ? s.name : '???'));
    return el;
  };

  const pages = ALBUM_PAGES(LEVELS).map((pg) => {
    const got = pg.stickers.filter((s) => have[s.id]).length;
    const lv = LEVELS.find((l) => l.id === pg.id);
    return h('section', { class: `album-page${pg.id === 'gold' ? ' gold-page' : ''}`, 'aria-label': pg.title },
      h('header', {}, h('h3', {}, pg.title), lv ? h('small', {}, lv.classe) : null,
        pg.stickers.length ? h('span', { class: 'ap-count' }, `${got} / ${pg.stickers.length}`) : null),
      pg.stickers.length
        ? h('div', { class: 'stk-grid' }, pg.stickers.map(slot))
        : h('div', { class: 'ap-soon' }, h('span', { html: icon('moon', 26) }), h('p', {}, 'De nouveaux animaux arrivent avec ce niveau.')));
  });

  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour à l’accueil', onClick: () => app.go('accueil'), html: icon('back', 26) }),
      h('h2', {}, 'Mon album'),
      h('span', { class: 'count-pill', 'aria-label': `${n} vignettes sur ${STICKERS.length}` }, `${n} / ${STICKERS.length}`)),
    h('div', { class: 'album-body' },
      h('div', { class: 'album-pages' }, pages),
      h('aside', { class: 'side' }, foxHost, b)),
  );

  const fox = app.makeFox(foxHost);
  const speaker = makeSpeaker(fox, b);
  const intro = n === 0 ? 'Chaque réussite te donne une vignette d’animal. On les colle ici !'
    : n === STICKERS.length ? 'Tu as toutes les vignettes ! Quelle belle collection !'
    : `Tu as ${n} vignette${n > 1 ? 's' : ''} sur ${STICKERS.length}. Touche une vignette pour la regarder.`;
  speaker.say(intro, { silent: true, icon: 'star' });

  let overlay = null;
  const close = () => { if (!overlay) return; overlay.remove(); overlay = null; stopSpeaking(); };
  const detail = (s) => {
    close();
    sfx('pop');
    const art = h('div', { class: 'sd-art', html: stickerSVG(s.animal) });
    overlay = h('div', { class: 'stk-detail', role: 'dialog', 'aria-label': s.name, onClick: close },
      h('div', { class: 'sd-card', onClick: (e) => e.stopPropagation() },
        art,
        h('h2', {}, s.name),
        h('p', { class: 'sd-fact' }, fr(s.fact)),
        h('p', { class: 'sd-how' }, `Collée dans ton album le ${dateFr(have[s.id])}.`),
        h('button', { class: 'btn-sec', type: 'button', onClick: close }, 'Fermer')));
    root.append(overlay);
    speak(s.fact, { onStart: () => fox.talk(true), onEnd: () => fox.talk(false) });
  };

  root.addEventListener('click', (e) => {
    const el = e.target.closest?.('.stk');
    if (!el || !root.contains(el)) return;
    const s = STICKER_BY_ID[el.dataset.id];
    if (el.classList.contains('got')) { detail(s); return; }
    sfx('tap');
    el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle');
    speaker.say(s.how, { mood: 'encourage', ms: 2600, icon: 'star' });
  });
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  return () => { document.removeEventListener('keydown', onKey); close(); fox.destroy(); };
}
