// Espace parents, partie « outils » : réglages (main, pauses), ordre des lettres, fiches à imprimer, sauvegarde.
import { REGLES, REGLES_NOTE } from '../../content/regles.js';
import { h, icon } from '../dom.js';
import { glyphIcon } from '../art.js';
import { SKILLS, LEVELS } from '../../content/skills.js';
import { STICKERS } from '../../content/stickers.js';
import { levelSkills, masteredCount, stickerCount, setDepart } from '../../core/progress.js';
import { encodeBackup, decodeBackup } from '../../core/backup.js';
import { EPAISSEURS } from '../../core/epaisseur.js';
import { toSVG } from '../../core/pdf.js';
import { speak, frenchVoices, currentVoice, onVoicesChanged, unlockAudio, hasClips } from '../audio.js';
import { voiceLabel } from '../../core/voices.js';
import { drawings, drawingSVG, clearGallery, MAX_DESSINS } from '../../core/galerie.js';
import { writingSheet, animalSheet, sheetPDF, deliverPDF, shareText, isNative, partageFichiers, REGLURES } from '../sheets.js';

export const card = (title, ...kids) => h('section', { class: 'pcard' }, h('h3', {}, title), ...kids);

/** Les règles de la reconnaissance, pour les adultes : ce que le renard regarde quand l'enfant écrit. */
export const reglesList = () => h('dl', { class: 'regles' }, REGLES.flatMap((r) => [h('dt', {}, r.titre), h('dd', {}, r.texte)]));
export const reglesCard = () => card('Ce que le renard regarde', h('p', { class: 'muted' }, 'À chaque essai, le tracé est comparé au modèle, sur la tablette même, selon six règles :'), reglesList(), h('p', { class: 'muted' }, REGLES_NOTE));
export const row = (label, hint, control, cls = '') => h('div', { class: `setrow stack ${cls}`.trim() }, h('span', {}, h('strong', {}, label), hint ? h('small', {}, hint) : null), control);

/** Boutons à choix unique (plus faciles à toucher qu'une liste déroulante). */
export function seg(label, options, value, onPick) {
  const btns = options.map(([v, text]) => h('button', { class: `seg-b${v === value ? ' on' : ''}`, type: 'button', role: 'radio', 'aria-checked': String(v === value) }, text));
  const wrap = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': label }, btns);
  btns.forEach((b, i) => b.addEventListener('click', () => {
    btns.forEach((x, k) => { x.classList.toggle('on', k === i); x.setAttribute('aria-checked', String(k === i)); });
    onPick(options[i][0]);
  }));
  return wrap;
}

export const toggle = (app, id, label, hint, key) => {
  const input = h('input', { id, type: 'checkbox', class: 'sw' });
  input.checked = !!app.state.settings[key];
  input.addEventListener('change', () => { app.state.settings[key] = input.checked; app.applySettings(); });
  return h('label', { class: 'setrow', for: id }, h('span', {}, h('strong', {}, label), h('small', {}, hint)), input);
};

const PAUSE_HINT = {
  suggestion: 'Le renard propose une pause ; l’enfant peut choisir de continuer.',
  douce: 'Le renard s’endort quelques minutes ; l’enfant peut bouger, lire un animal ou écrire sur son cahier.',
  limite: 'Une fois la limite du jour atteinte, le renard dit « à demain ». Un adulte peut continuer en maintenant un bouton 2 secondes.',
};

