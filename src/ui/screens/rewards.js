import { h, icon } from '../dom.js';
import { forestScene, itemSVG } from '../art.js';
import { bubble, makeSpeaker } from '../say.js';
import { ITEMS, SKILLS } from '../../content/skills.js';
import { unlockedItems, foxStage, FOX_STAGES } from '../../core/progress.js';
import { sfx } from '../audio.js';

export function rewards(root, app) {
  const st = app.state;
  const have = new Set(unlockedItems(st));
  const stage = foxStage(st);
  const nextStage = FOX_STAGES[stage.index + 1];
  const foxHost = h('div', { class: 'coin-fox' });
  const b = bubble();
  root.classList.add('rewards');

  const decor = { iris: 'd-iris', lanterne: 'd-lanterne', oiseau: 'd-oiseau', abeille: 'd-abeille', ecureuil: 'd-ecureuil' };
  const placed = Object.entries(decor).filter(([id]) => have.has(id)).map(([id, cls]) => h('div', { class: `decor ${cls}`, html: itemSVG(id), title: ITEMS[id].name }));
  const coin = h('div', { class: 'coin' }, h('div', { class: 'scene-wrap', html: forestScene({ density: 1, sign: false }) }), placed, foxHost,
    h('div', { class: 'coin-cap' }, h('strong', {}, stage.name), h('span', {}, nextStage ? `Encore ${nextStage.min - stage.mastered} compétence${nextStage.min - stage.mastered > 1 ? 's' : ''} pour grandir` : 'Il a bien grandi !')));

  const cards = Object.values(ITEMS).map((it) => {
    const got = have.has(it.id);
    const acc = it.type === 'accessoire';
    const on = st.equipped.includes(it.id);
    const sk = SKILLS[it.skill];
    const card = h(acc && got ? 'button' : 'div', {
      class: `item${got ? ' got' : ' lockedi'}${acc && got ? ' toggle' : ''}${on ? ' worn' : ''}`, type: acc && got ? 'button' : null, 'data-id': it.id,
      'aria-pressed': acc && got ? String(on) : null,
    },
      h('div', { class: 'it-art', html: itemSVG(it.id, { locked: !got }) }),
      h('p', { class: 'it-name' }, got ? it.name : '???'),
      h('p', { class: 'it-sub' }, got ? (acc ? (on ? 'Porté' : 'Toucher pour mettre') : 'Dans ton coin de forêt') : `Avec : ${sk.skillLabel.toLowerCase()}`),
    );
    return card;
  });

  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour', onClick: () => app.go(app.collectionFrom || 'collection'), html: icon('back', 26) }),
      h('div', { class: 'bar-title' }, h('h2', {}, 'Mes trésors'), h('p', {}, 'Des objets pour habiller le renard et décorer sa forêt. Chacun se gagne en réussissant un exercice précis.')),
    ),
    h('div', { class: 'rewards-body' }, coin, h('div', { class: 'items-wrap' }, h('div', { class: 'bubble-row' }, b), h('div', { class: 'items' }, cards))),
  );

  const fox = app.makeFox(foxHost);
  const speaker = makeSpeaker(fox, b);
  speaker.say(have.size ? 'Regarde tout ce que tu as gagné en apprenant !' : 'Chaque nouvelle chose apprise te donne un trésor.', { once: 'tresors', icon: 'star' });

  cards.forEach((c) => {
    if (!c.classList.contains('toggle')) {
      if (c.classList.contains('lockedi')) c.addEventListener('click', () => { sfx('oops'); speaker.say('Ce trésor t’attend. Apprends une nouvelle chose pour le gagner !', { mood: 'encourage', ms: 2200 }); });
      return;
    }
    c.addEventListener('click', () => {
      const id = c.dataset.id;
      const i = st.equipped.indexOf(id);
      if (i >= 0) st.equipped.splice(i, 1); else st.equipped.push(id);
      app.save();
      sfx('pop');
      fox.setAccessories(app.equipped());
      fox.setMood('joy', 900);
      const on = st.equipped.includes(id);
      c.classList.toggle('worn', on);
      c.setAttribute('aria-pressed', String(on));
      c.querySelector('.it-sub').textContent = on ? 'Porté' : 'Toucher pour mettre';
    });
  });
  return () => fox.destroy();
}
