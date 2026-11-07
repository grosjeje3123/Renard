import { h, icon, pick } from '../dom.js';
import { forestScene } from '../art.js';
import { bubble, makeSpeaker } from '../say.js';
import { recommend, foxStage, breakDue, blocked, takeBreak } from '../../core/progress.js';
import { SKILLS } from '../../content/skills.js';
import { sfx, frenchVoices, onVoicesChanged } from '../audio.js';
import { galleryOn } from '../../core/galerie.js';

export function home(root, app) {
  const st = app.state;
  const rec = recommend(st);
  const skill = SKILLS[rec.skillId];
  const stage = foxStage(st);
  const first = Object.keys(st.skills).length === 0;
  const name = st.name ? ` ${st.name}` : '';
  const block = blocked(st); // 'sleep' | 'limit' | null
  const due = breakDue(st);
  const resting = !!block || due;

  const foxHost = h('div', { class: 'home-fox', role: 'button', tabindex: '0', 'aria-label': 'Caresser le renard' });
  const b = bubble({ big: true });
  const playBtn = h('button', { class: 'btn-big', type: 'button', html: `${icon(resting ? 'moon' : 'play', 34)}<span>${resting ? 'Pause' : 'Jouer'}</span>` });
  const stayBtn = due && st.settings.pauseMode === 'suggestion' ? h('button', { class: 'btn-sec sm stay', type: 'button' }, 'Jouer quand même') : null;
  const voiceBtn = h('button', { class: 'round sm', type: 'button', 'aria-label': st.settings.voix ? 'Couper la voix' : 'Remettre la voix', html: icon(st.settings.voix ? 'speaker' : 'mute', 26) });

  const optBtn = h('button', { class: 'round sm', type: 'button', 'aria-label': 'Options', onClick: () => { sfx('tap'); app.go('options'); }, html: icon('gear', 26) });

  // Appui long de deux secondes pour l'espace parents (les enfants n'y entrent pas par hasard).
  const lockBtn = h('button', { class: 'round nav', type: 'button', 'aria-label': 'Espace parents : maintenir appuyé 2 secondes', html: `<span class="ring"></span>${icon('lock', 30)}<span class="lbl">Parents</span>` });
  const navBtn = (ic, label, route) => h('button', { class: 'round nav', type: 'button', onClick: () => { sfx('tap'); app.go(route); }, html: `${icon(ic, 32)}<span class="lbl">${label}</span>` });

  // Sans voix française, le renard reste muet et un enfant qui ne lit pas est perdu : on prévient les adultes (une seule fois).
  const voiceNotice = h('div', { class: 'voice-notice', role: 'note', hidden: true },
    h('span', {}, 'Le renard n’a pas trouvé de voix française sur cette tablette. S’il reste muet, un adulte peut en installer une en une minute.'),
    h('div', { class: 'vn-btns' },
      h('button', { class: 'btn-sec sm', type: 'button', onClick: () => app.go('parents') }, 'Comment faire ?'),
      h('button', { class: 'btn-sec sm', type: 'button', onClick: () => { st.settings.avisVoix = true; app.save(); voiceNotice.hidden = true; } }, 'Compris')));
  const checkVoice = () => {
    if (!voiceNotice.isConnected) { off(); return; }
    voiceNotice.hidden = !(st.settings.voix && !st.settings.avisVoix && frenchVoices().length === 0);
  };
  const off = onVoicesChanged(checkVoice);
  setTimeout(checkVoice, 2500); // la liste des voix arrive après le démarrage

  root.classList.add('home');
  root.append(
    h('div', { class: 'scene-wrap', html: forestScene() }),
    h('header', { class: 'top-right' }, optBtn, voiceBtn),
    h('div', { class: 'home-main' },
      foxHost,
      h('div', { class: 'home-panel' },
        h('h1', { class: 'logo' }, 'Renard'),
        h('p', { class: 'tagline' }, 'Mon compagnon pour apprendre à écrire'),
        b,
        playBtn,
        stayBtn,
        h('p', { class: 'stage' }, stage.name),
        voiceNotice,
      ),
    ),
    h('nav', { class: 'home-nav', 'aria-label': 'Menu' }, navBtn('map', 'Niveaux', 'niveaux'), navBtn('chest', 'Trésors', 'tresors'), navBtn('album', 'Album', 'album'), navBtn('tableau', 'Tableau', 'tableau'), galleryOn(st) ? navBtn('frame', 'Galerie', 'galerie') : null, lockBtn),
  );

  const fox = app.makeFox(foxHost);
  const speaker = makeSpeaker(fox, b);
  let line;
  if (block === 'limit') line = `On se retrouve demain${name} ! Aujourd’hui, on a bien travaillé.`;
  else if (block === 'sleep') line = `Je fais une petite sieste${name}… On se retrouve tout à l’heure !`;
  else if (due) line = `J’ai bien travaillé avec toi${name} ! Et si on faisait une pause ?`;
  else if (first) line = `Bonjour${name} ! Je m’appelle Renard. Tu veux apprendre à écrire avec moi ?`;
  else if (rec.reason === 'review') line = `Content de te revoir${name} ! On s’entraîne encore avec ${skill.title.toLowerCase()} ?`;
  else if (rec.reason === 'revise') line = `Content de te revoir${name} ! Tu te souviens de ${skill.title.toLowerCase()} ? On vérifie ensemble !`;
  else if (rec.reason === 'continue') line = `Content de te revoir${name} ! On continue : ${skill.title.toLowerCase()} ?`;
  else if (rec.reason === 'next') line = `Bravo pour tes progrès${name} ! Prêt pour ${skill.title.toLowerCase()} ?`;
  else line = `Salut${name} ! On refait un exercice que tu aimes ?`;
  speaker.say(line, { silent: true, icon: resting ? 'moon' : undefined });
  if (block) fox.setMood('sleep');
  else fox.setMood('wave', 2800); // le renard salue à l’arrivée

  playBtn.addEventListener('click', () => { sfx('pop'); app.go(resting ? 'pause' : `exercice-${rec.skillId}`); });
  stayBtn?.addEventListener('click', () => { sfx('tap'); takeBreak(st); app.save(); app.go(`exercice-${rec.skillId}`); }); // pause refusée : on repart pour un tour
  voiceBtn.addEventListener('click', () => {
    st.settings.voix = !st.settings.voix;
    app.applySettings();
    voiceBtn.innerHTML = icon(st.settings.voix ? 'speaker' : 'mute', 26);
    voiceBtn.setAttribute('aria-label', st.settings.voix ? 'Couper la voix' : 'Remettre la voix');
    if (st.settings.voix) speaker.repeat();
  });
  const pet = () => {
    sfx('giggle');
    fox.setMood('joy', 1800);
    speaker.say(pick(['Hihi, ça chatouille !', 'Coucou ! Tu viens écrire avec moi ?', 'J’adore écrire avec toi !', 'Allez, on y va ?']), { mood: 'joy', ms: 1800 });
  };
  foxHost.addEventListener('click', pet);
  foxHost.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') pet(); });

  // appui long : espace parents
  let raf = 0, t0 = 0;
  const ring = lockBtn.querySelector('.ring');
  const stop = () => { cancelAnimationFrame(raf); lockBtn.classList.remove('holding'); ring.style.setProperty('--p', '0'); };
  const tick = (now) => {
    const k = Math.min(1, (now - t0) / 2000);
    ring.style.setProperty('--p', String(k));
    if (k >= 1) { stop(); sfx('unlock'); app.parentOk = Date.now(); app.go('parents'); return; }
    raf = requestAnimationFrame(tick);
  };
  lockBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); lockBtn.classList.add('holding'); t0 = performance.now(); raf = requestAnimationFrame(tick); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => lockBtn.addEventListener(ev, stop));
  lockBtn.addEventListener('contextmenu', (e) => e.preventDefault());
  lockBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter') { app.parentOk = Date.now(); app.go('parents'); } }); // clavier : accès direct pour les adultes

  return () => { stop(); fox.destroy(); };
}
