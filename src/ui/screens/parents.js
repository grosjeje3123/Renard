// Espace parents : suivi des compétences, difficultés, temps d'utilisation, réglages et vie privée.
import { h, icon } from '../dom.js';
import { glyphIcon } from '../art.js';
import { SKILLS, LEVELS } from '../../content/skills.js';
import { skillState, skillStatus, levelProgress, levelSkills, levelSections, orderedSkills, difficulties, recommend, usageDays, todaySeconds, masteredCount, isSkillOpen, stickerCount, isConsolidated, reviewDue, paperState, confirmPaper, avisPapier, AVIS_PAPIER } from '../../core/progress.js';
import { sfx } from '../audio.js';
import { STICKERS } from '../../content/stickers.js';
import { stickerSVG } from '../animals.js';
import { card, settingsCards, orderCard, backupCard, reglesCard } from './parents-tools.js';

const STATUS = { new: ['À découvrir', 'st-new'], progress: ['En cours', 'st-prog'], review: ['À reprendre', 'st-rev'], mastered: ['Acquis', 'st-ok'], due: ['Rappel conseillé', 'st-due'], cons: ['Consolidé', 'st-cons'] };
/** Statut affiché : « acquis » se précise en « rappel conseillé » puis « consolidé » (réussi de mémoire à des jours espacés). */
const shownStatus = (st, id) => { const s = skillStatus(st, id); if (s !== 'mastered') return s; return isConsolidated(st, id) ? 'cons' : reviewDue(st, id) ? 'due' : 'mastered'; };
const wide = (c) => { c.classList.add('wide'); return c; };
const fr = (n, d = 0) => n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const minutes = (s) => Math.round(s / 60);

export function parents(root, app) {
  root.classList.add('parents');
  const fresh = app.parentOk && Date.now() - app.parentOk < 10 * 60 * 1000;
  if (!fresh) return gate(root, app);
  return dashboard(root, app);
}

function gate(root, app) {
  const ring = h('span', { class: 'ring big' });
  const btn = h('button', { class: 'gate-btn', type: 'button', 'aria-label': 'Maintenir appuyé pendant deux secondes', html: icon('lock', 54) }, ring);
  root.append(
    h('header', { class: 'bar' }, h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour', onClick: () => app.go('accueil'), html: icon('back', 26) }), h('h2', {}, 'Espace parents')),
    h('div', { class: 'gate' }, h('h3', {}, 'Réservé aux adultes'), h('p', {}, 'Maintenez le bouton appuyé pendant deux secondes pour ouvrir le suivi.'), btn),
  );
  let raf = 0, t0 = 0;
  const stop = () => { cancelAnimationFrame(raf); ring.style.setProperty('--p', '0'); };
  const tick = (now) => {
    const k = Math.min(1, (now - t0) / 2000);
    ring.style.setProperty('--p', String(k));
    if (k >= 1) { stop(); sfx('unlock'); app.parentOk = Date.now(); app.render(); return; }
    raf = requestAnimationFrame(tick);
  };
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); t0 = performance.now(); raf = requestAnimationFrame(tick); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, stop));
  btn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { app.parentOk = Date.now(); app.render(); } });
  return stop;
}

