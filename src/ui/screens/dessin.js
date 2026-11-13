// Dessin libre : on dessine pour le plaisir, sans note ni consigne. Prépare le geste (graphisme libre, cycle 1)
// sans jamais juger. Par défaut rien n'est enregistré : le dessin disparaît quand on quitte l'écran, sauf si un adulte
// choisit de le garder en image (feuille de partage de la tablette) ou si les parents ont activé la galerie
// (réglage désactivé par défaut) et que l'enfant choisit d'« accrocher dans la forêt » (voir core/galerie.js).
// Des modèles très simples (src/content/dessins.js) sont proposés : une vignette en couleurs à côté de la feuille et, en « mode calque »
// (activé au départ), le même dessin en pointillés pâles sur la feuille, à suivre du doigt ou du stylet. Rien n'est jugé.
// La fin est explicite : « J'ai fini ! » ouvre un écran de félicitations (continuer, nouveau dessin, garder, retour),
// et la flèche de retour demande confirmation tant qu'un dessin est en cours.
import { notePen, isPalm } from '../stylet.js';
import { h, icon, pick } from '../dom.js';
import { forestScene } from '../art.js';
import { bubble, makeSpeaker } from '../say.js';
import { sfx, speak, stopSpeaking } from '../audio.js';
import { deliverFile } from '../sheets.js';
import { fitSheet } from '../sheet.js';
import { dayKey, masteredCount } from '../../core/progress.js';
import { hang, titleFor, galleryOn, galleryCount, pathD, MAX_DESSINS } from '../../core/galerie.js';
import { NIVEAUX_DESSIN, tierFor, modelGroup, ideeSuivante } from '../../content/dessins.js';

const NS = 'http://www.w3.org/2000/svg';
const COLORS = [['brun', '#4A2F22'], ['rouge', '#E5392F'], ['orange', '#F08A24'], ['jaune', '#F4C84A'], ['vert', '#4E9A63'], ['bleu', '#4A8FD6'], ['violet', '#8B6FD6']];
const SIZES = [['fin', 0.1], ['moyen', 0.22], ['gros', 0.45]];
const PNG_W = 1600;
const SHEET_W = 10, SHEET_H0 = 7; // feuille de 10 unités de large ; sa hauteur suit la place libre (≥ 7), voir ui/sheet.js

