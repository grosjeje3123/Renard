// Mission cahier : écrire sur du vrai papier. L'enfant déclare « J'ai essayé » ; l'application ne vérifie rien,
// elle valorise l'essai. Un adulte peut confirmer plus tard dans l'espace parents (facultatif).
import { h, icon } from '../dom.js';
import { forestScene, glyphIcon } from '../art.js';
import { stickerSVG } from '../animals.js';
import { bubble, makeSpeaker } from '../say.js';
import { SKILLS } from '../../content/skills.js';
import { STICKER_BY_ID } from '../../content/stickers.js';
import { markPaper, awardStickers, paperState } from '../../core/progress.js';
import { sfx } from '../audio.js';

const todo = (sk) => (sk.kind === 'letter' ? `le ${sk.glyph}` : sk.phrase ? `la phrase « ${sk.glyph} »` : sk.groupe ? `le son « ${sk.glyph} »` : sk.kind === 'word' ? `le mot « ${sk.glyph} »` : sk.short.toLowerCase());
const verb = (sk) => (sk.kind === 'graphisme' ? 'Trace' : 'Écris');

export function cahier(root, app, id) {
  const st = app.state, sk = SKILLS[id];
  if (!sk) { app.go('accueil'); return; }
  const from = app.cahierFrom || `carte-${sk.level}`;
  const lefty = st.settings.main === 'gauche';
  root.classList.add('cahier');
  const before = paperState(st, id).n;

  const foxHost = h('div', { class: 'side-fox' });
  const b = bubble();
  const tips = [
    'Assieds-toi bien droit.',
    lefty ? 'Incline ta feuille vers la droite.' : 'Incline ta feuille un peu vers la gauche.',
    'Pose ta main sous la ligne, et tiens le crayon sans trop serrer.',
  ];
  const done = h('div', { class: 'cah-done', hidden: true });
  const go = h('button', { class: 'btn-big', type: 'button', html: `${icon('check', 34)}<span>J’ai essayé !</span>` });
  const later = h('button', { class: 'btn-sec', type: 'button', onClick: () => { sfx('tap'); app.go(from); } }, 'Plus tard');
  const actions = h('div', { class: 'cah-actions' }, go, later);

  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour', onClick: () => app.go(from), html: icon('back', 26) }),
      h('div', { class: 'bar-title' }, h('h2', {}, 'Mission cahier'), h('p', {}, sk.title))),
    h('div', { class: 'cahier-body' },
      h('aside', { class: 'side' }, foxHost, b),
      h('div', { class: 'cah-main' },
        h('div', { class: 'cah-model' }, h('div', { class: 'cm-art', html: glyphIcon(id, { stroke: 'var(--accent-deep)', width: 0.16, pad: 0.5 }) }),
          h('p', {}, `${verb(sk)} ${todo(sk)} sur une ligne de ton cahier.`),
          before ? h('small', {}, `Déjà essayé ${before} fois : bravo !`) : null),
        h('ul', { class: 'cah-tips' }, tips.map((t) => h('li', { html: `${icon('check', 22)}<span>${t}</span>` }))),
        actions, done)),
  );

  const fox = app.makeFox(foxHost);
  const speaker = makeSpeaker(fox, b);
  speaker.say(`Prends ton cahier et ton crayon. ${verb(sk)} ${todo(sk)}, comme tu l’as fait avec moi !`, { icon: 'pencil' });

  go.addEventListener('click', () => {
    markPaper(st, id);
    const won = awardStickers(st);
    app.save();
    sfx('win');
    fox.setMood('joy', 4000);
    actions.hidden = true;
    done.hidden = false;
    done.replaceChildren(
      h('h3', {}, 'Bravo ! Tu as écrit sur du vrai papier.'),
      won.length ? h('div', { class: 'cd-stk' }, won.map((w, i) => h('div', { class: 'rs-stk', style: { '--w': '92px', '--d': `${0.4 + i * 0.6}s` } }, h('div', { class: 'rs-pic', html: stickerSVG(STICKER_BY_ID[w].animal) }), h('p', { class: 'rs-name' }, STICKER_BY_ID[w].name)))) : null,
      h('p', { class: 'muted' }, 'Un adulte peut regarder ton travail et le confirmer dans l’espace parents.'),
      h('button', { class: 'btn-big sm', type: 'button', onClick: () => { sfx('pop'); app.go(from); }, html: `${icon('arrowR', 28)}<span>Suite</span>` }));
    if (won.length) setTimeout(() => sfx('sticker'), 900);
    speaker.say(won.length ? 'Bravo ! Tu as écrit sur du vrai papier, et tu gagnes une vignette !' : 'Bravo ! Tu as écrit sur du vrai papier.', { mood: 'joy', ms: 3500 });
  });
  return () => { app.cahierFrom = null; fox.destroy(); };
}
