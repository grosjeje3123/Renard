// Écran d'exercice : le renard présente, montre le geste, puis l'enfant trace (guide → pointillés → seul).
import { h, icon, sleep, pick } from '../dom.js';
import { forestScene, itemSVG, templateOf, glyphIcon } from '../art.js';
import { Board } from '../board.js';
import { bubble, makeSpeaker } from '../say.js';
import { SKILLS, ITEMS, LEVELS, isWriting } from '../../content/skills.js';
import { Session } from '../../core/session.js';
import { recognizerContext } from '../../core/tolerance.js';
import { epaisseur } from '../../core/epaisseur.js';
import { recognizer } from '../../engine/recognizer.js';
import { buildFeedback } from '../../engine/feedback.js';
import { surpriseOk } from '../../core/dictee.js';
import { masteredCount } from '../../core/progress.js';
import { distribuer } from '../../core/progress.js';
import { recordSession, awardStickers, isSkillOpen, skillState, startPhaseFor, breakDue, beginSleep, blocked, noterSerie, serieAFeter, levelSections } from '../../core/progress.js';
import { STICKER_BY_ID } from '../../content/stickers.js';
import { stickerSVG } from '../animals.js';
import { dist, polyLength } from '../../engine/geometry.js';
import { sfx, speak, stopSpeaking } from '../audio.js';

const PHASE_NAMES = ['Le guide', 'Pointillés', 'Tout seul'];
const PHASE_HELP = ['Étape 1 sur 3 : je suis le guide', 'Étape 2 sur 3 : je suis les pointillés', 'Étape 3 sur 3 : j’écris tout seul'];
const PHASE_BANNER = ['Le guide : je suis le chemin', 'Les pointillés : je suis les points', 'Tout seul : j’écris de mémoire'];
const PHASE_ICONS = [
  '<svg viewBox="0 0 40 24"><path d="M4 18C12 2 20 2 24 12s8 8 12-8" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>',
  '<svg viewBox="0 0 40 24"><path d="M4 18C12 2 20 2 24 12s8 8 12-8" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 7"/></svg>',
  '<svg viewBox="0 0 40 24"><path d="M6 20l2-7L26 3a3 3 0 014 4L12 18zM24 5l4 4" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
];