function usageChart(st) {
  const days = usageDays(st, 7);
  const mins = days.map((d) => d.seconds / 60);
  const max = Math.max(15, Math.ceil(Math.max(...mins) / 5) * 5);
  const W = 560, H = 190, pad = { l: 34, r: 8, t: 14, b: 30 };
  const bw = (W - pad.l - pad.r) / 7;
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const grid = [0, max / 2, max].map((v) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" class="ch-grid"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end" class="ch-t">${Math.round(v)}</text>`).join('');
  const bars = days.map((d, i) => {
    const x = pad.l + i * bw + bw * 0.2, w = bw * 0.6, v = mins[i], top = y(v);
    const label = d.date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
    const isToday = i === 6;
    return `<rect x="${x}" y="${top}" width="${w}" height="${Math.max(v > 0 ? 3 : 0, y(0) - top)}" rx="5" class="ch-bar${isToday ? ' today' : ''}"/>${v > 0 ? `<text x="${x + w / 2}" y="${top - 5}" text-anchor="middle" class="ch-t ch-v">${Math.round(v)}</text>` : ''}<text x="${x + w / 2}" y="${H - 9}" text-anchor="middle" class="ch-t">${label}</text>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Minutes d’utilisation sur les sept derniers jours">${grid}${bars}</svg>`;
}

function dashboard(root, app) {
  const st = app.state;
  const today = minutes(todaySeconds(st));
  const week = minutes(usageDays(st, 7).reduce((s, d) => s + d.seconds, 0));
  const order = orderedSkills(st);
  const total = order.length, done = masteredCount(st);
  const attempts = Object.values(st.skills).reduce((s, k) => s + k.attempts, 0);

  const levelBars = LEVELS.map((lv) => {
    const p = levelProgress(st, lv);
    return h('div', { class: 'lvrow' },
      h('div', { class: 'lvname' }, h('strong', {}, `Niveau ${lv.id}`), h('span', {}, `${lv.name} · ${lv.classe}`)),
      lv.available
        ? h('div', { class: 'bar-track', role: 'img', 'aria-label': `${p.done} sur ${p.total} acquis` }, h('div', { class: 'bar-fill', style: { width: `${Math.max(p.pct * 100, p.started ? 6 : 0)}%` } }))
        : h('div', { class: 'soon-pill' }, 'À venir'),
      lv.available ? h('span', { class: 'lvcount' }, `${p.done}/${p.total}`) : null);
  });

  const rows = order.map((id) => {
    const sk = SKILLS[id], s = skillState(st, id), status = shownStatus(st, id), paper = paperState(st, id);
    const last = s.history.slice(-6);
    const avg = last.length ? last.reduce((a, x) => a + x.st, 0) / last.length : null;
    return h('tr', {},
      h('td', { class: 'gl', html: glyphIcon(id, { width: 0.34 }) }),
      h('td', {}, h('strong', {}, sk.title), h('small', {}, LEVELS.find((l) => l.skills.includes(id)).classe)),
      h('td', {}, h('span', { class: `chip ${STATUS[status][1]}` }, STATUS[status][0])),
      h('td', { class: 'num' }, String(s.attempts)),
      h('td', { class: 'num' }, paper.n ? `${paper.n}${paper.seen ? ' ✓' : ''}` : '–'),
      h('td', { class: 'num' }, avg == null ? '–' : `${fr(avg, 1)} / 3`),
      h('td', { class: 'num' }, s.last ? new Date(s.last).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '–'));
  });

  const letterOf = (id) => {
    const ok = skillState(st, id).mastered, cons = isConsolidated(st, id);
    const label = cons ? 'Consolidée' : ok ? 'Acquise' : 'À apprendre';
    const sk = SKILLS[id];
    return h('div', { class: `lt${ok ? ' ok' : ''}${cons ? ' cons' : ''}${sk.phrase ? ' ph' : ''}`, title: `${sk.title} : ${label}` }, sk.phrase ? h('span', { class: 'ptxt' }, sk.glyph) : h('span', { html: glyphIcon(id, { width: 0.36 }) }), h('small', {}, label));
  };
  const letterBlocks = [];
  for (const lv of [LEVELS[1], LEVELS[2]]) {
    for (const sec of levelSections(st, lv)) {
      const done = sec.skills.filter((id) => skillState(st, id).mastered).length;
      letterBlocks.push(h('div', { class: 'lt-sec' },
        h('h4', {}, sec.title || lv.name, h('span', {}, `${done}/${sec.skills.length}`)),
        h('div', { class: 'letters' }, sec.skills.map(letterOf))));
    }
  }

  const diff = difficulties(st);
  const diffList = diff.length
    ? h('ul', { class: 'diff' }, diff.map((d) => h('li', {}, h('strong', {}, `${SKILLS[d.skillId].title} : ${d.label}`), h('span', {}, d.advice))))
    : h('p', { class: 'muted' }, attempts < 3 ? 'Pas encore assez de tracés pour repérer des difficultés.' : 'Aucune difficulté particulière sur les derniers tracés. Bravo !');

  const rec = recommend(st);
  const recs = [];
  const seen = new Set();
  const add = (id, why) => { if (id && !seen.has(id) && recs.length < 3) { seen.add(id); recs.push({ id, why }); } };
  add(rec.skillId, { review: 'À reprendre : la progression est encore fragile.', continue: 'À poursuivre : commencé, pas encore acquis.', next: 'Prochaine étape conseillée.', first: 'Pour commencer.', again: 'Pour s’entraîner de nouveau.', revise: 'Rappel : acquis il y a quelques jours, on le fixe avant d’avancer.' }[rec.reason]);
  order.filter((id) => skillStatus(st, id) === 'review').forEach((id) => add(id, 'À reprendre : la progression est encore fragile.'));
  order.filter((id) => skillStatus(st, id) === 'new' && isSkillOpen(st, id)).forEach((id) => add(id, 'Nouvelle découverte, déjà ouverte.'));
  const recList = h('ul', { class: 'recs' }, recs.map((r) => h('li', {}, h('span', { class: 'gl', html: glyphIcon(r.id, { width: 0.34 }) }), h('div', {}, h('strong', {}, SKILLS[r.id].title), h('small', {}, r.why)), h('button', { class: 'btn-sec sm', type: 'button', onClick: () => app.go(`exercice-${r.id}`) }, 'Lancer'))));

  const resetBtn = h('button', { class: 'btn-danger', type: 'button', html: `${icon('trash', 20)}<span>Effacer la progression</span>` });
  let armed = 0;
  resetBtn.addEventListener('click', () => {
    if (!armed) {
      armed = setTimeout(() => { armed = 0; resetBtn.querySelector('span').textContent = 'Effacer la progression'; resetBtn.classList.remove('armed'); }, 4000);
      resetBtn.querySelector('span').textContent = 'Confirmer : tout effacer';
      resetBtn.classList.add('armed');
      return;
    }
    clearTimeout(armed);
    app.reset();
    app.parentOk = Date.now();
    app.render();
  });

  const paperRows = order.filter((id) => paperState(st, id).n > 0).map((id) => {
    const p = paperState(st, id);
    const seen = h('span', { class: 'chip st-ok' }, 'Vu par un adulte');
    const btn = h('button', { class: 'btn-sec sm', type: 'button', onClick: () => { confirmPaper(st, id); app.save(); sfx('tap'); btn.replaceWith(seen); } }, 'Marquer comme vu');
    // Comment ça s'est passé, d'après l'adulte qui a regardé le cahier (facultatif) ; « à retravailler » remet l'exercice dans les « à reprendre »
    const avisBtns = AVIS_PAPIER.map(([k, label]) => h('button', {
      class: `avis-btn${paperState(st, id).avis === k ? ' on' : ''}`, type: 'button', 'data-avis': k, 'aria-pressed': String(paperState(st, id).avis === k),
      onClick: () => { avisPapier(st, id, k); app.save(); sfx('tap'); avisBtns.forEach((x) => { const on = x.dataset.avis === k; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); }); seen.isConnected || btn.replaceWith(seen); },
    }, label));
    return h('li', { class: 'paper-row' }, h('span', { class: 'gl', html: glyphIcon(id, { width: 0.34 }) }),
      h('div', {}, h('strong', {}, SKILLS[id].title), h('small', {}, `${p.n} essai${p.n > 1 ? 's' : ''} sur papier · dernier le ${new Date(p.last).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`),
        h('div', { class: 'avis', role: 'group', 'aria-label': 'Comment cela s’est passé' }, avisBtns)),
      p.seen ? seen : btn);
  });
  const paperCard = card('Écrire sur papier',
    paperRows.length ? h('ul', { class: 'recs' }, paperRows) : h('p', { class: 'muted' }, 'Pas encore d’essai sur papier. Après un exercice, le renard propose une « mission cahier » : l’enfant écrit sur une vraie feuille, puis déclare « J’ai essayé ».'),
    h('p', { class: 'muted' }, 'L’application ne peut pas voir le papier : c’est l’enfant qui déclare, et vous pouvez regarder son travail, le marquer comme vu et noter comment cela s’est passé. « À retravailler » remet l’exercice dans les « à reprendre » du renard. Le geste sur papier reste le vrai but.'));

  // Dictées : ce que l'enfant a écrit sans modèle (indication pour les adultes ; rien ne change dans les exercices acquis)
  const dictees = Object.entries(st.dictees || {}).filter(([id]) => SKILLS[id]).sort((a, b) => (b[1].t || 0) - (a[1].t || 0));
  const dicteeCard = card('Dictées',
    dictees.length
      ? h('ul', { class: 'recs dict-list' }, dictees.slice(0, 12).map(([id, d]) => h('li', { class: 'paper-row dict-row', 'data-id': id },
        h('span', { class: 'gl', html: glyphIcon(id, { width: 0.34 }) }),
        h('div', {}, h('strong', {}, SKILLS[id].title), h('small', {}, `${d.n} dictée${d.n > 1 ? 's' : ''} · dernier résultat : ${'★'.repeat(d.last)}${'☆'.repeat(3 - d.last)}${d.last < 2 ? ' · à revoir' : ''}`)))))
      : h('p', { class: 'muted' }, 'Pas encore de dictée. Dans « Jeux », le renard dit une lettre ou un mot et l’enfant l’écrit sans aucun modèle.'),
    h('p', { class: 'muted' }, 'Une dictée ne change rien aux exercices acquis et ne rapporte ni vignette ni accessoire : c’est un contrôle amical, à regarder comme une indication. Un résultat à revoir veut seulement dire que l’exercice mérite d’être repris, sur la tablette ou sur le papier.'));

  root.append(
    h('header', { class: 'bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Fermer l’espace parents', onClick: () => { app.parentOk = 0; app.go('accueil'); }, html: icon('close', 26) }),
      h('div', { class: 'bar-title' }, h('h2', {}, 'Espace parents'), h('p', {}, st.name ? `Suivi de ${st.name}` : 'Suivi de l’enfant'))),
    h('div', { class: 'pgrid' },
      wide(card('Aujourd’hui',
        h('div', { class: 'big-stats' },
          h('div', {}, h('b', {}, `${today}`), h('span', {}, 'min aujourd’hui')),
          h('div', {}, h('b', {}, `${week}`), h('span', {}, 'min sur 7 jours')),
          h('div', {}, h('b', {}, `${done}/${total}`), h('span', {}, 'compétences acquises'))),
        h('div', { class: 'chart-wrap', html: usageChart(st) }),
        h('p', { class: 'muted' }, st.settings.pauseMin ? `Seul le temps d’activité compte. Le renard propose une pause après ${st.settings.pauseMin} minutes d’activité continue (réglable plus bas).` : 'Seul le temps d’activité compte. Les pauses sont désactivées (réglable plus bas).'))),
      reglesCard(),
      card('Progression par niveau', ...levelBars),
      card('Exercices recommandés', recList),
      card('Difficultés rencontrées', diffList),
      paperCard,
      dicteeCard,
      wide(card('Lettres, sons, mots et phrases',
        ...letterBlocks,
        h('p', { class: 'muted' }, '«\u00A0Acquise\u00A0» : écrite de mémoire, sans aide, avec 2 étoiles ou plus. «\u00A0Consolidée\u00A0» : réussie de nouveau, sans aide, à plusieurs jours d’intervalle, signe que le geste tient dans la durée. Les mots et les phrases se composent de lettres détachées (pas encore de liaisons), en minuscules, sans accents.'))),
      wide(card('Compétences', h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Exercice'), h('th', {}, 'État'), h('th', { class: 'num' }, 'Essais'), h('th', { class: 'num' }, 'Papier'), h('th', { class: 'num' }, 'Moyenne récente'), h('th', { class: 'num' }, 'Dernier'))), h('tbody', {}, rows))))),
      card('Album de vignettes',
        h('div', { class: 'lvrow' },
          h('div', { class: 'lvname' }, h('strong', {}, `${stickerCount(st)} sur ${STICKERS.length}`), h('span', {}, 'vignettes d’animaux collées')),
          h('div', { class: 'bar-track', role: 'img', 'aria-label': `${stickerCount(st)} vignettes sur ${STICKERS.length}` }, h('div', { class: 'bar-fill', style: { width: `${Math.max((stickerCount(st) / STICKERS.length) * 100, stickerCount(st) ? 6 : 0)}%` } }))),
        h('div', { class: 'mini-stk' }, STICKERS.filter((x) => st.stickers?.[x.id]).map((x) => h('span', { title: x.name, html: stickerSVG(x.animal) }))),
        h('p', { class: 'muted' }, 'Les vignettes récompensent la réussite (trois étoiles ou exercice acquis), la persévérance (recommencer après un essai difficile), les étapes franchies et l’écriture sur papier. Pas de tirage au sort, pas de série à maintenir, rien pour le temps passé : une vignette gagnée reste acquise.')),
      ...settingsCards(app),
      orderCard(app),
      card('Cahiers à imprimer', h('p', { class: 'muted' }, 'Trois cahiers de vacances tout prêts (un par niveau, 11 pages) : les mêmes modèles que sur l’écran, en grand, avec des jeux autour du renard.'),
        h('button', { class: 'btn-sec', type: 'button', onClick: () => { app.papierFrom = 'parents'; app.go('papier'); }, html: `${icon('page', 22)}<span>Voir les cahiers</span>` })),
      backupCard(app),
      card('Données de l’enfant', h('p', { class: 'muted' }, 'Effacer supprime la progression, les vignettes, les dessins de la galerie et les réglages de cet appareil. Pensez à créer un code de sauvegarde avant.'), resetBtn),
      card('Vie privée',
        h('ul', { class: 'privacy' }, [
          'Aucune publicité, aucun compte, aucun achat intégré.',
          'Aucune donnée ne quitte cet appareil : la progression est enregistrée ici seulement, et la sauvegarde est un code que vous gardez.',
          'Pas de série à ne pas casser, pas de minuteur, pas de classement : les récompenses valorisent ce qui est appris.',
          'Les dessins ne sont conservés que si vous activez la galerie (désactivée par défaut) et que l’enfant choisit d’en accrocher un ; ils restent sur l’appareil.',
          'Aucun enregistrement du son, de l’image ni de la position.',
        ].map((t) => h('li', { html: `${icon('check', 20)}<span>${t}</span>` }))))),
  );
}
