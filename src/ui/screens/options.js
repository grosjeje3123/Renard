// Options : les réglages simples. Les petits sons et la mélodie sont à portée de main ; ce qui peut dérouter un enfant s'il y touche
// par mégarde (couper la voix, changer de classe, passer en gaucher, changer le trait) s'ouvre par un appui de deux secondes, comme l'espace parents.
// Les réglages plus délicats (pauses, galerie, choix de la voix, sauvegarde, suivi) restent dans l'espace parents.
import { h, icon } from '../dom.js';
import { forestScene } from '../art.js';
import { sfx, jingle, unlockAudio } from '../audio.js';
import { CLASSES, setClasse, cleanName } from '../../core/progress.js';
import { card, row, seg, toggle, affichageCard, traitRows } from './parents-tools.js';
import { isNative } from '../sheets.js';
import { version } from '../version.js';

export function options(root, app) {
  root.classList.add('parents', 'options');
  const st = app.state, set = st.settings;
  const adulte = !!app.parentOk && Date.now() - app.parentOk < 10 * 60 * 1000; // un adulte vient d'ouvrir le verrou (ici ou dans l'espace parents)

  // ---- Son
  const heard = h('p', { class: 'muted', 'aria-live': 'polite' });
  const play = h('button', { class: 'btn-sec sm', type: 'button', html: `${icon('music', 22)}<span>Écouter la mélodie</span>` });
  play.addEventListener('click', () => {
    unlockAudio();
    const d = jingle({ force: true });
    heard.textContent = d ? '' : 'Les petits sons sont coupés : remets-les pour entendre la mélodie.';
  });
  const son = card('Son',
    adulte ? toggle(app, 'opt-voix', 'Voix du renard', 'Le renard lit les consignes à voix haute.', 'voix') : null,
    toggle(app, 'opt-sons', 'Petits sons', 'Les sons de réussite et les bruitages.', 'sons'),
    toggle(app, 'opt-jingle', 'Mélodie du démarrage', 'Une petite musique de marimba quand on ouvre l’application.', 'jingle'),
    h('div', { class: 'bk-row' }, play), heard);

  // ---- Mon renard : prénom, classe, main
  const nameInput = h('input', { id: 'opt-name', class: 'txt', type: 'text', maxlength: '16', value: st.name, placeholder: 'Prénom', autocomplete: 'off', autocapitalize: 'words' });
  const saveName = () => { st.name = cleanName(nameInput.value); nameInput.value = st.name; app.save(); };
  nameInput.addEventListener('change', saveName);
  nameInput.addEventListener('blur', saveName);
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') nameInput.blur(); });
  const classeHint = h('small', {}, '');
  const showHint = () => { const c = CLASSES.find((x) => x.id === set.classe); classeHint.textContent = c ? `${c.sub}. Le niveau d’écriture se règle aussi à part, dans l’espace parents.` : 'Le renard ouvre d’emblée ce qui précède : choisis la classe de l’enfant.'; };
  showHint();
  const classe = row('Classe de l’enfant', null,
    h('div', { class: 'stackc' }, seg('Classe de l’enfant', CLASSES.map((c) => [c.id, c.label]), set.classe, (id) => { setClasse(st, id); app.applySettings(); showHint(); }), classeHint));
  const moi = card('Mon renard',
    h('label', { class: 'setrow', for: 'opt-name' }, h('span', {}, h('strong', {}, 'Prénom'), h('small', {}, 'Le renard l’utilise pour dire bonjour, et tu peux l’écrire en majuscules. Il reste sur cette tablette.')), nameInput),
    classe,
    row('Main qui écrit', 'Pour un gaucher, l’écran passe en miroir : la main ne cache ni le renard ni les boutons.',
      seg('Main qui écrit', [['gauche', 'Gaucher'], ['droite', 'Droitier']], set.main || 'droite', (v) => { set.main = v; app.applySettings(); app.render(); })),
    ...traitRows(app, 'opt'));

  // ---- À propos
  const about = card('À propos',
    h('p', { class: 'muted' }, `Renard, mon compagnon pour apprendre à écrire · ${version()}`),
    h('div', { class: 'bk-row' },
      h('button', { class: 'btn-sec sm', type: 'button', onClick: () => { sfx('tap'); app.go('credits'); }, html: `${icon('star', 22)}<span>Crédits</span>` }),
      adulte ? h('button', { class: 'btn-sec sm', type: 'button', onClick: () => { sfx('tap'); app.go('bienvenue'); }, html: `${icon('hand', 22)}<span>Revoir la présentation</span>` }) : null),
    h('p', { class: 'muted' }, 'Les réglages des adultes (pauses, galerie, choix de la voix, sauvegarde, suivi) sont dans l’espace parents : sur l’accueil, maintiens le cadenas pendant deux secondes.'));

  // ---- Verrou des adultes : même geste que pour l'espace parents (maintenir deux secondes)
  const ring = h('span', { class: 'ring' });
  const holdBtn = h('button', { class: 'btn-sec hold', type: 'button', 'aria-label': 'Maintenir appuyé pendant deux secondes pour ouvrir les réglages des adultes', html: `${icon('lock', 24)}<span>Maintenir 2 secondes</span>` }, ring);
  let raf = 0, t0 = 0;
  const stop = () => { cancelAnimationFrame(raf); ring.style.setProperty('--p', '0'); };
  const tick = (now) => {
    const k = Math.min(1, (now - t0) / 2000);
    ring.style.setProperty('--p', String(k));
    if (k >= 1) { stop(); sfx('unlock'); app.parentOk = Date.now(); app.render(); return; }
    raf = requestAnimationFrame(tick);
  };
  holdBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); t0 = performance.now(); raf = requestAnimationFrame(tick); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => holdBtn.addEventListener(ev, stop));
  holdBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  holdBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { app.parentOk = Date.now(); app.render(); } }); // clavier : accès direct pour les adultes
  const verrou = card('Réglages des adultes',
    h('p', { class: 'muted' }, 'La voix du renard, le prénom, la classe, la main qui écrit et l’épaisseur du trait sont réservés aux adultes : un enfant ne les change pas par mégarde.'),
    h('div', { class: 'bk-row' }, holdBtn));

  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour à l’accueil', onClick: () => { sfx('tap'); app.go('accueil'); }, html: icon('back', 26) }),
      h('h2', {}, 'Options')),
    h('div', { class: 'pgrid' }, son, adulte ? moi : verrou, ...(isNative() ? [] : [affichageCard()]), about),
  );
  return stop;
}
