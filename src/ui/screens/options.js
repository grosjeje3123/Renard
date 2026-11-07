// Options : les réglages simples, à portée de main (son, prénom, classe, main qui écrit, affichage), et les crédits.
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

  // ---- Son
  const heard = h('p', { class: 'muted', 'aria-live': 'polite' });
  const play = h('button', { class: 'btn-sec sm', type: 'button', html: `${icon('music', 22)}<span>Écouter la mélodie</span>` });
  play.addEventListener('click', () => {
    unlockAudio();
    const d = jingle({ force: true });
    heard.textContent = d ? '' : 'Les petits sons sont coupés : remets-les pour entendre la mélodie.';
  });
  const son = card('Son',
    toggle(app, 'opt-voix', 'Voix du renard', 'Le renard lit les consignes à voix haute.', 'voix'),
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
  const showHint = () => { const c = CLASSES.find((x) => x.id === set.classe); classeHint.textContent = c ? c.sub : 'Le renard ouvre d’emblée ce qui précède : choisis la classe de l’enfant.'; };
  showHint();
  const classe = row('Classe de l’enfant', null,
    h('div', { class: 'stackc' }, seg('Classe de l’enfant', CLASSES.map((c) => [c.id, c.label]), set.classe, (id) => { setClasse(st, id); app.applySettings(); showHint(); }), classeHint));
  const moi = card('Mon renard',
    h('label', { class: 'setrow', for: 'opt-name' }, h('span', {}, h('strong', {}, 'Prénom'), h('small', {}, 'Le renard l’utilise pour dire bonjour, et tu peux l’écrire en majuscules. Il reste sur cette tablette.')), nameInput),
    classe,
    row('Main qui écrit', 'Pour un gaucher, l’écran passe en miroir : la main ne cache ni le renard ni les boutons.',
      seg('Main qui écrit', [['droite', 'Droitier'], ['gauche', 'Gaucher']], set.main || 'droite', (v) => { set.main = v; app.applySettings(); app.render(); })),
    ...traitRows(app, 'opt'));

  // ---- À propos
  const about = card('À propos',
    h('p', { class: 'muted' }, `Renard, mon compagnon pour apprendre à écrire · ${version()}`),
    h('div', { class: 'bk-row' },
      h('button', { class: 'btn-sec sm', type: 'button', onClick: () => { sfx('tap'); app.go('credits'); }, html: `${icon('star', 22)}<span>Crédits</span>` }),
      h('button', { class: 'btn-sec sm', type: 'button', onClick: () => { sfx('tap'); app.go('bienvenue'); }, html: `${icon('hand', 22)}<span>Revoir la présentation</span>` })),
    h('p', { class: 'muted' }, 'Les réglages des adultes (pauses, galerie, choix de la voix, sauvegarde, suivi) sont dans l’espace parents : sur l’accueil, maintiens le cadenas pendant deux secondes.'));

  root.append(
    h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }),
    h('header', { class: 'bar' },
      h('button', { class: 'round sm', type: 'button', 'aria-label': 'Retour à l’accueil', onClick: () => { sfx('tap'); app.go('accueil'); }, html: icon('back', 26) }),
      h('h2', {}, 'Options')),
    h('div', { class: 'pgrid' }, son, moi, ...(isNative() ? [] : [affichageCard()]), about),
  );
}