/** Galerie des dessins : désactivée par défaut. Explique honnêtement ce qui est conservé, où, et comment tout effacer. */
function galerieCard(app) {
  const st = app.state;
  const info = h('p', { class: 'muted', 'aria-live': 'polite' });
  const thumbs = h('div', { class: 'mini-gal' });
  const clear = h('button', { class: 'btn-danger sm', type: 'button', html: `${icon('trash', 20)}<span>Vider la galerie</span>` });
  let armed = 0;
  const refresh = () => {
    const list = drawings(st);
    info.textContent = list.length
      ? `${list.length} dessin${list.length > 1 ? 's' : ''} enregistré${list.length > 1 ? 's' : ''} sur cette tablette (${MAX_DESSINS} au maximum).${st.settings.galerie ? '' : ' La galerie est fermée : ils sont cachés, pas effacés.'}`
      : 'Aucun dessin enregistré.';
    thumbs.replaceChildren(...list.map((e) => h('span', { class: 'mini-d', title: e.title, html: drawingSVG(e) })));
    clear.hidden = !list.length;
  };
  clear.addEventListener('click', () => {
    if (!armed) { armed = setTimeout(() => { armed = 0; clear.querySelector('span').textContent = 'Vider la galerie'; clear.classList.remove('armed'); }, 4000); clear.querySelector('span').textContent = 'Confirmer : tout supprimer'; clear.classList.add('armed'); return; }
    clearTimeout(armed); armed = 0; clear.querySelector('span').textContent = 'Vider la galerie'; clear.classList.remove('armed');
    clearGallery(st); app.save(); refresh();
  });
  const sw = toggle(app, 'set-galerie', 'Galerie des dessins', 'L’enfant peut choisir d’« accrocher dans la forêt » un dessin terminé, et le revoir dans « Ma galerie ». Désactivée, rien n’est conservé.', 'galerie');
  sw.querySelector('input').addEventListener('change', refresh);
  refresh();
  return card('Galerie de dessins',
    sw, info, thumbs, clear,
    h('p', { class: 'muted' }, 'Les dessins sont enregistrés sur cette tablette seulement, comme la progression : rien n’est envoyé sur Internet. Ils ne sont pas dans le code de sauvegarde. Au-delà de 12, le plus ancien est remplacé. L’enfant peut retirer un dessin lui-même ; « Effacer la progression » vide aussi la galerie.'));
}

/** Épaisseur du trait des exercices guidés, et aide automatique si l'enfant a du mal (voir core/epaisseur.js). */
export function traitRows(app, idPrefix = 'set') {
  const set = app.state.settings;
  return [
    row('Épaisseur du trait', 'Le chemin du guide et la trace du doigt. « Selon le niveau » : épais au niveau 1, de plus en plus fin ensuite. Les autres choix fixent la même épaisseur partout. Dans les mots, le chemin garde sa largeur pour que les lettres voisines ne se mélangent pas.',
      seg('Épaisseur du trait', EPAISSEURS, set.trait || 'auto', (v) => { set.trait = v; app.applySettings(); })),
    toggle(app, `${idPrefix}-aide`, 'Épaissir si l’enfant a du mal', 'Après quelques essais ratés (ou si l’exercice a déjà été difficile), le trait et le chemin s’élargissent d’un cran, deux au plus. Le renard n’en dit rien : l’enfant le remarque à peine.', 'traitAide'),
  ];
}

