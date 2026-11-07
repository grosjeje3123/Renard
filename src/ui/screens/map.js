import { h, icon } from '../dom.js';
import { forestScene, glyphIcon } from '../art.js';
import { bubble, makeSpeaker } from '../say.js';
import { LEVELS, SKILLS } from '../../content/skills.js';
import { skillStatus, skillState, isSkillOpen, recommend, levelSections, isConsolidated, reviewDue, lockReason, missingLetters } from '../../core/progress.js';
import { foxSVG } from '../fox.js';
import { sfx } from '../audio.js';

const isMastered = (st, id) => skillState(st, id).mastered;
const STATUS_TXT = { new: 'À découvrir', progress: 'En cours', review: 'À reprendre', mastered: 'Acquis' };

/** Positions des pastilles : une rangée en zigzag, ou un serpentin sur deux rangées quand il y a beaucoup d'étapes. */
export function layout(n) {
  const rows = n <= 6 ? 1 : n <= 12 ? 2 : 3; // jamais plus de six pastilles par rangée
  const per = Math.ceil(n / rows);
  return Array.from({ length: n }).map((_, i) => {
    const r = Math.floor(i / per), c = i % per;
    const k = r % 2 ? per - 1 - c : c; // le serpentin repart de l'autre côté
    const x = 11 + (78 * k) / Math.max(1, per - 1);
    const y = rows === 1 ? (i % 2 ? 66 : 32) : (rows === 2 ? [27, 72] : [18, 50, 82])[r] + (c % 2 ? 5 : -3);
    return { x, y, rows };
  });
}

