import { h, icon } from '../dom.js';
import { forestScene, levelThumb } from '../art.js';
import { bubble, makeSpeaker } from '../say.js';
import { LEVELS } from '../../content/skills.js';
import { levelProgress, recommend, skillState, seriesDuNiveau } from '../../core/progress.js';
import { sfx } from '../audio.js';

export function levels(root, app) {
  const st = app.state;
  const rec = recommend(st);
  const recLevel = LEVELS.find((l) => l.skills.includes(rec.skillId));
  const foxHost = h('div', { class: 'side-fox' });
  const b = bubble();
  root.classList.add('levels');

  const cards = LEVELS.map((lv) => {
    const p = levelProgress(st, lv);
    const series = seriesDuNiveau(st, lv);
    // beaucoup d'exercices : une feuille par étape (« Les lettres rondes »…) plutôt qu'une par exercice
    const units = lv.sections && lv.skills.length > 12
      ? lv.sections.map((x) => ({ on: x.skills.every((id) => skillState(st, id).mastered) }))
      : lv.skills.map((id, i) => ({ on: i < p.done }));
    const leaves = units.map((u) => `<span class="lf ${u.on ? 'on' : ''}">${icon(u.on ? 'leaf' : 'leafO', 20)}</span>`).join('');
    return h('button', {
      class: `level-card${lv.available ? '' : ' soon'}${recLevel === lv ? ' rec' : ''}`, type: 'button', 'data-level': lv.id,
      'aria-label': `Niveau ${lv.id} : ${lv.name}${lv.available ? '' : ' (bientôt)'}`,
    },
      h('div', { class: 'lc-art', html: levelThumb(lv.id) }),
      h('span', { class: 'lc-num' }, String(lv.id)),
      lv.available ? null : h('span', { class: 'lc-soon' }, 'Bientôt'),
      recLevel === lv ? h('span', { class: 'lc-rec', html: `${icon('star', 18)}<span>Conseillé</span>` }) : null,
      h('div', { class: 'lc-body' },
        h('h3', {}, lv.name),
        h('p', { class: 'lc-class' }, lv.classe),
        h('p', { class: 'lc-blurb' }, lv.blurb),
        lv.available ? h('div', { class: 'lc-leaves', html: leaves }) : null,
        lv.available && lv.skills.length > 12 ? h('p', { class: 'lc-count' }, `${p.done} sur ${p.total} acquis`) : null,
        lv.available && series.total ? h('p', { class: 'lc-series' }, `${series.total} séries${series.done ? ` · ${series.done} terminée${series.done > 1 ? 's' : ''}` : ''}`) : null,
      ),
    );
  });

  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour à l’accueil', onClick: () => app.go('accueil'), html: icon('back', 26) }),
      h('h2', {}, 'Choisis ton aventure'),
    ),
    h('div', { class: 'levels-body' },
      h('div', { class: 'levels-grid' }, cards),
      h('aside', { class: 'side' }, foxHost, b),
    ),
  );
  const fox = app.makeFox(foxHost);
  const speaker = makeSpeaker(fox, b);
  speaker.say('Où est-ce qu’on va aujourd’hui ?', { once: 'carte' });

  cards.forEach((card) => card.addEventListener('click', () => {
    const lv = LEVELS.find((l) => l.id === +card.dataset.level);
    sfx(lv.available ? 'pop' : 'oops');
    if (!lv.available) {
      card.classList.remove('wiggle'); void card.offsetWidth; card.classList.add('wiggle');
      speaker.say('Ce niveau arrive bientôt. Il dort encore !', { mood: 'sleep', ms: 2400 });
      return;
    }
    app.go(`carte-${lv.id}`);
  }));
  return () => fox.destroy();
}
