// La dictée : le renard dit une lettre, un chiffre ou un mot, l'enfant l'écrit sans aucun modèle (ni guide, ni point de départ).
// Après chaque essai le modèle apparaît un instant pour comparer, puis on passe au suivant. Cinq exercices par dictée.
// Une dictée ne change jamais la maîtrise d'un exercice et ne donne ni vignette ni accessoire : c'est un contrôle amical.
// Elle n'utilise que ce que l'enfant sait déjà écrire (core/dictee.js). Adresse : #dictee.
import { h, icon, sleep } from '../dom.js';
import { forestScene, templateOf } from '../art.js';
import { Board } from '../board.js';
import { bubble, makeSpeaker } from '../say.js';
import { SKILLS } from '../../content/skills.js';
import { DICTEE_INVITE, DICTEE_FIN, dicteeDit } from '../../content/dictee.js';
import { recognizerContext } from '../../core/tolerance.js';
import { epaisseur } from '../../core/epaisseur.js';
import { recognizer } from '../../engine/recognizer.js';
import { buildFeedback } from '../../engine/feedback.js';
import { dicteeItems, dicteePossible, recordDictee } from '../../core/dictee.js';
import { blocked, breakDue } from '../../core/progress.js';
import { dist, polyLength } from '../../engine/geometry.js';
import { sfx, speak, stopSpeaking } from '../audio.js';

