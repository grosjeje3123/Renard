// Tableau libre : une grande feuille pour ÉCRIRE ce qu'on veut (son prénom, un mot, une phrase) ou DESSINER, avec des calques à suivre.
// Écrire : rangée 1 = le modèle plein (« suis le guide »), rangée 2 = pointillés, rangées suivantes = tout seul. Au choix : minuscules
// attachées, MAJUSCULES d'imprimerie, ou majuscule au début. Quand un mot est bien écrit sur une rangée, le renard félicite
// (confettis, petite coche) ; sinon il encourage, sans jamais noter ni punir.
// Dessiner : des calques de dessins simples (traits pleins pâles, pointillés ou cachés), une grille facultative, ou la feuille blanche.
// Rien n'est conservé par défaut : la fin est explicite (garder en image avec un adulte, ou accrocher dans la galerie si les parents
// l'ont activée), et la flèche de retour demande avant de perdre un travail en cours.
import { h, icon, pick } from '../dom.js';
import { forestScene } from '../art.js';
import { bubble, makeSpeaker } from '../say.js';
import { sfx, speak, stopSpeaking } from '../audio.js';
import { deliverFile } from '../sheets.js';
import { confetti } from '../confetti.js';
import { dayKey, masteredCount } from '../../core/progress.js';
import { hang, titleFor, galleryOn, galleryCount, pathD, MAX_DESSINS } from '../../core/galerie.js';
import { TABLEAU, CASSES, clean, cased, calque, page, fits, suggestions, rowOf, checkRow } from '../../core/tableau.js';
import { polyLength } from '../../engine/geometry.js';
import { SKILLS, LEVELS } from '../../content/skills.js';
import { DESSINS, IDEES_LIBRES, NIVEAUX_DESSIN, tierFor, modelGroup } from '../../content/dessins.js';

const NS = 'http://www.w3.org/2000/svg';
const COLORS = [['brun', '#4A2F22'], ['rouge', '#E5392F'], ['orange', '#F08A24'], ['jaune', '#F4C84A'], ['vert', '#4E9A63'], ['bleu', '#4A8FD6'], ['violet', '#8B6FD6']];
// [nom, épaisseur pour écrire (en interlignes), épaisseur pour dessiner (feuille de 10 × 7)]
const SIZES = [['fin', 0.12, 0.1], ['moyen', 0.2, 0.22], ['gros', 0.34, 0.45]];
const DRAW = { W: 10, H: 7, rows: [] };
const CALQUES = [['plein', 'Plein'], ['pointille', 'Pointillés'], ['aucun', 'Caché']];
const PNG_W = 1600;
const ABC = 'abcdefghijklmnopqrstuvwxyz'.split('');
const THUMB_VIEW = '1.4 0.4 7.2 6.4';

const svgEl = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent?.append(e);
  return e;
};