export function dessin(root, app) {
  root.classList.add('exo', 'dessin');
  let color = COLORS[1][1], size = SIZES[1][1], active = null, armed = 0, hungId = '', sheetH = SHEET_H0, fit = null;
  const strokes = [];

  const foxHost = h('div', { class: 'side-fox' });
  const b = bubble();
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'draw-board');
  svg.setAttribute('viewBox', '0 0 10 7');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Feuille de dessin');
  svg.innerHTML = '<rect class="sheet-bg" width="10" height="7" rx="0.32" fill="#FFFDF7"/><g class="calque"></g><g class="ink"></g>';
  const ink = svg.querySelector('.ink');
  const calqueG = svg.querySelector('.calque');
  const sheetBg = svg.querySelector('.sheet-bg');
  /** La feuille prend la hauteur demandée (par pas de 0,05) ; les modèles, dessinés pour 10 × 7, restent centrés. */
  const setRatio = (r) => {
    sheetH = Math.round(SHEET_W * r * 20) / 20;
    svg.setAttribute('viewBox', `0 0 ${SHEET_W} ${sheetH}`);
    sheetBg.setAttribute('height', String(sheetH));
    calqueG.setAttribute('transform', `translate(0 ${((sheetH - SHEET_H0) / 2).toFixed(3)})`);
    return sheetH / SHEET_W;
  };
  const boardHost = h('div', { class: 'board-host' }, svg);
  const boardWrap = h('div', { class: 'board-wrap' }, boardHost);

  const swatches = COLORS.map(([name, c]) => h('button', { class: `swatch${c === color ? ' on' : ''}`, type: 'button', 'aria-label': `Couleur ${name}`, style: { '--c': c }, onClick: () => { color = c; sfx('tap'); swatches.forEach((s) => s.classList.toggle('on', s.style.getPropertyValue('--c') === c)); } }));
  const sizes = SIZES.map(([name, w]) => h('button', { class: `size${w === size ? ' on' : ''}`, type: 'button', 'aria-label': `Trait ${name}`, onClick: () => { size = w; sfx('tap'); sizes.forEach((s, i) => s.classList.toggle('on', SIZES[i][1] === w)); }, html: `<span style="width:${6 + w * 34}px;height:${6 + w * 34}px"></span>` }));
  const undoBtn = h('button', { class: 'chip-btn', type: 'button', 'aria-label': 'Défaire le dernier trait', html: `${icon('replay', 22)}<span>Défaire</span>` });
  const clearBtn = h('button', { class: 'chip-btn', type: 'button', html: `${icon('trash', 22)}<span>Tout effacer</span>` });
  const thumb = h('div', { class: 'model-thumb', role: 'img', 'aria-label': 'Exemple à reproduire' });
  const calqueBtn = h('button', { class: 'chip-btn calque-btn on', type: 'button', 'aria-pressed': 'true', html: `${icon('eye', 22)}<span>Calque</span>` });
  const nextBtn = h('button', { class: 'chip-btn', type: 'button', html: `${icon('arrowR', 22)}<span>Autre idée</span>` });
  const levelTag = h('p', { class: 'model-level' });
  const modelCard = h('div', { class: 'model-card' }, thumb, levelTag, h('div', { class: 'model-actions' }, calqueBtn, nextBtn));
  const doneBtn = h('button', { class: 'btn-big sm done-btn', type: 'button', disabled: true, html: `${icon('check', 30)}<span>J’ai fini !</span>` });

  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar exo-bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour à la carte', onClick: () => leave(), html: icon('back', 26) }),
      h('div', { class: 'bar-title' }, h('h2', {}, 'Dessin libre'), h('p', {}, 'Pour le plaisir, sans note')),
      doneBtn),
    h('div', { class: 'exo-main' },
      h('aside', { class: 'side' }, foxHost, b, modelCard,
        h('div', { class: 'palette', role: 'group', 'aria-label': 'Couleurs' }, swatches),
        h('div', { class: 'sizes', role: 'group', 'aria-label': 'Épaisseur du trait' }, sizes),
        h('div', { class: 'side-actions' }, undoBtn, clearBtn)),
      boardWrap),
  );
  fit = fitSheet(boardWrap, boardHost, { locked: () => strokes.length > 0, apply: setRatio });

  const fox = app.makeFox(foxHost);
  const speaker = makeSpeaker(fox, b);
  // Idée du moment : un modèle simple (vignette + calque) ou une idée libre (l'enfant invente, sans modèle).
  let current = null, calque = true;
  const showModel = () => {
    const m = current?.model;
    modelCard.hidden = !m;
    thumb.innerHTML = m ? `<svg viewBox="1.4 0.4 7.2 6.4" aria-hidden="true">${modelGroup(m)}</svg>` : '';
    calqueG.innerHTML = m && calque ? modelGroup(m, { dotted: true }) : '';
    if (m) { levelTag.textContent = `${'★'.repeat(m.tier)}${'☆'.repeat(3 - m.tier)} ${NIVEAUX_DESSIN[m.tier]}`; levelTag.setAttribute('aria-label', `Difficulté : ${NIVEAUX_DESSIN[m.tier].toLowerCase()}`); }
    calqueBtn.classList.toggle('on', calque);
    calqueBtn.setAttribute('aria-pressed', String(calque));
  };
  /** Idée du moment : les modèles se suivent du plus simple au plus compliqué (ceux que la progression ouvre), puis une idée libre. */
  const idea = ({ reprendre = false } = {}) => {
    const tier = tierFor(masteredCount(app.state), app.state.settings.demo);
    current = ideeSuivante(tier, app.state.settings.dessinVu, { reprendre });
    app.state.settings.dessinVu = current.phrase; app.save();
    showModel();
    speaker.say(current.model?.ask || `Une idée : dessine ${current.phrase} !`, { icon: 'pencil' });
  };
  idea({ reprendre: true }); // on reprend là où l'enfant s'était arrêté
  b.addEventListener('dblclick', () => { if (!strokes.length) idea(); }); // raccourci : jamais au milieu d'un dessin
  nextBtn.addEventListener('click', () => { sfx('tap'); if (strokes.length) { ink.replaceChildren(); strokes.length = 0; hungId = ''; refresh(); } idea(); }); // un autre modèle : la feuille repart à blanc
  calqueBtn.addEventListener('click', () => { sfx('tap'); calque = !calque; showModel(); });

  const toBoard = (e) => {
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    return { x: Math.max(0, Math.min(SHEET_W, p.x)), y: Math.max(0, Math.min(sheetH, p.y)) };
  };
  svg.addEventListener('pointerdown', (e) => {
    if (active) return;
    notePen(e);
    if (isPalm(e)) return; // paume ignorée quand on écrit au stylet
    e.preventDefault();
    const p = toBoard(e);
    if (!p) return;
    try { svg.setPointerCapture(e.pointerId); } catch { /* ok */ }
    const el = document.createElementNS(NS, 'path');
    el.setAttribute('fill', 'none'); el.setAttribute('stroke', color); el.setAttribute('stroke-width', size);
    el.setAttribute('stroke-linecap', 'round'); el.setAttribute('stroke-linejoin', 'round');
    ink.append(el);
    active = { id: e.pointerId, pts: [p], el, c: color, w: size };
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
    strokes.push(active);
    active = null;
    refresh();
  };
  const refresh = () => { doneBtn.disabled = strokes.length === 0; fit?.refit(); };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('contextmenu', (e) => e.preventDefault());

  undoBtn.addEventListener('click', () => { sfx('tap'); strokes.pop()?.el.remove(); refresh(); });
  clearBtn.addEventListener('click', () => {
    const label = clearBtn.querySelector('span');
    if (!armed) {
      armed = setTimeout(() => { armed = 0; label.textContent = 'Tout effacer'; }, 3000);
      label.textContent = 'Sûr ?';
      return;
    }
    clearTimeout(armed); armed = 0; label.textContent = 'Tout effacer';
    sfx('pop'); clearAll();
  });

  function clearAll() { ink.replaceChildren(); strokes.length = 0; hungId = ''; refresh(); idea(); }

  /** Le dessin en image PNG (fond crème), pour que l'adulte puisse le garder ou l'imprimer. */
  async function toPNG() {
    const clone = svg.cloneNode(true);
    clone.querySelector('.calque')?.remove(); // le calque aide à dessiner, il ne fait pas partie du dessin
    const PNG_H = Math.round((PNG_W * sheetH) / SHEET_W);
    clone.setAttribute('xmlns', NS); clone.setAttribute('width', String(PNG_W)); clone.setAttribute('height', String(PNG_H));
    const img = new Image();
    const loaded = new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
    await loaded;
    const c = document.createElement('canvas');
    c.width = PNG_W; c.height = PNG_H;
    const g = c.getContext('2d');
    g.fillStyle = '#FFFDF7'; g.fillRect(0, 0, PNG_W, PNG_H);
    g.drawImage(img, 0, 0, PNG_W, PNG_H);
    const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
    if (!blob) throw new Error('png');
    return new Uint8Array(await blob.arrayBuffer());
  }

  // ---- Fin du dessin : toujours explicite, jamais de perte silencieuse
  let overlay = null, endFox = null;
  const closeEnd = () => { stopSpeaking(); endFox?.destroy(); endFox = null; overlay?.remove(); overlay = null; };
  /** kind : 'fini' (l'enfant a terminé) ou 'retour' (il touche la flèche alors qu'un dessin est en cours). */
  function ending(kind) {
    if (overlay) return;
    const done = kind === 'fini';
    const host = h('div', { class: 'res-fox' });
    const status = h('p', { class: 'muted', 'aria-live': 'polite' });
    const keepBtn = h('button', { class: 'btn-sec sm', type: 'button', html: `${icon('chest', 22)}<span>Garder en image (avec un adulte)</span>` });
    keepBtn.addEventListener('click', async () => {
      sfx('tap'); keepBtn.disabled = true; status.textContent = '';
      try {
        const how = await deliverFile(await toPNG(), `dessin-renard-${dayKey()}.png`, { mime: 'image/png', dialogTitle: 'Garder le dessin' });
        status.textContent = how === 'annule' ? '' : how === 'partage' ? 'Le dessin est prêt à être envoyé ou enregistré.' : 'Le dessin est enregistré.';
      } catch { status.textContent = 'Impossible de créer l’image sur cet appareil.'; }
      keepBtn.disabled = false;
    });
    // Galerie du renard : seulement si les parents l'ont activée ; c'est toujours un choix de l'enfant.
    let hangBlock = null;
    if (galleryOn(app.state)) {
      const full = !hungId && galleryCount(app.state) >= MAX_DESSINS;
      const hangBtn = h('button', { class: 'btn-big sm hang-btn', type: 'button', html: `${icon('frame', 30)}<span>Accrocher dans la forêt</span>` });
      const hangNote = h('p', { class: 'muted hang-note' }, hungId ? 'Ce dessin est déjà dans ta galerie : il sera mis à jour.' : full ? 'La galerie est pleine : le plus ancien dessin sera remplacé.' : 'Il restera dans la galerie du renard, sur cette tablette.');
      hangBtn.addEventListener('click', () => {
        // la galerie a des cadres de 10 × 7 : une feuille plus haute y entre en taille réduite, centrée
        const k = Math.min(1, SHEET_H0 / sheetH), dx = (SHEET_W - SHEET_W * k) / 2;
        const list = strokes.map(({ c, w, pts }) => ({ c, w: w * k, pts: pts.map((p) => ({ x: p.x * k + dx, y: p.y * k })) }));
        const res = hang(app.state, { strokes: list, title: titleFor(current?.model?.phrase ?? current?.phrase), model: current?.model?.id || '', replaceId: hungId });
        if (!res.entry) { hangNote.textContent = 'Impossible d’accrocher ce dessin.'; return; }
        hungId = res.entry.id; app.save(); sfx('win');
        const see = h('button', { class: 'btn-big sm hang-btn', type: 'button', onClick: () => { sfx('tap'); app.go('galerie'); }, html: `${icon('frame', 30)}<span>Voir ma galerie</span>` });
        hangBtn.replaceWith(see); hangNote.textContent = 'Ton dessin est accroché dans la forêt !';
        endFox?.setMood('joy', 3000);
        speak('Voilà ! Ton dessin est accroché dans la forêt.', { onStart: () => endFox?.talk(true), onEnd: () => endFox?.talk(false) });
      });
      hangBlock = h('div', { class: 'hang-block' }, hangBtn, hangNote);
    }
    const keepOn = h('button', { class: 'btn-sec', type: 'button', onClick: () => { sfx('tap'); closeEnd(); } }, done ? 'Continuer à dessiner' : 'Je reste');
    const fresh = h('button', { class: 'btn-sec', type: 'button', onClick: () => { sfx('pop'); closeEnd(); clearAll(); } }, 'Nouveau dessin');
    const home = h('button', { class: 'btn-big sm', type: 'button', onClick: () => { sfx('tap'); app.go('carte-1'); }, html: `${icon('map', 28)}<span>Retour à la carte</span>` });
    overlay = h('div', { class: 'result dessin-end', role: 'dialog', 'aria-label': done ? 'Dessin terminé' : 'Quitter le dessin' },
      h('div', { class: 'result-card' }, host,
        h('h2', {}, done ? 'Quel beau dessin !' : 'Tu t’en vas ?'),
        h('p', { class: 'dessin-note' }, galleryOn(app.state)
          ? (done ? 'Tu peux l’accrocher dans la forêt du renard. Avec un adulte, tu peux aussi le garder en image.' : 'Si tu pars maintenant, ton dessin disparaît. Accroche-le d’abord dans la forêt, ou garde-le en image avec un adulte.')
          : (done ? 'Il ne reste pas tout seul dans l’application. Avec un adulte, tu peux le garder en image.' : 'Si tu pars maintenant, ton dessin disparaît. Avec un adulte, tu peux d’abord le garder en image.')),
        hangBlock,
        h('div', { class: 'res-actions' }, keepOn, fresh),
        keepBtn, status,
        h('div', { class: 'res-actions' }, home)));
    root.append(overlay);
    endFox = app.makeFox(host, { accessories: app.equipped() });
    if (done) { endFox.setMood('joy', 4000); sfx('win'); }
    speak(done ? 'Quel beau dessin ! Tu en fais un autre, ou on retourne à la carte ?' : 'Tu t’en vas ? Ton dessin va disparaître.', { onStart: () => endFox?.talk(true), onEnd: () => endFox?.talk(false) });
  }
  doneBtn.addEventListener('click', () => { if (strokes.length) { sfx('pop'); ending('fini'); } });
  /** La flèche de retour : directe si la feuille est vide, sinon on demande avant de perdre le dessin. */
  function leave() { sfx('tap'); if (strokes.length) ending('retour'); else app.go('carte-1'); }

  return () => { clearTimeout(armed); stopSpeaking(); fit?.destroy(); endFox?.destroy(); fox.destroy(); };
}