export function dictee(root, app) {
  const st = app.state;
  if (blocked(st)) { app.go('pause'); return; }
  // Sans la voix du renard il n'y a rien à écouter ; sans exercices acquis ou essayés il n'y a rien à dicter
  if (!st.settings.voix || !dicteePossible(st)) { app.go('jeux'); return; }

  let alive = true, busy = true, items = dicteeItems(st), i = 0, results = [];
  let skill = null, tpl = null, board = null, strokeIdx = 0, strokeEvals = [], retries = 0, overlay = null;

  root.classList.add('exo', 'dictee');
  const foxHost = h('div', { class: 'side-fox' });
  const b = bubble();
  const boardHost = h('div', { class: 'board-host' });
  const starsPop = h('div', { class: 'stars-pop', 'aria-hidden': 'true' });
  const dotsEl = h('ul', { class: 'dc-dots' });
  const replayBtn = h('button', { class: 'chip-btn dc-listen', type: 'button', html: `${icon('speaker', 22)}<span>Réécouter</span>` });
  const skipBtn = h('button', { class: 'chip-btn dc-skip', type: 'button', html: `${icon('arrowR', 22)}<span>Passer</span>` });

  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar exo-bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour aux jeux', onClick: () => { sfx('tap'); app.go('jeux'); }, html: icon('back', 26) }),
      h('div', { class: 'bar-title' }, h('h2', {}, 'La dictée'), h('p', {}, 'Écoute, puis écris')),
      dotsEl,
    ),
    h('div', { class: 'exo-main' },
      h('aside', { class: 'side' }, foxHost, b, h('div', { class: 'side-actions' }, replayBtn, skipBtn)),
      h('div', { class: 'board-wrap' }, boardHost, starsPop),
    ),
  );

  const fox = app.makeFox(foxHost);
  const speaker = makeSpeaker(fox, b);
  const say = (t, o) => (alive ? speaker.say(t, o) : Promise.resolve());
  const cleanupExtras = [];

  function drawDots() {
    dotsEl.replaceChildren(...items.map((_, k) => {
      const r = results[k];
      const cls = k < results.length ? (r == null ? 'skip' : r >= 2 ? 'ok' : 'try') : k === i ? 'now' : '';
      return h('li', { class: `dc-dot ${cls}`, 'aria-label': k < results.length ? (r == null ? 'passé' : `${r} étoile${r > 1 ? 's' : ''}`) : k === i ? 'en cours' : 'à venir', html: k < results.length && r != null ? icon(r >= 2 ? 'star' : 'starO', 18) : String(k + 1) });
    }));
    dotsEl.setAttribute('aria-label', `Exercice ${Math.min(i + 1, items.length)} sur ${items.length}`);
  }

  function showStars(n) {
    starsPop.innerHTML = [0, 1, 2].map((k) => `<span class="st ${k < n ? 'on' : ''}" style="animation-delay:${k * 0.18}s">${icon(k < n ? 'star' : 'starO', 64)}</span>`).join('');
    starsPop.classList.remove('show'); void starsPop.offsetWidth; starsPop.classList.add('show');
    for (let k = 0; k < n; k++) setTimeout(() => alive && sfx('star', k), 180 * k + 120);
    setTimeout(() => starsPop.classList.remove('show'), 1900);
  }

  /** Le cahier de l'exercice en cours : phase « tout seul », aucun guide, aucun point de départ. */
  function buildBoard() {
    board?.destroy();
    board = new Board(boardHost, tpl, {
      allowTap: () => tpl.strokes[strokeIdx]?.kind === 'dot',
      shouldHold: (s) => {
        const ts = tpl.strokes[strokeIdx];
        return ts.kind === 'path' && polyLength(s.points) > 0.5 && dist(s.points[s.points.length - 1], ts.end) > 1.4;
      },
      onStrokeStart: () => sfx('start'),
      onStrokeEnd: (s) => onStrokeEnd(s),
    });
    board.setPhase(2);
    board.setEpaisseur(epaisseur(st, skill, []));
    board.setProgress(0, 0);
    board.enable(false);
  }

  const ecoute = () => say(DICTEE_INVITE, { dit: dicteeDit(skill), mood: 'neutral', icon: 'speaker', ms: 1500 });

  async function nextItem() {
    if (!alive) return;
    if (i >= items.length) return fin();
    skill = SKILLS[items[i]]; tpl = templateOf(items[i]);
    strokeIdx = 0; strokeEvals = []; retries = 0; busy = true;
    buildBoard();
    drawDots();
    skipBtn.disabled = replayBtn.disabled = true;
    await sleep(350);
    if (!alive) return;
    await ecoute();
    if (!alive) return;
    board.enable(true); busy = false;
    skipBtn.disabled = replayBtn.disabled = false;
  }

  async function onStrokeEnd(stroke) {
    if (!alive || busy) return;
    const ts = tpl.strokes[strokeIdx];
    if (ts.kind === 'path' && polyLength(stroke.points) < 0.5) { board.removeInk(stroke.el); return; } // simple effleurement
    busy = true; board.enable(false); skipBtn.disabled = replayBtn.disabled = true;
    const ctx = recognizerContext(skill, 2, st.settings, stroke.pointerType, tpl.board?.W);
    const ev = recognizer.evaluateStroke(ts, { points: stroke.points, lifts: stroke.lifts }, ctx);
    board.markInk(stroke.el, ev.stars);
    if (tpl.strokes.length > 1 && ev.stars === 0 && retries < 1) {
      retries++; sfx('oops');
      say('Essaie encore ce trait, doucement.', { mood: 'encourage', icon: 'hand' });
      await sleep(900);
      board.removeInk(stroke.el); board.enable(true); busy = false; skipBtn.disabled = replayBtn.disabled = false;
      return;
    }
    strokeEvals.push(ev); retries = 0; strokeIdx++;
    if (strokeIdx < tpl.strokes.length) {
      board.setProgress(strokeIdx, strokeIdx);
      sfx('ok'); fox.setMood('joy', 700);
      await sleep(350);
      board.enable(true); busy = false; skipBtn.disabled = replayBtn.disabled = false;
      return;
    }
    await finishItem(recognizer.evaluateAttempt(tpl, strokeEvals));
  }

  async function finishItem(attempt) {
    const fb = buildFeedback(attempt);
    results.push(attempt.stars);
    recordDictee(st, items[i], attempt.stars);
    app.save();
    showStars(attempt.stars);
    if (attempt.stars >= 2) { const p = board.lastInkPoint(); board.burst(p.x, p.y); sfx('ok'); } else sfx('oops');
    board.showModel(2400); // le modèle, pour comparer : c'est là que l'enfant apprend
    drawDots();
    await Promise.all([say(fb.text, { mood: fb.mood, ms: 3000 }), sleep(2000)]);
    if (!alive) return;
    i++;
    nextItem();
  }

  function skip() {
    if (busy || !alive) return;
    sfx('tap'); busy = true; board.enable(false);
    results.push(null); // passé : rien n'est noté
    i++;
    nextItem();
  }

  async function fin() {
    busy = true;
    board?.enable(false);
    drawDots();
    const faits = results.filter((n) => n != null);
    const pause = breakDue(st) || !!blocked(st);
    const resFoxHost = h('div', { class: 'res-fox' });
    const recap = h('ul', { class: 'dc-recap', 'aria-label': 'Ce que tu as écrit' },
      items.map((id, k) => {
        const r = results[k], s = SKILLS[id];
        return h('li', { class: `dc-r${r == null ? ' skip' : ''}` },
          h('span', { class: `dc-glyph${s.kind === 'word' ? ' word' : ''}` }, s.glyph),
          h('span', { class: 'dc-st', 'aria-label': r == null ? 'passé' : `${r} étoile${r > 1 ? 's' : ''}`, html: r == null ? '–' : [0, 1, 2].map((n) => `<span class="rs ${n < r ? 's3' : ''}">${icon(n < r ? 'star' : 'starO', 18)}</span>`).join('') }));
      }));
    const encore = pause ? null : h('button', { class: 'btn-sec', type: 'button', onClick: () => restart(), html: `${icon('replay', 22)}<span>Une autre dictée</span>` });
    const retour = h('button', { class: 'btn-big sm', type: 'button', onClick: () => { sfx('pop'); app.go(pause ? 'pause' : 'jeux'); }, html: `${icon(pause ? 'moon' : 'arrowR', 28)}<span>${pause ? 'Pause' : 'Les jeux'}</span>` });
    overlay = h('div', { class: 'result dictee-end', role: 'dialog', 'aria-label': 'Dictée terminée' },
      h('div', { class: 'result-card rich' }, resFoxHost, h('h2', {}, faits.length ? DICTEE_FIN : 'On fera la dictée une autre fois !'), faits.length ? recap : null,
        h('div', { class: 'res-actions' }, encore, retour)));
    root.append(overlay);
    const rf = app.makeFox(resFoxHost, { accessories: app.equipped() });
    cleanupExtras.push(() => rf.destroy());
    const bien = faits.some((n) => n >= 2);
    rf.setMood(bien ? 'joy' : 'encourage', 4000);
    sfx(bien ? 'win' : 'ok');
    if (faits.length) speak(DICTEE_FIN, { onStart: () => rf.talk(true), onEnd: () => rf.talk(false) });
  }

  function restart() {
    sfx('pop');
    overlay?.remove(); overlay = null;
    cleanupExtras.splice(0).forEach((f) => f());
    items = dicteeItems(st); i = 0; results = [];
    if (items.length < 2) { app.go('jeux'); return; }
    nextItem();
  }

  replayBtn.addEventListener('click', async () => {
    if (busy || !alive) return;
    sfx('tap'); busy = true; board.enable(false); skipBtn.disabled = replayBtn.disabled = true;
    await ecoute();
    if (!alive) return;
    board.enable(true); busy = false; skipBtn.disabled = replayBtn.disabled = false;
  });
  skipBtn.addEventListener('click', skip);

  nextItem();

  return () => { alive = false; board?.destroy(); fox.destroy(); cleanupExtras.forEach((f) => f()); stopSpeaking(); };
}
