// Fête de fin de série : une série est une partie d'un niveau (« Mes premiers mots », « Les animaux »…). Quand tous ses exercices
// sont acquis, le renard fait la fête (confettis, les mots appris), dit combien de séries il reste, puis propose la série suivante
// ou un petit dessin sur le tableau pour souffler. La fête n'est montrée qu'une fois par série (core/progress.js : noterSerie).
// Rien n'est noté ici : c'est une récompense, pas une évaluation. Adresse : #serie-<niveau>-<numéro de la série>.
import { h, icon } from '../dom.js';
import { forestScene } from '../art.js';
import { confetti } from '../confetti.js';
import { SKILLS, LEVELS } from '../../content/skills.js';
import { tierFor, ideeSuivante } from '../../content/dessins.js';
import { feteSerie, feteNiveau, FETE_SUITE, FETE_SUITE_NIVEAU, FETE_SUITE_CARTE } from '../../content/series.js';
import { levelSections, serieTerminee, serieSuivante, serieVue, niveauTermine, masteredCount } from '../../core/progress.js';
import { sfx, speak, stopSpeaking } from '../audio.js';

/** Les mots d'une série à montrer sous le titre : tous si possible, sinon les premiers et « … ». */
const MAX_MOTS = 14;

export function serie(root, app, arg) {
  const st = app.state;
  const [lvArg, siArg] = String(arg || '').split('-');
  const lv = LEVELS.find((l) => String(l.id) === lvArg && l.available);
  const sections = lv ? levelSections(st, lv) : [];
  const index = Number.isInteger(+siArg) && siArg !== undefined && siArg !== '' ? +siArg : -1;
  const section = sections[index];
  // Pas de fête pour une série pas finie : retour à la carte
  if (!section || !serieTerminee(st, section)) { app.go(lv ? `carte-${lv.id}` : 'niveaux'); return; }
  serieVue(st, lv, index);
  app.save();

  root.classList.add('serie');
  const fini = niveauTermine(st, lv);
  const suivante = fini ? null : serieSuivante(st, lv, index);
  const niveauSuivant = fini ? LEVELS.find((l) => l.id === lv.id + 1 && l.available) : null;
  const total = sections.length;
  const faites = sections.filter((x) => serieTerminee(st, x)).length;

  const foxHost = h('div', { class: 'res-fox' });
  const mots = section.skills.map((id) => SKILLS[id]?.label || SKILLS[id]?.title).filter(Boolean);
  const montres = mots.slice(0, MAX_MOTS);
  const dots = sections.map((x, k) => h('span', {
    class: `se-dot${serieTerminee(st, x) ? ' on' : ''}${k === index ? ' now' : ''}`, 'aria-hidden': 'true',
    html: serieTerminee(st, x) ? icon('star', 18) : '',
  }));

  // Ce que fait chaque bouton : série suivante, niveau suivant, retour à la carte ; ou un dessin pour fêter ça
  const versCarte = suivante != null ? `carte-${lv.id}-${suivante}` : `carte-${lv.id}`;
  const go = (route) => { sfx('pop'); stopSpeaking(); app.go(route); };
  const nextLabel = fini ? (niveauSuivant ? 'Niveau suivant' : 'Choisir une aventure') : suivante != null ? 'Série suivante' : 'Retour à la carte';
  const nextRoute = fini ? (niveauSuivant ? `carte-${niveauSuivant.id}` : 'niveaux') : versCarte;
  const nextBtn = h('button', { class: 'btn-big sm se-next', type: 'button', onClick: () => go(nextRoute), html: `${icon('arrowR', 28)}<span>${nextLabel}</span>` });
  const drawBtn = h('button', {
    class: 'btn-sec se-draw', type: 'button',
    onClick: () => {
      // un petit dessin, tout de suite : le tableau s'ouvre sur la feuille à dessiner, avec l'idée suivante (du plus simple au plus compliqué)
      const tier = tierFor(masteredCount(st), st.settings.demo);
      st.settings.dessinVu = ideeSuivante(tier, st.settings.dessinVu).phrase;
      app.save();
      app.tableauView = 'dessiner';
      app.tableauFrom = versCarte;
      go('tableau');
    },
    html: `${icon('pencil', 24)}<span>Un petit dessin pour fêter ça</span>`,
  });
  const mapBtn = h('button', { class: 'btn-sec sm se-map', type: 'button', onClick: () => go(`carte-${lv.id}-${index}`), html: `${icon('map', 20)}<span>Voir la carte</span>` });

  const resteTxt = fini ? 'Tu as fini toutes les séries de ce niveau !' : `${faites} série${faites > 1 ? 's' : ''} terminée${faites > 1 ? 's' : ''} sur ${total}`;
  const card = h('div', { class: 'result-card rich se-card' },
    foxHost,
    h('p', { class: 'se-kicker' }, `Série ${index + 1} sur ${total}`),
    h('h2', {}, fini ? `Bravo ! Tu as fini tout le niveau « ${lv.name} » !` : `Bravo ! Tu as fini la série « ${section.title} » !`),
    h('ul', { class: 'se-words', 'aria-label': 'Ce que tu as appris dans cette série' },
      montres.map((m, i) => h('li', { style: { '--d': `${0.15 * i}s` } }, h('span', { class: 'se-tick', html: icon('check', 16) }), h('span', {}, m))),
      mots.length > montres.length ? h('li', { class: 'se-more' }, `et ${mots.length - montres.length} de plus`) : null),
    h('div', { class: 'se-dots', role: 'img', 'aria-label': resteTxt }, dots),
    h('p', { class: 'se-left' }, resteTxt),
    h('div', { class: 'res-actions se-actions' }, drawBtn, nextBtn),
    mapBtn,
  );
  const overlay = h('div', { class: 'result serie-end', role: 'dialog', 'aria-label': 'Série terminée' }, card);
  root.append(h('div', { class: 'scene-wrap soft', html: forestScene({ density: 0 }) }), overlay);

  const fox = app.makeFox(foxHost, { accessories: app.equipped() });
  fox.setMood('joy', 4500);
  sfx('win');
  const timers = [setTimeout(() => sfx('unlock'), 700)];
  // deux volées de confettis : à l'arrivée, puis un peu plus tard
  const burst = (n, power) => { const r = overlay.getBoundingClientRect(); confetti(overlay, r.width / 2, Math.max(120, r.height * 0.35), { n, power }); };
  timers.push(setTimeout(() => burst(90, 1.3), 150), setTimeout(() => burst(60, 1), 1300));
  const suite = fini ? FETE_SUITE_NIVEAU : suivante == null ? FETE_SUITE_CARTE : FETE_SUITE;
  const dit = `${fini ? feteNiveau(lv.name) : feteSerie(section.title)} ${suite}`;
  timers.push(setTimeout(() => {
    speak(dit, { onStart: () => fox.talk(true), onEnd: () => fox.talk(false) });
  }, 400));

  return () => { timers.forEach(clearTimeout); stopSpeaking(); fox.destroy(); };
}