export function settingsCards(app) {
  const st = app.state, set = st.settings;
  const save = () => app.applySettings();

  const nameInput = h('input', { id: 'child-name', class: 'txt', type: 'text', maxlength: '16', value: st.name, placeholder: 'Prénom', autocomplete: 'off' });
  nameInput.addEventListener('input', () => { st.name = nameInput.value.trim().slice(0, 16); app.save(); });

  const tiltRow = row('Inclinaison du cahier à l’écran', 'Comme une feuille posée en biais. Les écrivains droitiers l’inclinent un peu vers la gauche, les gauchers vers la droite.',
    seg('Inclinaison du cahier', [[-10, '10° gauche'], [-5, '5° gauche'], [0, 'Droit'], [5, '5° droite'], [10, '10° droite']], set.plateau || 0, (v) => { set.plateau = v; save(); }));

  const child = card('Enfant',
    h('label', { class: 'setrow', for: 'child-name' }, h('span', {}, h('strong', {}, 'Prénom de l’enfant'), h('small', {}, 'Utilisé par le renard pour dire bonjour. Reste sur cet appareil.')), nameInput),
    row('Où en est l’enfant ?', 'Ouvre d’emblée ce qui précède : avec « Début du CP », les formes du niveau 1 sont déjà ouvertes ; avec « Fin du CP », toutes les lettres le sont et on peut commencer par les sons, les mots et les phrases. Rien n’est marqué comme acquis, et on peut changer à tout moment. La classe exacte (moyenne ou grande section, CP…) se règle dans Options, sur l’écran d’accueil de l’enfant.',
      seg('Niveau de départ', [[1, 'Avant le CP'], [2, 'Début du CP'], [3, 'Fin du CP']], Math.min(3, Math.max(1, set.depart || 1)), (v) => { setDepart(st, v); save(); })),
    row('Main qui écrit', 'Gaucher : l’écran passe en miroir (la main ne cache ni le renard ni les boutons), le modèle disparaît de la zone de la main et la pente des lettres (plus droite, ou penchée en arrière) est acceptée un peu plus largement. Le sens d’écriture reste de gauche à droite.',
      seg('Main qui écrit', [['gauche', 'Gaucher'], ['droite', 'Droitier']], set.main || 'droite', (v) => { set.main = v; save(); app.render(); })),
    tiltRow,
    row('Réussites par étape', 'Chaque exercice a trois étapes (guide, pointillés, de mémoire). « Une » : on passe à l’étape suivante dès la première réussite, c’est plus rapide. « Deux » : plus d’entraînement, au risque de lasser. De toute façon, l’exercice est revu plus tard, à des jours différents.',
      seg('Réussites par étape', [[1, 'Une'], [2, 'Deux']], set.reps === 2 ? 2 : 1, (v) => { set.reps = v; save(); })),
    ...traitRows(app, 'set'),
    toggle(app, 'set-sound', 'Sons', 'Petits sons de réussite.', 'sons'),
    toggle(app, 'set-soft', 'Tracé plus souple', 'Plus d’indulgence pour les petites mains.', 'souple'),
    toggle(app, 'set-serie-auto', 'Enchaîner les séries', 'Après la fête de fin de série, si l’enfant ne touche à rien, la carte de la série suivante s’ouvre toute seule (aucun exercice ne démarre).', 'serieAuto'),
    toggle(app, 'set-montee', 'La difficulté monte quand l’enfant réussit tout', 'Après trois nouveaux exercices acquis de suite sans le moindre raté, le renard saute l’étape du guide pour le suivant. Après six, il lance un défi : écrire tout seul du premier coup (au premier raté, on passe aux pointillés). La démonstration est toujours montrée ; au premier raté, tout redevient comme avant. Les rappels et la tolérance du tracé ne changent pas.', 'montee'),
    toggle(app, 'set-surprise', 'Dictée surprise en cours de route', 'Tous les cinq exercices acquis, et après chaque série fêtée, le renard propose une petite dictée de trois éléments déjà appris. L’enfant peut passer.', 'dicteeSurprise'),
    toggle(app, 'set-demo', 'Mode démonstration', 'Ouvre tous les exercices et raccourcit les séances (1 réussite par étape).', 'demo'));

  // Pauses
  const modeHint = h('small', {}, PAUSE_HINT[set.pauseMode]);
  const lenRow = row('Durée de la sieste du renard', null, seg('Durée de la sieste', [[2, '2 min'], [3, '3 min'], [5, '5 min']], set.pauseLen, (v) => { set.pauseLen = v; save(); }));
  const limRow = row('Limite du jour', 'Temps d’activité, jamais coupé au milieu d’un essai.', seg('Limite du jour', [[20, '20 min'], [30, '30 min'], [45, '45 min'], [60, '1 h']], set.limiteMin, (v) => { set.limiteMin = v; save(); }));
  const showMode = () => { lenRow.hidden = set.pauseMode !== 'douce'; limRow.hidden = set.pauseMode !== 'limite'; modeHint.textContent = PAUSE_HINT[set.pauseMode]; };
  showMode();
  const pauses = card('Pauses et temps d’écran',
    row('Proposer une pause après', 'Temps d’activité continue (une absence de 5 minutes compte déjà comme une pause).',
      seg('Délai avant la pause', [[0, 'Jamais'], [10, '10 min'], [15, '15 min'], [20, '20 min']], set.pauseMin, (v) => { set.pauseMin = v; save(); })),
    row('Quand la pause arrive', null, h('div', { class: 'stackc' }, seg('Type de pause', [['suggestion', 'Suggestion'], ['douce', 'Pause douce'], ['limite', 'Limite du jour']], set.pauseMode, (v) => { set.pauseMode = v; showMode(); save(); }), modeHint)),
    lenRow, limRow,
    h('p', { class: 'muted' }, 'À chaque pause, l’enfant choisit : bouger avec le renard, lire une fiche sur un animal ou écrire sur du vrai papier.'));
  return [child, ...(isNative() ? [] : [affichageCard()]), voiceCard(app), galerieCard(app), pauses];
}