export function tableau(root, app) {
  root.classList.add('exo', 'dessin', 'tableau');
  const st = app.state;
  let view = 'ecrire'; // 'ecrire' | 'dessiner'
  let color = COLORS[0][1], sizeIdx = 1, active = null, penSeen = false, armed = 0, evalTimer = 0;
  // chaque feuille garde ses traits ; `hung` : l'identifiant du travail déjà accroché dans la galerie (pour le mettre à jour)
  const sheets = { ecrire: { strokes: [], hung: '' }, dessiner: { strokes: [], hung: '' } };
  const strokes = () => sheets[view].strokes;

  // ---- Écrire : le texte, la casse, la page
  const first = suggestions(st);
  let text = first.prenom || 'renard';
  let casse = app.tableauCasse || (first.prenom ? 'debut' : 'min');
  if (!fits(text, casse)) casse = 'min';
  let sugg = suggestions(st, casse);
  let pg = page(calque(text, TABLEAU.rows[0], casse).width);
  const rowStates = new Map(); // rangée → { ok, stars } : les rangées déjà félicitées
  const dirty = new Set(); // rangées écrites depuis la dernière évaluation

  // ---- Dessiner : le calque du moment
  let current = null; // { model, phrase } ou { phrase: '' } pour la feuille blanche
  let calqueMode = 'pointille', grid = false, drawReady = false;

  const geom = () => (view === 'ecrire' ? pg : DRAW);
  const foxHost = h('div', { class: 'side-fox' });
  const b = bubble();
  const svg = svgEl('svg', { class: 'draw-board tableau-board', role: 'img', 'aria-label': 'Page lignée pour écrire' });
  let ink, calqueG, badgesG;

  const buildPage = () => {
    svg.replaceChildren();
    const { W, H, rows } = geom();
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('aria-label', view === 'ecrire' ? 'Page lignée pour écrire' : 'Feuille de dessin');
    svg.style.setProperty('--k', String(Math.max(1, W / 12).toFixed(2)));
    svgEl('rect', { class: 'paper', x: 0, y: 0, width: W, height: H, rx: 0.32 }, svg);
    if (view === 'ecrire') {
      const rules = svgEl('g', { class: 'rules' }, svg);
      for (const base of rows) {
        for (let k = 0; k <= 3; k++) svgEl('line', { class: k === 0 ? 'r-base' : k === 2 || k === 3 ? 'r-main' : 'r-thin', x1: 0.25, x2: W - 0.25, y1: base - k, y2: base - k }, rules);
        svgEl('line', { class: 'r-thin', x1: 0.25, x2: W - 0.25, y1: base + 1, y2: base + 1 }, rules);
      }
      for (let x = 2; x < W; x += 2) svgEl('line', { class: 'r-vert', x1: x, x2: x, y1: 0.3, y2: H - 0.3 }, rules);
    }
    calqueG = svgEl('g', { class: 'calque' }, svg);
    ink = svgEl('g', { class: 'ink' }, svg);
    badgesG = svgEl('g', { class: 'badges' }, svg);
    for (const s of strokes()) ink.append(s.el);
    drawCalque();
    drawBadges();
  };

  /** Les calques de la feuille : modèle d'écriture (2 rangées) ou dessin à décalquer (+ grille). */
  const drawCalque = () => {
    calqueG.replaceChildren();
    if (view === 'ecrire') {
      if (!showCalque) return;
      [0, 1].forEach((r) => {
        const base = pg.rows[r];
        if (base == null) return;
        const c = calque(text, base, casse);
        const g = svgEl('g', { class: `cal-row r${r}` }, calqueG);
        c.strokes.forEach((s) => {
          if (s.kind === 'dot') { svgEl('circle', { class: r === 0 ? 'road dotroad' : 'dotroad', cx: s.start.x, cy: s.start.y, r: 0.42 }, g); return; }
          if (r === 0) svgEl('path', { class: 'road', d: s.d }, g);
          svgEl('path', { class: 'center', d: s.d }, g);
        });
        if (r === 0) c.strokes.forEach((s) => svgEl('circle', { class: 'cal-start', cx: s.start.x, cy: s.start.y, r: 0.24 }, g));
      });
      return;
    }
    if (grid) {
      const gg = svgEl('g', { class: 'grid' }, calqueG);
      for (let x = 1; x < DRAW.W; x++) svgEl('line', { x1: x, x2: x, y1: 0.2, y2: DRAW.H - 0.2 }, gg);
      for (let y = 1; y < DRAW.H; y++) svgEl('line', { x1: 0.2, x2: DRAW.W - 0.2, y1: y, y2: y }, gg);
    }
    const m = current?.model;
    if (m && calqueMode !== 'aucun') {
      const g = svgEl('g', { class: `cal-model ${calqueMode}` }, calqueG);
      g.innerHTML = calqueMode === 'plein' ? modelGroup(m) : modelGroup(m, { dotted: true });
    }
  };

  let showCalque = true;

  // ---- Commandes
  const swatches = COLORS.map(([name, c]) => h('button', { class: `swatch${c === color ? ' on' : ''}`, type: 'button', 'aria-label': `Couleur ${name}`, style: { '--c': c }, onClick: () => { color = c; sfx('tap'); swatches.forEach((s) => s.classList.toggle('on', s.style.getPropertyValue('--c') === c)); } }));
  const sizes = SIZES.map(([name, w], i) => h('button', { class: `size${i === sizeIdx ? ' on' : ''}`, type: 'button', 'aria-label': `Trait ${name}`, onClick: () => { sizeIdx = i; sfx('tap'); sizes.forEach((s, j) => s.classList.toggle('on', j === i)); }, html: `<span style="width:${6 + w * 34}px;height:${6 + w * 34}px"></span>` }));
  const undoBtn = h('button', { class: 'chip-btn', type: 'button', 'aria-label': 'Défaire le dernier trait', html: `${icon('replay', 22)}<span>Défaire</span>` });
  const clearBtn = h('button', { class: 'chip-btn', type: 'button', html: `${icon('trash', 22)}<span>Tout effacer</span>` });
  const calqueBtn = h('button', { class: 'chip-btn calque-btn on', type: 'button', 'aria-pressed': 'true', html: `${icon('eye', 22)}<span>Calque</span>` });
  const gridBtn = h('button', { class: 'chip-btn grid-btn', type: 'button', 'aria-pressed': 'false', hidden: true, html: `${icon('tableau', 22)}<span>Grille</span>` });
  const doneBtn = h('button', { class: 'btn-big sm done-btn', type: 'button', disabled: true, html: `${icon('check', 30)}<span>J’ai fini !</span>` });

  // Écrire : le texte, la casse
  const shownText = h('div', { class: 'tb-text', 'aria-live': 'polite' });
  const casseBtns = CASSES.map((c) => h('button', { class: `cs-btn${c.id === casse ? ' on' : ''}`, type: 'button', 'data-casse': c.id, 'aria-pressed': String(c.id === casse), 'aria-label': c.name, title: c.hint, onClick: () => setCasse(c.id) }, c.label));
  const casseBar = h('div', { class: 'casse', role: 'group', 'aria-label': 'Écrire en minuscules ou en majuscules' }, casseBtns);
  const changeBtn = h('button', { class: 'btn-sec sm tb-change', type: 'button', html: `${icon('pencil', 22)}<span>Quoi écrire ?</span>` });
  const textCard = h('div', { class: 'model-card tb-card' }, shownText, casseBar, changeBtn);

  // Dessiner : le calque, son style, d'autres idées
  const thumb = h('div', { class: 'model-thumb', role: 'img', 'aria-label': 'Exemple à reproduire' });
  const levelTag = h('p', { class: 'model-level' });
  const calqueModeBtns = CALQUES.map(([id, label]) => h('button', { class: 'cs-btn calque-mode', type: 'button', 'data-mode': id, 'aria-pressed': String(id === calqueMode), onClick: () => { sfx('tap'); calqueMode = id; showModel(); drawCalque(); } }, label));
  const calqueBar = h('div', { class: 'casse calque-bar', role: 'group', 'aria-label': 'Calque : trait plein, pointillés ou caché' }, calqueModeBtns);
  const nextBtn = h('button', { class: 'chip-btn', type: 'button', html: `${icon('arrowR', 22)}<span>Autre idée</span>` });
  const chooseBtn = h('button', { class: 'chip-btn', type: 'button', html: `${icon('frame', 22)}<span>Choisir</span>` });
  const modelCard = h('div', { class: 'model-card', hidden: true }, thumb, levelTag, calqueBar, h('div', { class: 'model-actions' }, nextBtn, chooseBtn));

  // Le choix Écrire / Dessiner
  const modeBtns = [['ecrire', 'Écrire', 'tableau'], ['dessiner', 'Dessiner', 'pencil']].map(([id, label, ic]) => h('button', { class: `ms-btn${id === view ? ' on' : ''}`, type: 'button', 'data-view': id, 'aria-pressed': String(id === view), onClick: () => setView(id), html: `${icon(ic, 22)}<span>${label}</span>` }));
  const subtitle = h('p', {}, 'Écris ce que tu veux, sans note');

  let main; // la zone sous l'en-tête : c'est là que volent les confettis
  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar exo-bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour à la carte', onClick: () => leave(), html: icon('back', 26) }),
      h('div', { class: 'bar-title' }, h('h2', {}, 'Tableau libre'), subtitle),
      h('div', { class: 'mode-switch', role: 'group', 'aria-label': 'Écrire ou dessiner' }, modeBtns),
      doneBtn),
    main = h('div', { class: 'exo-main' },
      h('aside', { class: 'side' }, foxHost, b, textCard, modelCard,
        h('div', { class: 'palette', role: 'group', 'aria-label': 'Couleurs' }, swatches),
        h('div', { class: 'sizes', role: 'group', 'aria-label': 'Épaisseur du trait' }, sizes),
        h('div', { class: 'side-actions' }, calqueBtn, gridBtn, undoBtn, clearBtn)),
      h('div', { class: 'board-wrap' }, h('div', { class: 'board-host' }, svg))),
  );
  const fox = app.makeFox(foxHost);
  const speaker = makeSpeaker(fox, b);

  // ---------------------------------------------------------------------------------------------- Écrire
  const resetRows = () => { rowStates.clear(); dirty.clear(); clearTimeout(evalTimer); evalTimer = 0; };
  const syncCasse = () => casseBtns.forEach((x) => { const on = x.dataset.casse === casse; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
  const shown = () => cased(text, casse);

  /** Le texte, la casse ou les deux ont changé : nouvelle page, nouveaux calques, les rangées félicitées repartent de zéro. */
  function applyText() {
    pg = page(calque(text, TABLEAU.rows[0], casse).width);
    shownText.textContent = shown();
    shownText.title = shown();
    sugg = suggestions(st, casse);
    resetRows();
    syncCasse();
    if (view === 'ecrire') buildPage();
  }
  const askText = () => speaker.say(`Écris « ${shown()} » : suis la première ligne, puis les pointillés, puis écris tout seul !`, { silent: true, icon: 'pencil' });

  function setCasse(id) {
    if (id === casse) return;
    if (!fits(text, id)) { sfx('oops'); speaker.say('Avec ces lettres, le texte est trop long pour la page. Choisis un mot plus court.', { silent: true, icon: 'pencil' }); return; }
    sfx('tap');
    casse = id; app.tableauCasse = id;
    applyText();
    askText();
  }

  const calqueBtnToggle = () => { sfx('tap'); showCalque = !showCalque; calqueBtn.classList.toggle('on', showCalque); calqueBtn.setAttribute('aria-pressed', String(showCalque)); drawCalque(); };
  calqueBtn.addEventListener('click', calqueBtnToggle);

  // Le petit rond vert à droite d'une rangée bien écrite
  function drawBadges() {
    if (!badgesG) return;
    badgesG.replaceChildren();
    if (view !== 'ecrire') return;
    for (const [r, s] of rowStates) {
      if (!s.ok || pg.rows[r] == null) continue;
      const g = svgEl('g', { class: 'badge', transform: `translate(${pg.W - 1.25} ${pg.rows[r] - 1.2})` }, badgesG);
      const gi = svgEl('g', { class: 'badge-in' }, g);
      svgEl('circle', { class: 'badge-bg', r: 0.7 }, gi);
      svgEl('path', { class: 'badge-tick', d: 'M -0.32 0.02 L -0.07 0.28 L 0.38 -0.28' }, gi);
    }
  }

  /** Position (en pixels, dans l'écran) d'un point de la page : pour lancer les confettis au bon endroit. */
  const mainPos = (x, y) => {
    const m = svg.getScreenCTM();
    const r = main.getBoundingClientRect();
    if (!m) return { x: r.width / 2, y: r.height / 2 };
    const p = new DOMPoint(x, y).matrixTransform(m);
    return { x: p.x - r.left, y: p.y - r.top };
  };

  const CHEERS = ['Bravo', 'Super', 'Bien joué', 'Très bien'];
  function celebrate(r, res) {
    const list = sheets.ecrire.strokes.filter((s) => s.row === r);
    const xs = list.flatMap((s) => s.pts.map((p) => p.x));
    const cx = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : pg.W / 2;
    const at = mainPos(cx, pg.rows[r] - 2.2);
    const alone = r >= 2;
    confetti(main, at.x, at.y, { n: alone ? 90 : 56, power: alone ? 1.3 : 1 });
    sfx('win');
    const w = shown();
    const msg = alone ? `Bravo ! Tu as écrit « ${w} » tout seul !`
      : res.stars >= 3 ? `Magnifique ! « ${w} » est très bien écrit !`
        : `${pick(CHEERS)} ! Tu as bien écrit « ${w} » !`;
    speaker.say(msg, { mood: 'joy', ms: 3200, icon: 'star' });
  }

  function hint(res) {
    if (res.tags?.includes('trait-manquant')) return;
    const msg = res.stars >= 1 ? 'Presque ! Regarde bien le modèle, puis essaie encore.' : 'Regarde bien le modèle, puis essaie encore. Tu peux défaire ou tout effacer.';
    speaker.say(msg, { mood: 'encourage', icon: 'pencil', silent: true });
  }

  /** Évalue ce qui est écrit sur la rangée r. `announce` : féliciter (ou encourager) ; faux après un « Défaire ». */
  function evaluateRow(r, announce = true) {
    const base = pg.rows[r];
    const list = sheets.ecrire.strokes.filter((s) => s.row === r);
    if (base == null || !list.length) { if (rowStates.delete(r)) drawBadges(); return; }
    const need = calque(text, base, casse).tpl.filter((s) => s.kind === 'path').length;
    const have = list.filter((s) => polyLength(s.pts) >= 0.5).length;
    if (have < need) { if (rowStates.delete(r)) drawBadges(); return; } // il écrit encore
    const res = checkRow({ text, mode: casse, baseline: base, strokes: list.map((s) => ({ pts: s.pts, pointerType: s.pointerType })), phase: Math.min(2, r), boardW: pg.W, settings: st.settings });
    const before = rowStates.get(r);
    if (res.ok) {
      rowStates.set(r, { ok: true, stars: res.stars });
      drawBadges();
      if (announce && !before?.ok) celebrate(r, res);
    } else if (!announce) {
      if (rowStates.delete(r)) drawBadges();
    } else if (!before?.ok) hint(res);
  }
  /** Un instant après le dernier trait, on regarde les rangées touchées (jamais pendant qu'un trait est en cours). */
  function flushEval() {
    clearTimeout(evalTimer); evalTimer = 0;
    if (active) { evalTimer = setTimeout(flushEval, 450); return; }
    const rows = [...dirty]; dirty.clear();
    if (view === 'ecrire') rows.forEach((r) => evaluateRow(r, true));
  }
  const scheduleEval = (r) => { dirty.add(r); clearTimeout(evalTimer); evalTimer = setTimeout(flushEval, 900); };

  // ---------------------------------------------------------------------------------------------- Dessiner
  const showModel = () => {
    const m = current?.model;
    thumb.hidden = !m; levelTag.hidden = !m; calqueBar.hidden = !m;
    thumb.innerHTML = m ? `<svg viewBox="${THUMB_VIEW}" aria-hidden="true">${modelGroup(m)}</svg>` : '';
    if (m) { levelTag.textContent = `${'★'.repeat(m.tier)}${'☆'.repeat(3 - m.tier)} ${NIVEAUX_DESSIN[m.tier]}`; levelTag.setAttribute('aria-label', `Difficulté : ${NIVEAUX_DESSIN[m.tier].toLowerCase()}`); }
    calqueModeBtns.forEach((x) => { const on = x.dataset.mode === calqueMode; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
  };
  const useModel = (m, { silent = true } = {}) => {
    current = m ? { model: m, phrase: m.phrase } : { phrase: '' };
    showModel(); drawCalque();
    speaker.say(m ? (m.ask || `Une idée : dessine ${m.phrase} !`) : 'Dessine ce que tu veux sur la feuille !', { silent, icon: 'pencil' });
  };
  /** Idée du moment : un modèle qui s'ouvre avec la progression (facile au départ) ou une idée libre. */
  const idea = () => {
    const tier = tierFor(masteredCount(st), st.settings.demo);
    const pool = [...DESSINS.filter((m) => m.tier <= tier).map((model) => ({ model, phrase: model.phrase })), ...IDEES_LIBRES.map((phrase) => ({ phrase }))].filter((x) => x.phrase !== current?.phrase);
    current = pick(pool);
    showModel(); drawCalque();
    speaker.say(current.model?.ask || `Une idée : dessine ${current.phrase} !`, { silent: true, icon: 'pencil' });
  };
  nextBtn.addEventListener('click', () => { sfx('tap'); idea(); });
  gridBtn.addEventListener('click', () => { sfx('tap'); grid = !grid; gridBtn.classList.toggle('on', grid); gridBtn.setAttribute('aria-pressed', String(grid)); drawCalque(); });

  // ---------------------------------------------------------------------------------------------- Écrire / Dessiner
  function setView(v) {
    if (v === view || active || overlay) return;
    sfx('tap');
    if (view === 'ecrire') flushEval(); // un mot qui vient d'être écrit est félicité avant de changer de feuille
    view = v;
    root.dataset.view = v;
    modeBtns.forEach((x) => { const on = x.dataset.view === v; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
    const writing = v === 'ecrire';
    textCard.hidden = !writing; calqueBtn.hidden = !writing;
    modelCard.hidden = writing; gridBtn.hidden = writing;
    subtitle.textContent = writing ? 'Écris ce que tu veux, sans note' : 'Dessine ce que tu veux, sans note';
    if (!writing && !drawReady) { drawReady = true; idea(); }
    buildPage();
    refresh();
    if (writing) askText(); else if (current) speaker.say(current.model?.ask || (current.phrase ? `Une idée : dessine ${current.phrase} !` : 'Dessine ce que tu veux sur la feuille !'), { silent: true, icon: 'pencil' });
  }

  // ---- Tracé (mêmes gestes que le dessin libre ; en écriture le trait s'épaissit un peu avec la page, qui se réduit à l'écran)
  const toBoard = (e) => {
    const m = svg.getScreenCTM();
    if (!m) return null;
    const { W, H } = geom();
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: Math.max(0, Math.min(W, p.x)), y: Math.max(0, Math.min(H, p.y)) };
  };
  const scale = () => Math.max(1, pg.W / 14);
  svg.addEventListener('pointerdown', (e) => {
    if (active || overlay) return;
    if (e.pointerType === 'pen') penSeen = true;
    if (penSeen && e.pointerType === 'touch') return; // paume ignorée quand un stylet est utilisé
    e.preventDefault();
    const p = toBoard(e);
    if (!p) return;
    try { svg.setPointerCapture(e.pointerId); } catch { /* ok */ }
    const w = +(view === 'ecrire' ? SIZES[sizeIdx][1] * scale() : SIZES[sizeIdx][2]).toFixed(3);
    const el = svgEl('path', { fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, ink);
    active = { id: e.pointerId, pts: [p], el, c: color, w, pointerType: e.pointerType || 'touch', row: 0 };
    el.setAttribute('d', pathD(active.pts));
  });
  svg.addEventListener('pointermove', (e) => {
    if (!active || e.pointerId !== active.id) return;
    for (const ev of (e.getCoalescedEvents ? e.getCoalescedEvents() : [e])) { const p = toBoard(ev); if (p) active.pts.push(p); }
    active.el.setAttribute('d', pathD(active.pts));
  });
  const end = (e) => {
    if (!active || e.pointerId !== active.id) return;
    try { svg.releasePointerCapture(e.pointerId); } catch { /* ok */ }
    const s = active;
    active = null;
    strokes().push(s);
    if (view === 'ecrire') { s.row = rowOf(pg.rows, s.pts); scheduleEval(s.row); }
    refresh();
  };
  const refresh = () => { doneBtn.disabled = strokes().length === 0; };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('contextmenu', (e) => e.preventDefault());

  undoBtn.addEventListener('click', () => {
    sfx('tap');
    const s = strokes().pop();
    if (!s) return;
    s.el.remove();
    if (view === 'ecrire') evaluateRow(s.row, false);
    refresh();
  });
  clearBtn.addEventListener('click', () => {
    const label = clearBtn.querySelector('span');
    if (!armed) { armed = setTimeout(() => { armed = 0; label.textContent = 'Tout effacer'; }, 3000); label.textContent = 'Sûr ?'; return; }
    clearTimeout(armed); armed = 0; label.textContent = 'Tout effacer';
    sfx('pop'); clearAll();
  });
  /** Efface la feuille en cours (l'autre feuille reste comme elle est). */
  function clearAll() {
    ink.replaceChildren();
    strokes().length = 0;
    sheets[view].hung = '';
    if (view === 'ecrire') { resetRows(); drawBadges(); }
    refresh();
  }

  // ---------------------------------------------------------------------------------------------- Choisir ce qu'on écrit
  let picker = null;
  function choose() {
    if (picker || overlay) return;
    let draft = ''; // on repart d'une ligne vide ; « Annuler » garde le texte actuel
    let pc = casse; // la casse choisie dans cette fenêtre
    const show = h('div', { class: 'tp-show', 'aria-live': 'polite' });
    const msg = h('p', { class: 'tp-msg muted', 'aria-live': 'polite' });
    const okBtn = h('button', { class: 'btn-big sm', type: 'button', html: `${icon('check', 28)}<span>C’est parti !</span>` });
    const label = (l) => (pc === 'maj' ? l.toUpperCase() : l);
    const keys = ABC.map((l) => h('button', { class: 'tp-key', type: 'button', 'aria-label': `Lettre ${l}`, onClick: () => add(l) }, label(l)));
    const known = h('div', { class: 'tp-chips' });
    const knownBox = h('div', { class: 'tp-known' }, h('small', {}, 'Mes mots'), known);
    const pcBtns = CASSES.map((c) => h('button', { class: `cs-btn${c.id === pc ? ' on' : ''}`, type: 'button', 'data-casse': c.id, 'aria-pressed': String(c.id === pc), 'aria-label': c.name, title: c.hint, onClick: () => { sfx('tap'); pc = c.id; paint(true); } }, c.label));
    const okFits = () => !draft.trim() || fits(draft, pc);
    const paint = (caseChanged = false) => {
      const t = draft.trim() ? cased(draft, pc) + (draft.endsWith(' ') ? ' ' : '') : '';
      show.textContent = t || 'Écris ici…';
      show.classList.toggle('empty', !draft.trim());
      okBtn.disabled = !draft.trim() || !okFits();
      keys.forEach((k, i) => { k.textContent = label(ABC[i]); });
      pcBtns.forEach((x) => { const on = x.dataset.casse === pc; x.classList.toggle('on', on); x.setAttribute('aria-pressed', String(on)); });
      if (caseChanged) {
        msg.textContent = okFits() ? '' : 'Avec ces lettres, c’est trop long pour la page : efface une lettre.';
        const g = suggestions(st, pc);
        known.replaceChildren(...g.mots.slice(0, 18).map((w) => h('button', { class: 'tp-chip', type: 'button', onClick: () => { sfx('tap'); set(w); } }, cased(w, pc))));
        knownBox.hidden = !g.mots.length;
      }
    };
    const set = (t) => { draft = clean(t).trim(); msg.textContent = ''; paint(); };
    const add = (c) => {
      const next = clean(draft + c);
      if (c === ' ' && (!draft || draft.endsWith(' '))) return;
      if (c === ' ') { sfx('tap'); draft += ' '; paint(); return; }
      if (!fits(next, pc)) { sfx('oops'); msg.textContent = 'Il n’y a plus de place sur la page.'; return; }
      sfx('tap'); msg.textContent = ''; draft = next; paint();
    };
    const space = h('button', { class: 'tp-key wide', type: 'button', 'aria-label': 'Espace', onClick: () => add(' '), html: icon('arrowR', 24) });
    const erase = h('button', { class: 'tp-key wide', type: 'button', 'aria-label': 'Effacer une lettre', onClick: () => { sfx('tap'); draft = draft.slice(0, -1); msg.textContent = ''; paint(); }, html: icon('back', 24) });
    const quick = [];
    if (suggestions(st, pc).prenom || first.prenom) quick.push(h('button', { class: 'chip-btn', type: 'button', onClick: () => { const g = suggestions(st, pc).prenom || first.prenom; if (!fits(g, pc)) { sfx('oops'); msg.textContent = 'Ton prénom est trop long pour la page avec ces lettres.'; return; } sfx('tap'); set(g); }, html: `${icon('star', 20)}<span>Mon prénom</span>` }));
    quick.push(h('button', { class: 'chip-btn', type: 'button', onClick: () => { sfx('pop'); const g = suggestions(st, pc).mots; const pool = g.length ? g : LEVELS[2].skills.filter((id) => !SKILLS[id].phrase && !SKILLS[id].groupe).map((id) => SKILLS[id].glyph).filter((w) => fits(w, pc)); set(pick(pool)); }, html: `${icon('replay', 20)}<span>Un mot</span>` }));
    const close = () => { picker?.remove(); picker = null; };
    okBtn.addEventListener('click', () => {
      sfx('pop');
      const t = clean(draft).trim();
      if (!t || !fits(t, pc)) return;
      close();
      if (t !== text || pc !== casse) { text = t; casse = pc; app.tableauCasse = pc; applyText(); speaker.say(`On écrit « ${shown()} » ! Suis la première ligne.`, { icon: 'pencil' }); }
    });
    const cancel = h('button', { class: 'btn-sec sm', type: 'button', onClick: () => { sfx('tap'); close(); } }, 'Annuler');
    picker = h('div', { class: 'result tpick', role: 'dialog', 'aria-label': 'Choisir ce qu’on écrit' },
      h('div', { class: 'result-card' },
        h('h2', {}, 'Qu’est-ce qu’on écrit ?'),
        show, msg,
        h('div', { class: 'casse', role: 'group', 'aria-label': 'Minuscules ou majuscules' }, pcBtns),
        h('div', { class: 'tp-keys' }, keys, space, erase),
        h('div', { class: 'tp-quick' }, quick),
        knownBox,
        h('div', { class: 'res-actions' }, cancel, okBtn)));
    paint(true);
    root.append(picker);
  }
  changeBtn.addEventListener('click', () => { sfx('tap'); choose(); });
  b.addEventListener('dblclick', () => (view === 'ecrire' ? choose() : idea()));

  // ---- Choisir un calque de dessin : la feuille blanche, ou l'un des dessins (les plus difficiles s'ouvrent avec la progression)
  let mpick = null;
  function chooseModel() {
    if (mpick || overlay) return;
    const tier = tierFor(masteredCount(st), st.settings.demo);
    const msg = h('p', { class: 'tp-msg muted', 'aria-live': 'polite' });
    const close = () => { mpick?.remove(); mpick = null; };
    const choose1 = (m) => { sfx('pop'); close(); useModel(m, { silent: false }); };
    const blank = h('button', { class: 'mp-card blank', type: 'button', onClick: () => choose1(null), 'aria-label': 'Feuille blanche, sans modèle' },
      h('span', { class: 'mp-thumb', html: icon('pencil', 44) }), h('span', { class: 'mp-name' }, 'Feuille blanche'), h('span', { class: 'mp-lvl' }, 'Je dessine ce que je veux'));
    const cards = DESSINS.slice().sort((a, c) => a.tier - c.tier).map((m) => {
      const locked = m.tier > tier;
      return h('button', { class: `mp-card${locked ? ' locked' : ''}${current?.model?.id === m.id ? ' on' : ''}`, type: 'button', 'data-model': m.id, 'aria-label': `${m.phrase}, ${NIVEAUX_DESSIN[m.tier].toLowerCase()}${locked ? ', pas encore ouvert' : ''}`,
        onClick: () => { if (locked) { sfx('oops'); msg.textContent = 'Ce dessin s’ouvre un peu plus tard, quand tu auras réussi d’autres exercices.'; return; } choose1(m); } },
      h('span', { class: 'mp-thumb', html: `<svg viewBox="${THUMB_VIEW}" aria-hidden="true">${modelGroup(m)}</svg>${locked ? `<i class="mp-lock">${icon('lock', 26)}</i>` : ''}` }),
      h('span', { class: 'mp-name' }, m.phrase.replace(/^(le|la|l’|un|une) /, '')),
      h('span', { class: 'mp-lvl', 'aria-hidden': 'true' }, '★'.repeat(m.tier) + '☆'.repeat(3 - m.tier)));
    });
    const cancel = h('button', { class: 'btn-sec sm', type: 'button', onClick: () => { sfx('tap'); close(); } }, 'Annuler');
    mpick = h('div', { class: 'result mpick', role: 'dialog', 'aria-label': 'Choisir un calque' },
      h('div', { class: 'result-card' }, h('h2', {}, 'Quel dessin suivre ?'), msg, h('div', { class: 'mp-grid' }, blank, cards), h('div', { class: 'res-actions' }, cancel)));
    root.append(mpick);
  }
  chooseBtn.addEventListener('click', () => { sfx('tap'); chooseModel(); });

  // ---------------------------------------------------------------------------------------------- Garder en image
  /** La feuille en cours en image PNG (fond crème, lignes comprises en écriture), sans calque ni coches. */
  async function toPNG() {
    const clone = svg.cloneNode(true);
    clone.querySelector('.calque')?.remove(); // les calques aident, ils ne font pas partie du travail
    clone.querySelector('.badges')?.remove();
    const { W, H } = geom();
    const pngH = Math.round((PNG_W * H) / W);
    clone.setAttribute('xmlns', NS); clone.setAttribute('width', String(PNG_W)); clone.setAttribute('height', String(pngH));
    clone.querySelector('.paper')?.setAttribute('fill', '#FFFDF7');
    clone.querySelectorAll('.r-thin,.r-main,.r-base,.r-vert').forEach((l) => {
      const c = l.getAttribute('class');
      l.setAttribute('stroke', '#8FA0D6');
      l.setAttribute('stroke-width', c === 'r-base' ? 0.09 : c === 'r-main' ? 0.05 : 0.025);
      l.setAttribute('opacity', c === 'r-vert' ? 0.3 : c === 'r-thin' ? 0.55 : 0.9);
    });
    const img = new Image();
    const loaded = new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
    await loaded;
    const c = document.createElement('canvas');
    c.width = PNG_W; c.height = pngH;
    const g = c.getContext('2d');
    g.fillStyle = '#FFFDF7'; g.fillRect(0, 0, PNG_W, pngH);
    g.drawImage(img, 0, 0, PNG_W, pngH);
    const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
    if (!blob) throw new Error('png');
    return new Uint8Array(await blob.arrayBuffer());
  }

  // ---- Fin : toujours explicite, jamais de perte silencieuse
  let overlay = null, endFox = null;
  const closeEnd = () => { stopSpeaking(); endFox?.destroy(); endFox = null; overlay?.remove(); overlay = null; };
  /** kind : 'fini' (l'enfant a terminé) ou 'retour' (il touche la flèche alors qu'un travail est en cours). */
  function ending(kind) {
    if (overlay) return;
    const done = kind === 'fini';
    const writing = view === 'ecrire';
    const sh = sheets[view];
    const host = h('div', { class: 'res-fox' });
    const status = h('p', { class: 'muted', 'aria-live': 'polite' });
    const keepBtn = h('button', { class: 'btn-sec sm', type: 'button', html: `${icon('chest', 22)}<span>Garder en image (avec un adulte)</span>` });
    keepBtn.addEventListener('click', async () => {
      sfx('tap'); keepBtn.disabled = true; status.textContent = '';
      try {
        const how = await deliverFile(await toPNG(), `${writing ? 'tableau' : 'dessin'}-renard-${dayKey()}.png`, { mime: 'image/png', dialogTitle: writing ? 'Garder la page' : 'Garder le dessin' });
        const thing = writing ? 'La page' : 'Le dessin';
        status.textContent = how === 'annule' ? '' : how === 'partage' ? `${thing} est prêt${writing ? 'e' : ''} à être envoyé${writing ? 'e' : ''} ou enregistré${writing ? 'e' : ''}.` : `${thing} est enregistré${writing ? 'e' : ''}.`;
      } catch { status.textContent = 'Impossible de créer l’image sur cet appareil.'; }
      keepBtn.disabled = false;
    });
    // Galerie du renard : seulement si les parents l'ont activée ; c'est toujours un choix de l'enfant.
    let hangBlock = null;
    if (galleryOn(st)) {
      const full = !sh.hung && galleryCount(st) >= MAX_DESSINS;
      const hangBtn = h('button', { class: 'btn-big sm hang-btn', type: 'button', html: `${icon('frame', 30)}<span>Accrocher dans la forêt</span>` });
      const hangNote = h('p', { class: 'muted hang-note' }, sh.hung ? (writing ? 'Cette page est déjà dans ta galerie : elle sera mise à jour.' : 'Ce dessin est déjà dans ta galerie : il sera mis à jour.') : full ? 'La galerie est pleine : le plus ancien dessin sera remplacé.' : `${writing ? 'Elle' : 'Il'} restera dans la galerie du renard, sur cette tablette.`);
      hangBtn.addEventListener('click', () => {
        const k = writing ? Math.min(10 / pg.W, 7 / pg.H) : 1; // la page entre dans le cadre de la galerie
        const list = sh.strokes.map(({ c, w, pts }) => ({ c, w: w * k, pts: pts.map((p) => ({ x: p.x * k, y: p.y * k })) }));
        const res = hang(st, { strokes: list, title: writing ? `Tableau : ${shown()}` : titleFor(current?.model?.phrase ?? current?.phrase), model: writing ? '' : current?.model?.id || '', replaceId: sh.hung });
        if (!res.entry) { hangNote.textContent = writing ? 'Impossible d’accrocher cette page.' : 'Impossible d’accrocher ce dessin.'; return; }
        sh.hung = res.entry.id; app.save(); sfx('win');
        const see = h('button', { class: 'btn-big sm hang-btn', type: 'button', onClick: () => { sfx('tap'); app.go('galerie'); }, html: `${icon('frame', 30)}<span>Voir ma galerie</span>` });
        hangBtn.replaceWith(see); hangNote.textContent = writing ? 'Ta page est accrochée dans la forêt !' : 'Ton dessin est accroché dans la forêt !';
        endFox?.setMood('joy', 3000);
        speak(writing ? 'Voilà ! Ta page est accrochée dans la forêt.' : 'Voilà ! Ton dessin est accroché dans la forêt.', { onStart: () => endFox?.talk(true), onEnd: () => endFox?.talk(false) });
      });
      hangBlock = h('div', { class: 'hang-block' }, hangBtn, hangNote);
    }
    const thing = writing ? 'ta page' : 'ton dessin';
    const keepOn = h('button', { class: 'btn-sec', type: 'button', onClick: () => { sfx('tap'); closeEnd(); } }, done ? (writing ? 'Continuer à écrire' : 'Continuer à dessiner') : 'Je reste');
    const fresh = h('button', { class: 'btn-sec', type: 'button', onClick: () => { sfx('pop'); closeEnd(); clearAll(); if (writing) choose(); else idea(); } }, writing ? 'Écrire autre chose' : 'Nouveau dessin');
    const home = h('button', { class: 'btn-big sm', type: 'button', onClick: () => { sfx('tap'); app.go(back()); }, html: `${icon('map', 28)}<span>Retour à la carte</span>` });
    overlay = h('div', { class: 'result dessin-end', role: 'dialog', 'aria-label': done ? (writing ? 'Page terminée' : 'Dessin terminé') : 'Quitter le tableau' },
      h('div', { class: 'result-card' }, host,
        h('h2', {}, done ? (writing ? 'Quelle belle écriture !' : 'Quel beau dessin !') : 'Tu t’en vas ?'),
        h('p', { class: 'dessin-note' }, galleryOn(st)
          ? (done ? `Tu peux accrocher ${thing} dans la forêt du renard. Avec un adulte, tu peux aussi ${writing ? 'la' : 'le'} garder en image.` : `Si tu pars maintenant, ${thing} disparaît. Accroche-${writing ? 'la' : 'le'} d’abord dans la forêt, ou garde-${writing ? 'la' : 'le'} en image avec un adulte.`)
          : (done ? `${writing ? 'Elle' : 'Il'} ne reste pas tout${writing ? 'e' : ''} seul${writing ? 'e' : ''} dans l’application. Avec un adulte, tu peux ${writing ? 'la' : 'le'} garder en image.` : `Si tu pars maintenant, ${thing} disparaît. Avec un adulte, tu peux d’abord ${writing ? 'la' : 'le'} garder en image.`)),
        hangBlock,
        h('div', { class: 'res-actions' }, keepOn, fresh),
        keepBtn, status,
        h('div', { class: 'res-actions' }, home)));
    root.append(overlay);
    endFox = app.makeFox(host, { accessories: app.equipped() });
    if (done) { endFox.setMood('joy', 4000); sfx('win'); }
    speak(done ? (writing ? 'Quelle belle écriture ! Tu écris autre chose, ou on retourne à la carte ?' : 'Quel beau dessin ! Tu en fais un autre, ou on retourne à la carte ?') : `Tu t’en vas ? ${writing ? 'Ta page' : 'Ton dessin'} va disparaître.`, { onStart: () => endFox?.talk(true), onEnd: () => endFox?.talk(false) });
  }
  const back = () => app.tableauFrom || (st.settings.depart >= 3 ? 'carte-3' : 'carte-2');
  doneBtn.addEventListener('click', () => { if (strokes().length) { sfx('pop'); ending('fini'); } });
  /** La flèche de retour : directe si rien n'est en cours, sinon on demande avant de perdre le travail (sur la feuille qui en a un). */
  function leave() {
    sfx('tap');
    if (!strokes().length && sheets[view === 'ecrire' ? 'dessiner' : 'ecrire'].strokes.length) setView(view === 'ecrire' ? 'dessiner' : 'ecrire');
    if (strokes().length) ending('retour'); else app.go(back());
  }

  // ---- Départ : on commence par écrire
  root.dataset.view = view;
  applyText();
  askText();

  return () => { clearTimeout(armed); clearTimeout(evalTimer); stopSpeaking(); endFox?.destroy(); fox.destroy(); };
}