export function exercise(root, app, skillId) {
  const skill = SKILLS[skillId];
  if (!skill) { app.go('accueil'); return; }
  if (!isSkillOpen(app.state, skillId)) { app.go(`carte-${skill.level}`); return; }
  if (blocked(app.state)) { app.go('pause'); return; } // pause douce ou limite du jour

  const st = app.state;
  const tpl = templateOf(skillId);
  const startPhase = st.settings.demo ? 0 : startPhaseFor(st, skillId); // déjà acquis un autre jour : rappel « tout seul »
  const defi = startPhase === 2 && !skillState(st, skillId).sessions; // enfant très à l'aise : défi « tout seul » sur un exercice nouveau
  const session = new Session(skillId, { demo: st.settings.demo, startPhase, reps: st.settings.reps, defi });
  const level = LEVELS.find((l) => l.skills.includes(skillId));
  const item = skill.item ? ITEMS[skill.item] : null;
  const writing = isWriting(skill);
  const already = skillState(st, skillId).mastered;
  let alive = true, busy = true, strokeIdx = 0, strokeEvals = [], retries = 0;

  root.classList.add('exo');
  const foxHost = h('div', { class: 'side-fox' });
  const b = bubble();
  const boardHost = h('div', { class: 'board-host' });
  const starsPop = h('div', { class: 'stars-pop', 'aria-hidden': 'true' });
  const banner = h('div', { class: 'phase-banner', role: 'status' }); // « Étape 2 sur 3 : les pointillés », affiché un instant à chaque changement d'étape
  // Avancement bien visible : trois grandes étapes (fait = vert coché, en cours = orange, à venir = blanc), avec sous chacune
  // les réussites demandées (une ou deux pastilles), et au-dessus du cahier la place de l'exercice dans sa série.
  const marksEls = [];
  const phaseEls = PHASE_NAMES.map((t, i) => {
    const marks = h('span', { class: 'ph-marks', 'aria-hidden': 'true' });
    marksEls.push(marks);
    return h('li', { class: 'phase', title: PHASE_HELP[i] },
      h('span', { class: 'ph-n', 'aria-hidden': 'true' }, String(i + 1)),
      h('span', { class: 'ph-ico', html: PHASE_ICONS[i] }),
      h('span', { class: 'ph-txt' }, h('span', { class: 'ph-name' }, t), marks));
  });
  const secs = levelSections(app.state, level);
  const sec = secs.find((x) => x.skills.includes(skillId));
  const serieEl = sec && sec.skills.length > 1 ? h('div', { class: 'serie-track', 'aria-label': `Exercice ${sec.skills.indexOf(skillId) + 1} sur ${sec.skills.length} de la série` },
    h('span', { class: 'st-lbl' }, `${sec.title ? sec.title + ' · ' : ''}${sec.skills.indexOf(skillId) + 1} / ${sec.skills.length}`),
    h('span', { class: 'st-dots', 'aria-hidden': 'true' }, sec.skills.map((id) => h('span', { class: `st-dot${id === skillId ? ' cur' : skillState(app.state, id).mastered ? ' ok' : ''}` })))) : null;
  const replayBtn = h('button', { class: 'chip-btn', type: 'button', html: `${icon('replay', 22)}<span>Revoir</span>` });

  // La page de travail reste sobre : le modèle à écrire, rien d'autre (les récompenses se découvrent à la fin, pas pendant l'effort).
  const cardText = skill.short;
  const card = h('button', { class: 'exo-card', type: 'button', 'aria-label': cardText },
    skill.capital ? null : h('span', { class: 'ec-art ec-glyph', html: glyphIcon(skillId, { stroke: 'var(--accent-deep)', width: 0.3 }) }),
    h('span', { class: 'ec-text' },
      writing ? h('span', { class: `ec-letter${skill.kind === 'word' ? ' word' : ''}${skill.phrase ? ' phrase' : ''}` }, skill.glyph) : null,
      h('span', {}, cardText)),
    writing ? h('span', { class: 'ec-ear', 'aria-hidden': 'true', html: icon('speaker', 22) }) : null);
  // Modèle à côté du cahier (côté opposé à la main qui écrit) : on le voit même quand la main cache le guide.
  const modelChip = h('div', { class: 'model-chip', 'aria-label': 'Le modèle', html: glyphIcon(skillId, { stroke: 'var(--text)', width: 0.2, pad: 0.4 }) });

  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar exo-bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour à la carte', onClick: () => app.go(`carte-${level.id}`), html: icon('back', 26) }),
      h('div', { class: 'bar-title' }, h('h2', {}, skill.title), serieEl || h('p', {}, level.name)),
      h('div', { class: 'phases-box' },
        h('ul', { class: 'phases', 'aria-label': 'Les trois étapes : le guide, les pointillés, puis tout seul' }, phaseEls)),
    ),
    h('div', { class: 'exo-main' },
      h('aside', { class: 'side' }, foxHost, b, h('div', { class: 'side-actions' }, replayBtn), card, modelChip),
      h('div', { class: 'board-wrap' }, boardHost, starsPop, banner),
    ),
  );

  const fox = app.makeFox(foxHost);
  const speaker = makeSpeaker(fox, b);
  const say = (t, o) => (alive ? speaker.say(t, o) : Promise.resolve());

  const board = new Board(boardHost, tpl, {
    allowTap: () => tpl.strokes[strokeIdx]?.kind === 'dot',
    shouldHold: (s) => {
      const ts = tpl.strokes[strokeIdx];
      return ts.kind === 'path' && polyLength(s.points) > 0.5 && dist(s.points[s.points.length - 1], ts.end) > 1.4;
    },
    onStrokeStart: () => sfx('start'),
    onStrokeEnd: (s) => onStrokeEnd(s),
  });

  // Épaisseur du trait : celle du niveau ou des parents, et un cran de plus si l'enfant a du mal (cette séance ou les précédentes).
  const applyEpaisseur = () => board.setEpaisseur(epaisseur(st, skill, session.log));
  applyEpaisseur();

  function updateUI() {
    applyEpaisseur();
    phaseEls.forEach((el, i) => { el.classList.toggle('on', i === session.phase); el.classList.toggle('past', i < session.phase); if (i === session.phase) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current'); });
    marksEls.forEach((m, i) => {
      const done = i < session.phase ? session.need[i] : i === session.phase ? session.wins[i] : 0;
      m.innerHTML = session.need[i] > 1 ? Array.from({ length: session.need[i] }, (_, k) => `<i class="${k < done ? 'on' : ''}"></i>`).join('') : '';
    });
    phaseEls.forEach((el, i) => { el.querySelector('.ph-n').innerHTML = i < session.phase ? icon('check', 20) : String(i + 1); });
    board.setPhase(session.phase);
    modelChip.hidden = session.phase >= 2 && !session.helped; // de mémoire : pas de modèle, sauf si l'enfant l'a redemandé
  }

  // Annonce claire de l'étape : à l'arrivée, puis chaque fois qu'on avance (ou qu'on revient en arrière). Ne se répète pas pour un simple nouvel essai.
  let annonce = -1, premiere = true;
  function announce() {
    if (annonce === session.phase) return;
    annonce = session.phase;
    const p = session.phase;
    // Montée de difficulté : on le dit en grand (et à voix haute, voir plus bas), c'est une fierté pour l'enfant.
    const saut = premiere && (startPhase === 1 || defi);
    premiere = false;
    banner.classList.toggle('bravo', saut);
    banner.innerHTML = saut
      ? `<span class="pb-ico" aria-hidden="true">${icon('star', 34)}</span><span class="pb-txt"><b>Tu écris déjà bien !</b><span>${defi ? 'Défi : tout seul du premier coup' : 'Directement les pointillés'}</span></span>`
      : `<span class="pb-ico" aria-hidden="true">${PHASE_ICONS[p]}</span><span class="pb-txt"><b>Étape ${p + 1} sur 3</b><span>${PHASE_BANNER[p]}</span></span>`;
    banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show');
  }

  function beginTry() {
    if (!alive) return;
    strokeIdx = 0; strokeEvals = []; retries = 0;
    board.clearInk();
    board.setProgress(0, 0);
    updateUI();
    board.enable(true);
    announce();
    busy = false;
  }

  function showStars(n) {
    starsPop.innerHTML = [0, 1, 2].map((i) => `<span class="st ${i < n ? 'on' : ''}" style="animation-delay:${i * 0.18}s">${icon(i < n ? 'star' : 'starO', 64)}</span>`).join('');
    starsPop.classList.remove('show'); void starsPop.offsetWidth; starsPop.classList.add('show');
    for (let i = 0; i < n; i++) setTimeout(() => alive && sfx('star', i), 180 * i + 120);
    setTimeout(() => starsPop.classList.remove('show'), 1900);
  }

  async function onStrokeEnd(stroke) {
    if (!alive || busy) return;
    const ts = tpl.strokes[strokeIdx];
    if (ts.kind === 'path' && polyLength(stroke.points) < 0.5) { board.removeInk(stroke.el); return; } // simple effleurement
    busy = true; board.enable(false);
    const ctx = recognizerContext(skill, session.phase, st.settings, stroke.pointerType, tpl.board?.W);
    const ev = recognizer.evaluateStroke(ts, { points: stroke.points, lifts: stroke.lifts }, ctx);
    board.markInk(stroke.el, ev.stars);

    if (tpl.strokes.length > 1 && ev.stars === 0 && retries < 1) {
      retries++; sfx('oops');
      say('Essaie encore ce trait, doucement.', { mood: 'encourage', icon: 'hand' });
      await sleep(900);
      board.removeInk(stroke.el); board.enable(true); busy = false;
      return;
    }
    strokeEvals.push(ev); retries = 0; strokeIdx++;
    if (strokeIdx < tpl.strokes.length) {
      board.setProgress(strokeIdx, strokeIdx);
      sfx('ok');
      fox.setMood('joy', 700);
      await sleep(350);
      board.enable(true); busy = false;
      return;
    }
    await finishTry(recognizer.evaluateAttempt(tpl, strokeEvals));
  }

  async function finishTry(attempt) {
    const res0 = session.phase; // phase de l'essai
    const fb = buildFeedback(attempt);
    showStars(attempt.stars);
    if (attempt.stars >= 2) { const p = board.lastInkPoint(); board.burst(p.x, p.y); sfx('ok'); } else sfx('oops');
    if (res0 >= 1 || attempt.stars < 3) board.showModel(1900);
    const talk = say(fb.text, { mood: fb.mood, ms: 3000 });
    await Promise.all([talk, sleep(1500)]);
    if (!alive) return;

    const res = session.submit(attempt);
    updateUI();
    if (res.action === 'done') return endSession();
    if (res.action === 'phase') {
      await say(session.phase === 1 ? 'Bravo ! Étape 2 : suis les pointillés.' : 'Bravo ! Étape 3 : plus de guide, écris tout seul, de mémoire.', { mood: 'joy', ms: 2600, icon: 'star' });
    } else if (res.action === 'back') {
      await say(res.defi ? 'Presque ! On s’entraîne d’abord avec les pointillés.' : 'Regardons encore une fois, je te montre.', { mood: 'encourage', icon: 'eye' });
      board.clearInk(); board.setProgress(0, 0);
      await board.playDemo();
    } else if (res.rewatch) {
      await say('Regarde, je te montre encore une fois.', { mood: 'encourage', icon: 'eye' });
      board.clearInk(); board.setProgress(0, 0);
      await board.playDemo();
    }
    if (!alive) return;
    beginTry();
    say(skill.say.bubble, { silent: true, icon: 'hand' });
  }

  async function replay() {
    if (busy || !alive) return;
    busy = true; board.enable(false);
    session.rewatch();
    board.clearInk(); board.setProgress(0, 0);
    say(skill.say.how, { mood: 'neutral', icon: 'eye' });
    await board.playDemo();
    if (alive) beginTry();
  }

  async function endSession() {
    const summary = session.summary();
    const r = recordSession(st, skillId, session);
    const cadeau = distribuer(st, r.newlyMastered); // une seule récompense à la fois, et pas à chaque exercice (rien ne se perd)
    const won = cadeau?.t === 'stk' ? [cadeau.id] : [];
    const gagne = cadeau?.t === 'item' ? ITEMS[cadeau.id] : null;
    if (r.newlyMastered) noterSerie(st, skillId); // la série de cet exercice est-elle terminée ? On la fête sur l'écran suivant
    if (gagne && gagne.type === 'accessoire' && !st.equipped.includes(gagne.id)) st.equipped.push(gagne.id);
    if (st.settings.pauseMode === 'douce' && breakDue(st)) beginSleep(st); // le renard s'endort quelques minutes
    app.save();
    board.enable(false);
    const mastered = session.mastered;
    const tired = session.ended === 'tired';
    const title = mastered
      ? (skill.kind === 'letter' ? `Bravo ! Tu sais écrire le ${skill.glyph} !` : skill.phrase ? `Bravo ! Tu sais écrire la phrase « ${skill.glyph} » !` : skill.kind === 'word' ? `Bravo ! Tu sais écrire « ${skill.glyph} » !` : `Bravo ! Tu as réussi : ${skill.title.toLowerCase()} !`)
      : tired ? 'On a bien travaillé ! On reprendra une autre fois.' : skill.kind === 'word' ? 'Bravo ! Encore un essai sans aide pour réussir ce mot.' : 'Bravo ! Encore un essai sans aide pour réussir.';
    const pause = breakDue(st) || !!blocked(st);

    const resFoxHost = h('div', { class: 'res-fox' });
    const starsRow = h('div', { class: 'res-stars', 'aria-label': 'Tes essais' }, summary.stars.map((n) => h('span', { class: `rs s${n}`, html: icon(n >= 2 ? 'star' : 'starO', 26) })));
    const again = blocked(st) ? null : h('button', { class: 'btn-sec', type: 'button', onClick: () => app.go(`exercice-${skillId}`) }, 'Refaire');
    const fete = pause ? null : serieAFeter(st, level.id); // une série vient d'être terminée : « Suite » mène à la fête, puis à la série suivante
    const feteTitre = fete ? levelSections(st, level)[fete.index].title : '';
    const next = h('button', { class: 'btn-big sm', type: 'button', onClick: () => app.go(pause ? 'pause' : fete ? `serie-${level.id}-${fete.index}` : `carte-${level.id}`), html: `${icon(pause ? 'moon' : fete ? 'star' : 'arrowR', 28)}<span>${pause ? 'Pause' : fete ? 'On fête ça !' : 'Suite'}</span>` });
    const serieFinie = fete ? h('p', { class: 'res-serie', html: `${icon('star', 22)}<span>La série « ${feteTitre} » est terminée !</span>` }) : null;
    const paper = mastered
      ? h('button', { class: 'res-paper', type: 'button', onClick: () => app.go(`cahier-${skillId}`), html: `${icon('pencil', 26)}<span><strong>Essaie sur ton cahier !</strong><small>Du vrai papier, avec ton crayon.</small></span>` })
      : null;
    // Pour casser la monotonie : tous les 5 exercices acquis, le renard propose une petite dictée surprise (l'enfant peut passer).
    const surprise = r.newlyMastered && !pause && !fete && masteredCount(st) % 5 === 0 && surpriseOk(st)
      ? h('button', { class: 'res-paper res-dictee', type: 'button', onClick: () => { app.dicteeApres = `carte-${level.id}`; app.go('dictee-surprise'); }, html: `${icon('dice', 26)}<span><strong>Une petite dictée surprise ?</strong><small>Trois choses à écrire de mémoire.</small></span>` })
      : null;
    const consolidated = r.consolidated ? h('p', { class: 'res-consol', html: `${icon('star', 22)}<span>Tu t’en souviens, même après plusieurs jours !</span>` }) : null;
    const reward = gagne
      ? h('div', { class: 'res-reward' }, h('div', { class: 'rr-art', html: itemSVG(gagne.id) }), h('p', {}, `Tu gagnes : ${gagne.name}`), gagne.type === 'accessoire' ? h('small', {}, 'Le renard le porte déjà !') : h('small', {}, 'Il t’attend dans ton coin de forêt.'))
      : null;
    const wSize = won.length === 1 ? 104 : won.length === 2 ? 92 : 76;
    const stickers = won.length
      ? h('div', { class: 'res-stickers' },
        h('h3', {}, won.length > 1 ? 'Nouvelles vignettes !' : 'Nouvelle vignette !'),
        h('div', { class: 'rs-row' }, won.map((id, i) => h('div', { class: 'rs-stk', style: { '--w': `${wSize}px`, '--d': `${1 + i * 0.6}s` } },
          h('div', { class: 'rs-pic', html: stickerSVG(STICKER_BY_ID[id].animal) }), h('p', { class: 'rs-name' }, STICKER_BY_ID[id].name)))),
        h('button', { class: 'btn-sec sm', type: 'button', onClick: () => app.go('album') }, 'Voir mon album'))
      : null;
    const overlay = h('div', { class: 'result', role: 'dialog', 'aria-label': 'Résultat' },
      h('div', { class: `result-card${reward || stickers ? ' rich' : ''}` }, resFoxHost, h('h2', {}, title), starsRow, consolidated, serieFinie, reward || stickers ? h('div', { class: 'res-gifts' }, reward, stickers) : null, surprise || paper,
        pause ? h('p', { class: 'res-pause', html: `${icon('moon', 20)}<span>Tu as bien travaillé aujourd’hui. Une pause, ça fait du bien.</span>` }) : null,
        h('div', { class: 'res-actions' }, again, next)));
    root.append(overlay);
    const rf = app.makeFox(resFoxHost, { accessories: app.equipped() });
    rf.setMood(mastered ? 'joy' : 'encourage', 4000);
    sfx(mastered ? 'win' : 'ok');
    if (r.newlyMastered) setTimeout(() => alive && sfx('unlock'), 700);
    won.forEach((_, i) => setTimeout(() => alive && sfx('sticker'), (1 + i * 0.6) * 1000 + 520));
    // Le titre, puis la récompense, puis l'anecdote de l'animal : tout est lu à voix haute (les enfants ne lisent pas encore).
    const sk1 = won.length ? STICKER_BY_ID[won[0]] : null;
    const giftLine = sk1 ? ` Une nouvelle vignette : ${sk1.name.charAt(0).toLowerCase()}${sk1.name.slice(1)} ! ${sk1.fact}` : gagne ? ` Tu gagnes : ${gagne.name.charAt(0).toLowerCase()}${gagne.name.slice(1)} !` : '';
    speak(title + giftLine, { onStart: () => rf.talk(true), onEnd: () => rf.talk(false) });
    cleanupExtras.push(() => rf.destroy());
  }

  const cleanupExtras = [];
  replayBtn.addEventListener('click', () => { sfx('tap'); replay(); });
  card.addEventListener('click', () => { if (writing) { sfx('pop'); speak(skill.short, { onStart: () => fox.talk(true), onEnd: () => fox.talk(false) }); } });

  (async () => {
    updateUI();
    board.enable(false);
    await sleep(350);
    await Promise.all([say(defi ? 'Tu écris si bien ! Défi : regarde le geste, puis écris-le tout seul du premier coup.' : startPhase === 2 ? 'On se retrouve ! Regarde le geste une fois, puis écris de mémoire.' : skill.say.intro, { mood: 'neutral', icon: 'eye', ms: 1500 }), sleep(900).then(() => board.playDemo())]);
    if (!alive) return;
    beginTry();
    say(startPhase === 1 ? 'Tu écris déjà bien ! On saute le guide. Étape 2 : suis les pointillés.' : startPhase === 2 ? 'À toi ! Étape 3 : écris de mémoire.' : 'À toi ! Étape 1 : suis le guide.', { mood: 'encourage', icon: 'hand', ms: 1800 });
  })();

  return () => { alive = false; board.destroy(); fox.destroy(); cleanupExtras.forEach((f) => f()); stopSpeaking(); };
}