export function map(root, app, arg) {
  const st = app.state;
  const [lvArg, secArg] = String(arg || '').split('-');
  const lv = LEVELS.find((l) => String(l.id) === lvArg && l.available) || LEVELS[0];
  const rec = recommend(st);
  const foxHost = h('div', { class: 'side-fox' });
  const b = bubble();
  root.classList.add('map');

  const sections = levelSections(st, lv);
  const done = (ids) => ids.filter((id) => isMastered(st, id)).length;
  let si = Number.isInteger(+secArg) && secArg !== undefined && secArg !== '' ? Math.max(0, Math.min(sections.length - 1, +secArg)) : -1;
  if (si < 0) {
    si = sections.findIndex((x) => x.skills.includes(rec.skillId));
    if (si < 0) si = Math.max(0, sections.findIndex((x) => done(x.skills) < x.skills.length));
  }
  const section = sections[si];
  const ids = section.skills;
  // niveau 1 : dessin libre avec les formes, puis le tableau libre en majuscules (son prénom !) au bout des majuscules ; niveaux d'écriture : tableau libre à la dernière étape
  const last = si === sections.length - 1;
  const free = lv.id === 1 ? (si === 0 ? 'dessin' : last ? 'tableau' : null) : last ? 'tableau' : null;
  const prenom = lv.id === 1 && free === 'tableau' && !!st.name;
  const n = ids.length + (free ? 1 : 0);
  const pos = layout(n);
  const d = pos.reduce((acc, p, i) => {
    const X = p.x * 10, Y = p.y * 4;
    if (i === 0) return `M ${X} ${Y}`;
    const q = pos[i - 1], qx = q.x * 10, qy = q.y * 4;
    return acc + ` C ${qx + (X - qx) / 2} ${qy}, ${qx + (X - qx) / 2} ${Y}, ${X} ${Y}`;
  }, '');

  const wide = (id) => SKILLS[id].phrase;
  const nodes = ids.map((id, i) => {
    const sk = SKILLS[id], status = skillStatus(st, id), open = isSkillOpen(st, id);
    const isRec = rec.skillId === id && open;
    return h('button', {
      class: `node ${status}${open ? '' : ' locked'}${isRec ? ' rec' : ''}`, type: 'button', 'data-skill': id,
      style: { left: pos[i].x + '%', top: pos[i].y + '%' },
      'aria-label': `${sk.title} : ${open ? STATUS_TXT[status] + (status === 'mastered' && isConsolidated(st, id) ? ', consolidé' : '') : 'pas encore ouvert'}`,
    },
      isRec ? h('div', { class: 'node-fox', html: foxSVG({}) }) : null,
      h('span', { class: 'disc', html: wide(id) ? icon('book', 40) : glyphIcon(id, { width: 0.3 }) }),
      status === 'mastered' ? h('span', { class: `badge ${isConsolidated(st, id) ? 'gold' : 'ok'}`, html: icon(isConsolidated(st, id) ? 'star' : 'check', 22) }) : null,
      status === 'mastered' && reviewDue(st, id) ? h('span', { class: 'badge rev', 'aria-label': 'À revoir', html: icon('replay', 18) }) : null,
      !open ? h('span', { class: 'badge lock', html: icon('lock', 20) }) : null,
      h('span', { class: 'nlabel' }, sk.label || sk.title),
    );
  });

  if (free) {
    const i = ids.length;
    const label = free === 'dessin' ? 'Dessin libre' : prenom ? 'Mon prénom' : 'Tableau libre';
    nodes.push(h('button', { class: 'node free', type: 'button', 'data-free': free, style: { left: pos[i].x + '%', top: pos[i].y + '%' }, 'aria-label': free === 'dessin' ? 'Dessin libre, pour le plaisir' : prenom ? 'Écrire mon prénom en majuscules, dans le tableau libre' : 'Tableau libre : écrire ce que je veux, avec un modèle à calquer' },
      h('span', { class: 'disc', html: icon(free === 'dessin' ? 'pencil' : 'tableau', 38) }), h('span', { class: 'nlabel' }, label)));
  }

  const ribbon = sections.length > 1
    ? h('nav', { class: 'sections', 'aria-label': 'Les étapes du niveau' }, sections.map((x, k) => h('button', {
      class: `sec-chip${k === si ? ' on' : ''}${done(x.skills) === x.skills.length ? ' full' : ''}`, type: 'button', 'data-sec': k, 'aria-current': k === si ? 'true' : null,
      onClick: () => { sfx('pop'); app.go(`carte-${lv.id}-${k}`); },
    }, h('span', { class: 'sc-t' }, x.title), h('span', { class: 'sc-n' }, `${done(x.skills)}/${x.skills.length}`))))
    : null;

  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour aux niveaux', onClick: () => app.go('niveaux'), html: icon('back', 26) }),
      h('div', { class: 'bar-title' }, h('h2', {}, lv.name), h('p', {}, sections.length > 1 ? `${lv.classe} · ${section.title}` : lv.classe)),
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Mes trésors', onClick: () => app.go('tresors'), html: icon('chest', 26) }),
    ),
    ribbon,
    h('div', { class: 'map-body' },
      h('div', { class: `track${pos[0]?.rows > 1 ? ' dense' : ''}` },
        h('svg', { class: 'track-path', viewBox: '0 0 1000 400', preserveAspectRatio: 'none', 'aria-hidden': 'true', html: `<path d="${d}" class="tp-bg"/><path d="${d}" class="tp-dash"/>` }),
        nodes,
      ),
      h('aside', { class: 'side' }, foxHost, b),
    ),
  );

  requestAnimationFrame(() => ribbon?.querySelector('.on')?.scrollIntoView({ inline: 'center', block: 'nearest' }));
  const fox = app.makeFox(foxHost);
  const speaker = makeSpeaker(fox, b);
  speaker.say(rec.skillId && ids.includes(rec.skillId) ? 'Touche le chemin qui brille !' : 'Choisis ton prochain jeu !', { silent: true, icon: 'hand' });

  nodes.forEach((node) => node.addEventListener('click', () => {
    const id = node.dataset.skill;
    if (node.dataset.free) { sfx('pop'); app.tableauFrom = `carte-${lv.id}-${si}`; if (prenom) app.tableauCasse = 'maj'; app.go(node.dataset.free); return; }
    if (node.classList.contains('locked')) {
      sfx('oops');
      node.classList.remove('wiggle'); void node.offsetWidth; node.classList.add('wiggle');
      const miss = missingLetters(st, id);
      speaker.say(lockReason(st, id) === 'before' ? 'Essaie d’abord l’exercice d’avant, et celui-ci s’ouvrira !'
        : miss.length ? `Il te manque ${miss.length === 1 ? 'la lettre' : 'les lettres'} ${miss.slice(0, 4).join(', ')}${miss.length > 4 ? '…' : ''} : essaie-${miss.length === 1 ? 'la' : 'les'} d’abord !` : 'Essaie d’abord les lettres, et ce sera ouvert !', { mood: 'encourage', ms: 3200 });
      return;
    }
    sfx('pop');
    app.go(`exercice-${id}`);
  }));
  return () => fox.destroy();
}