/** Plein écran : bouton pour la page ouverte dans un navigateur ; explique comment l'installer pour l'avoir à chaque ouverture. */
const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
const canFullscreen = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
const isInstalled = () => ['fullscreen', 'standalone'].some((m) => matchMedia(`(display-mode: ${m})`).matches) || navigator.standalone === true;
export function affichageCard() {
  const status = h('p', { class: 'muted', 'aria-live': 'polite' });
  const btn = h('button', { class: 'btn-sec', type: 'button' });
  const label = () => { btn.innerHTML = `${icon(fsElement() ? 'close' : 'arrowR', 22)}<span>${fsElement() ? 'Quitter le plein écran' : 'Passer en plein écran'}</span>`; };
  btn.addEventListener('click', async () => {
    status.textContent = '';
    try {
      if (fsElement()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else { const el = document.documentElement; await (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' }); }
    } catch { status.textContent = 'Ce navigateur n’autorise pas le plein écran ici. Installez Renard sur l’écran d’accueil (voir ci-dessous).'; }
    label();
  });
  for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(ev, label);
  label();
  const installed = isInstalled();
  return card('Affichage',
    installed
      ? h('p', { class: 'muted' }, 'Renard est installé sur cette tablette : il s’ouvre déjà sans barre de navigateur.')
      : h('div', { class: 'stackc' },
          canFullscreen() ? btn : h('p', { class: 'muted' }, 'Ce navigateur ne propose pas de plein écran pour cette page.'),
          status,
          h('p', { class: 'muted' }, 'Pour l’avoir à chaque ouverture, sans barre de navigateur : sur iPad, touchez Partager puis « Sur l’écran d’accueil ». Sur Android (Chrome), ouvrez le menu ⋮ puis « Installer l’application ».')));
}

/** Voix du renard : choix de la voix, vitesse, timbre, écoute d'un exemple. Tout reste sur l'appareil. */
function voiceCard(app) {
  const set = app.state.settings;
  const save = () => app.applySettings();
  const sel = h('select', { id: 'voice-sel', class: 'txt sel', 'aria-label': 'Voix du renard' });
  const now = h('p', { class: 'muted', 'aria-live': 'polite' });
  const warn = h('p', { class: 'voice-warn', role: 'note' });
  const fill = () => {
    const list = frenchVoices();
    const opts = [h('option', { value: '' }, 'Automatique (la plus naturelle)')];
    for (const d of list) opts.push(h('option', { value: d.name }, voiceLabel(d)));
    sel.replaceChildren(...opts);
    sel.value = list.some((d) => d.name === set.voixNom) ? set.voixNom : '';
    explain();
  };
  const explain = () => {
    const v = currentVoice();
    if (!('speechSynthesis' in window)) { now.textContent = 'Cet appareil n’a pas de synthèse vocale : le renard reste silencieux et les consignes restent écrites.'; warn.hidden = true; return; }
    if (!v) { now.textContent = 'Aucune voix française trouvée : le renard utilisera la voix par défaut du système, ou restera silencieux.'; warn.hidden = true; return; }
    now.textContent = `Voix utilisée : ${v.name}${v.local ? ' (sur l’appareil)' : ' (en ligne)'}.`;
    warn.hidden = v.local;
    warn.textContent = 'Cette voix est fournie par un service en ligne : le texte lu par le renard peut être envoyé à son fournisseur. Pour garder tout sur l’appareil, installez une voix française dans les réglages du système (voir ci-dessous).';
  };
  sel.addEventListener('change', () => { set.voixNom = sel.value; save(); explain(); });
  fill();
  // La liste des voix arrive parfois après l'ouverture de l'écran : on la remplit dès qu'elle est prête.
  const off = onVoicesChanged(() => { if (!sel.isConnected) { off(); return; } fill(); });

  const listen = h('button', { class: 'btn-sec', type: 'button' }, 'Écouter un exemple');
  listen.addEventListener('click', () => {
    unlockAudio();
    speak(`Salut${app.state.name ? ' ' + app.state.name : ''} ! Je suis Renard. Aujourd’hui, on écrit ensemble ?`, { force: true }); // l’essai marche même si la voix est coupée
  });

  return card('Voix du renard',
    toggle(app, 'set-voice', 'Voix du renard', 'Lit les consignes à voix haute.', 'voix'),
    hasClips() ? h('p', { class: 'muted' }, 'Les phrases du renard sont enregistrées avec une voix générée par intelligence artificielle (ce n’est pas une voix humaine). Ce que le renard ne peut pas connaître à l’avance, comme le prénom ou un mot tapé librement, est lu par la voix du système choisie ci-dessous.') : null,
    row('Voix', 'Choisissez la voix qui vous semble la plus agréable. Les voix « sur l’appareil » ne sortent jamais de la tablette.',
      h('div', { class: 'stackc' }, sel, now, warn, listen)),
    row('Vitesse', null, seg('Vitesse de la voix', [['lent', 'Lente'], ['normal', 'Normale'], ['vif', 'Vive']], set.voixVitesse || 'normal', (v) => { set.voixVitesse = v; save(); })),
    row('Timbre', 'Naturel garde la voix telle qu’elle est enregistrée ; « Renard » la rend un peu plus aiguë, ce qui la rend aussi plus artificielle.',
      seg('Timbre de la voix', [['naturel', 'Naturel'], ['renard', 'Renard']], set.voixTimbre || 'naturel', (v) => { set.voixTimbre = v; save(); })),
    h('details', { class: 'voice-help' },
      h('summary', {}, 'Obtenir une voix plus naturelle'),
      h('p', {}, 'La qualité vient du système de la tablette, pas de l’application. Les chemins exacts changent selon la version, mais l’idée est la même :'),
      h('ul', {},
        h('li', {}, h('strong', {}, 'iPad : '), 'Réglages › Accessibilité › Contenu énoncé › Voix › Français, puis télécharger une voix « Améliorée » ou « Premium » (ou Siri).'),
        h('li', {}, h('strong', {}, 'Android : '), 'Paramètres › Système ou Accessibilité › Synthèse vocale › Moteur préféré › Réglages › Installer les données vocales › Français.')),
      h('p', {}, 'Revenez ensuite ici : la nouvelle voix apparaît dans la liste, et le mode « Automatique » la choisira seul.')));
}

/** Ordre des lettres du niveau 2 : les parents peuvent suivre l’ordre de la classe. */
export function orderCard(app) {
  const st = app.state, lv = LEVELS[1];
  const list = h('ol', { class: 'ordl' });
  const draw = () => {
    const ids = levelSkills(st, lv);
    list.replaceChildren(...ids.map((id, i) => h('li', {},
      h('span', { class: 'gl', html: glyphIcon(id, { width: 0.34 }) }),
      h('strong', {}, SKILLS[id].title),
      h('span', { class: 'ord-btns' },
        h('button', { class: 'round xs', type: 'button', 'aria-label': `Monter ${SKILLS[id].title}`, disabled: i === 0, onClick: () => move(ids, i, -1), html: `<span class="up">${icon('back', 20)}</span>` }),
        h('button', { class: 'round xs', type: 'button', 'aria-label': `Descendre ${SKILLS[id].title}`, disabled: i === ids.length - 1, onClick: () => move(ids, i, 1), html: `<span class="down">${icon('back', 20)}</span>` })),
    )));
  };
  const move = (ids, i, d) => {
    const a = ids.slice();
    [a[i], a[i + d]] = [a[i + d], a[i]];
    st.settings.order2 = a.every((x, k) => x === lv.skills[k]) ? null : a;
    app.applySettings();
    draw();
  };
  draw();
  return card('Ordre des lettres (niveau 2)',
    h('p', { class: 'muted' }, 'Pour suivre le rythme de la classe : l’ordre choisi est celui des exercices et des mots qui en dépendent. Rien n’est perdu en le changeant.'),
    list,
    h('div', { class: 'ord-presets' },
      h('button', { class: 'btn-sec sm', type: 'button', onClick: () => { st.settings.order2 = null; app.applySettings(); draw(); } }, 'Ordre d’origine'),
      h('button', { class: 'btn-sec sm', type: 'button', onClick: () => { st.settings.order2 = lv.skills.slice().sort(); app.applySettings(); draw(); } }, 'Ordre alphabétique')));
}

const lc = (s) => s.charAt(0).toLowerCase() + s.slice(1);

/** Fiches à imprimer : aperçu à l'écran, PDF A4 à envoyer vers l'imprimante ou à enregistrer. */
export function sheetsCard(app) {
  const st = app.state, set = st.settings;
  const opt = (id) => `<option value="${id}">${SKILLS[id].title}</option>`;
  const group = (label, ids) => `<optgroup label="${label}">${ids.map(opt).join('')}</optgroup>`;
  const skillSel = h('select', { id: 'sh-skill', class: 'txt sel', 'aria-label': 'Exercice', html: group('Lignes et formes', LEVELS[0].skills) + LEVELS[1].sections.map((x) => group(`Lettres : ${x.title}`, x.skills)).join('') + LEVELS[2].sections.map((x) => group(x.title, x.skills)).join('') });
  const animalSel = h('select', { id: 'sh-animal', class: 'txt sel', 'aria-label': 'Animal', html: STICKERS.map((s) => `<option value="${s.id}">${s.name}</option>`).join('') });
  const sug = Object.entries(st.skills).filter(([, s]) => s.sessions > 0).sort((a, b) => (b[1].last || 0) - (a[1].last || 0))[0]?.[0];
  if (sug) skillSel.value = sug;
  let kind = 'ecriture', reglure = REGLURES.find((r) => r.mm === set.reglure) ? set.reglure : 3;
  const preview = h('div', { class: 'sheet-prev' });
  const status = h('p', { class: 'muted', 'aria-live': 'polite' });
  const pdfBtn = h('button', { class: 'btn-sec', type: 'button', html: `${icon('arrowR', 22)}<span>${isNative() || partageFichiers() ? 'Imprimer ou enregistrer le PDF' : 'Télécharger le PDF'}</span>` });
  const pageFor = () => (kind === 'ecriture'
    ? writingSheet(skillSel.value, { reglure, name: st.name, lefty: set.main === 'gauche' })
    : animalSheet(animalSel.value, { reglure, name: st.name }));
  const nameFor = () => (kind === 'ecriture' ? `renard-ecriture-${skillSel.value}` : `renard-animal-${animalSel.value}`);
  const titleFor = () => (kind === 'ecriture' ? `Renard : ${SKILLS[skillSel.value].title}` : `Renard : ${lc(STICKERS.find((s) => s.id === animalSel.value).name)}`);
  const draw = () => { preview.innerHTML = toSVG(pageFor()); status.textContent = ''; };

  const kindSeg = seg('Type de fiche', [['ecriture', 'Fiche d’écriture'], ['animal', 'Fiche animal']], kind, (v) => { kind = v; skillRow.hidden = v !== 'ecriture'; animalRow.hidden = v !== 'animal'; draw(); });
  const skillRow = row('Exercice', 'Modèle, pointillés puis lignes libres, sur des lignes Seyès.', skillSel);
  const animalRow = row('Animal', 'À lire à deux, à raconter et à dessiner, avec deux lignes à remplir.', animalSel);
  animalRow.hidden = true;
  const regRow = row('Taille des lignes', REGLURES.find((r) => r.mm === reglure).hint, seg('Taille des lignes', REGLURES.map((r) => [r.mm, r.label]), reglure, (v) => {
    reglure = v; set.reglure = v; app.applySettings();
    regRow.querySelector('small').textContent = REGLURES.find((r) => r.mm === v).hint;
    draw();
  }));
  skillSel.addEventListener('change', draw);
  animalSel.addEventListener('change', draw);

  pdfBtn.addEventListener('click', async () => {
    pdfBtn.disabled = true;
    status.textContent = 'Préparation du PDF…';
    try {
      const bytes = await sheetPDF(pageFor(), titleFor());
      const how = await deliverPDF(bytes, `${nameFor()}.pdf`);
      status.textContent = how === 'partage' ? 'La feuille de partage est ouverte : choisissez l’imprimante ou un dossier.' : how === 'annule' ? 'Enregistrement annulé.' : 'PDF enregistré. Imprimez-le en A4, à 100 % (sans « ajuster à la page »).';
    } catch (e) {
      status.textContent = 'Le PDF n’a pas pu être préparé sur cet appareil. L’aperçu ci-dessus reste utilisable.';
    }
    pdfBtn.disabled = false;
  });
  draw();
  return card('Fiches à imprimer',
    h('p', { class: 'muted' }, 'Pour écrire sur du vrai papier : mêmes modèles que sur l’écran, sur des lignes Seyès. Imprimez en A4 à 100 %.'),
    kindSeg, skillRow, animalRow, regRow, preview, pdfBtn, status);
}

const copyText = async (ta) => {
  try { await navigator.clipboard.writeText(ta.value); return true; } catch { /* repli ci-dessous */ }
  ta.focus(); ta.select();
  try { return document.execCommand('copy'); } catch { return false; }
};

/** Sauvegarde et restauration : un code texte, rien n'est envoyé nulle part. */
export function backupCard(app) {
  const st = app.state;
  const out = h('textarea', { class: 'txt code', readonly: true, rows: '3', 'aria-label': 'Code de sauvegarde', hidden: true });
  const msg = h('p', { class: 'muted', 'aria-live': 'polite' });
  const copyBtn = h('button', { class: 'btn-sec sm', type: 'button', hidden: true }, 'Copier le code');
  const shareBtn = h('button', { class: 'btn-sec sm', type: 'button', hidden: true }, 'Envoyer vers…');
  const mkBtn = h('button', { class: 'btn-sec', type: 'button', html: `${icon('arrowR', 22)}<span>Créer le code de sauvegarde</span>` });
  mkBtn.addEventListener('click', async () => {
    out.value = await encodeBackup(st);
    out.hidden = false; copyBtn.hidden = false; shareBtn.hidden = !isNative();
    msg.textContent = `Code créé (${Math.round(out.value.length / 1024 * 10) / 10} Ko). Gardez-le privé : il contient toute la progression.`;
  });
  copyBtn.addEventListener('click', async () => { msg.textContent = (await copyText(out)) ? 'Code copié.' : 'Copie impossible ici : sélectionnez le texte et copiez-le à la main.'; });
  shareBtn.addEventListener('click', async () => { try { await shareText(out.value, 'Sauvegarde Renard'); } catch { msg.textContent = 'Le partage n’a pas abouti.'; } });

  const inp = h('textarea', { class: 'txt code', rows: '3', placeholder: 'Collez ici un code de sauvegarde (RENARD1:…)', 'aria-label': 'Code à restaurer', spellcheck: 'false', autocomplete: 'off' });
  const rmsg = h('p', { class: 'muted', 'aria-live': 'polite' });
  const restoreBtn = h('button', { class: 'btn-sec', type: 'button', html: `${icon('replay', 22)}<span>Restaurer</span>` });
  let pending = null, armed = 0;
  const reset = () => { clearTimeout(armed); armed = 0; pending = null; restoreBtn.querySelector('span').textContent = 'Restaurer'; restoreBtn.classList.remove('armed'); };
  restoreBtn.addEventListener('click', async () => {
    if (pending) {
      const s = pending; reset();
      app.restore(s);
      app.parentOk = Date.now();
      app.render();
      return;
    }
    try {
      const s = await decodeBackup(inp.value);
      pending = s;
      rmsg.textContent = `Sauvegarde lisible : ${s.name || 'sans prénom'}, ${masteredCount(s)} exercice${masteredCount(s) > 1 ? 's' : ''} acquis, ${stickerCount(s)} vignette${stickerCount(s) > 1 ? 's' : ''}. Elle remplacera la progression de cet appareil.`;
      restoreBtn.querySelector('span').textContent = 'Confirmer : remplacer';
      restoreBtn.classList.add('armed');
      armed = setTimeout(reset, 8000);
    } catch (e) { reset(); rmsg.textContent = e.message; }
  });
  return card('Sauvegarde',
    h('p', { class: 'muted' }, 'Pour changer de tablette ou garder une copie : un simple code texte. Rien n’est envoyé sur Internet. Les dessins de la galerie n’y figurent pas.'),
    h('div', { class: 'bk' }, mkBtn, out, h('div', { class: 'bk-row' }, copyBtn, shareBtn), msg),
    h('div', { class: 'bk' }, inp, restoreBtn, rmsg));
}
