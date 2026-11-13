// Modèle de progression : maîtrise par compétence, recommandations, stade du renard,
// difficultés observées et temps d'utilisation. Fonctions pures sur un objet d'état sérialisable.

import { SKILLS, LEVELS, ITEMS } from '../content/skills.js';
import { STICKERS } from '../content/stickers.js';
import { CRITERIA } from '../engine/recognizer.js';
import { validDrawing, MAX_DESSINS } from './galerie.js';

export const STATE_VERSION = 1;

export function newState() {
  return {
    v: STATE_VERSION,
    name: '',
    created: Date.now(),
    settings: {
      voix: true, sons: true, souple: false, demo: false,
      jingle: true, // la petite musique de marimba à l'ouverture (les sons doivent aussi être activés)
      voixNom: '', // voix choisie par les parents ('' = la plus naturelle disponible sur l'appareil)
      voixVitesse: 'normal', // 'lent' | 'normal' | 'vif'
      voixTimbre: 'naturel', // 'naturel' | 'renard' (un peu plus aigu)
      avisVoix: false, // l'avis « pas de voix française sur cette tablette » a été lu par un adulte
      trait: 'auto', // épaisseur du trait : 'auto' (plus fin à mesure que le niveau monte) | 'fin' | 'moyen' | 'epais' (voir core/epaisseur.js)
      serieAuto: true, // après la fête de fin de série, la série suivante s'ouvre toute seule si l'enfant ne touche à rien
      montee: true, // la difficulté monte : après trois nouveaux exercices acquis sans le moindre raté, le suivant commence aux pointillés (voir `aLAise`)
      dessinVu: '', // la dernière idée de dessin montrée (les modèles se suivent du plus simple au plus compliqué)
      traitAide: true, // épaissir le trait d'un cran (deux au plus) quand l'enfant a du mal
      reps: 1, // réussites demandées à chaque étape d'un exercice (1 ou 2)
      main: 'droite', // main d'écriture : 'droite' | 'gauche' (miroir de l'écran, tolérance de pente élargie)
      plateau: 0, // inclinaison du cahier à l'écran, en degrés (positif = vers la droite)
      pauseMin: 15, // minutes d'activité continue avant de proposer une pause (0 = jamais)
      pauseMode: 'suggestion', // 'suggestion' | 'douce' (le renard dort quelques minutes) | 'limite' (limite du jour)
      pauseLen: 3, // durée de la pause douce, en minutes
      limiteMin: 30, // limite du jour, en minutes (mode 'limite')
      galerie: false, // galerie de dessins : désactivée par défaut (rien n'est conservé tant que les parents ne l'activent pas)
      reglure: 3, // interligne des fiches à imprimer, en mm
      order2: null, // ordre des lettres du niveau 2, choisi par les parents (null = ordre d'origine)
      depart: 1, // niveau de départ : 1 (avant le CP), 2 (début du CP), 3 (fin du CP) ; les niveaux d'avant sont ouverts
      classe: '', // classe choisie à la première ouverture : 'ms' | 'gs' | 'cp1' | 'cp2' ('' = pas encore dite) ; elle règle `depart` (la grande section ouvre aussi les majuscules d'emblée)
      accueilFait: false, // la présentation du premier lancement (prénom, classe, main) a été faite ou passée
      methodeVue: false, // l'écran « Comment ça marche » (les trois étapes) a été montré avant le premier exercice lancé depuis l'accueil
    },
    skills: {},
    usage: {}, // 'AAAA-MM-JJ' -> secondes d'activité
    rest: { since: 0, at: 0, sleepUntil: 0, overrideDay: '' }, // activité continue depuis la dernière pause
    equipped: [],
    seen: {}, // choses déjà montrées à l'enfant (ex. : 'serie-intro-3' : le renard a expliqué les séries du niveau 3)
    aisance: [], // issue des derniers nouveaux exercices : 'e' (acquis sans un seul raté) ou 'x' (avec difficulté, ou séance finie fatigué) ; les six derniers
    dictees: {}, // id d'exercice -> { n, best, last, t } : résultats des dictées (voir core/dictee.js)
    series: {}, // 'niveau:série' -> { t, vu } : séries terminées (la fête est montrée une fois : `vu`)
    stickers: {}, // id de vignette -> date d'obtention
    fiches: {}, // id de vignette -> nombre de lectures de la fiche animal
    galerie: [], // dessins accrochés par l'enfant (seulement si les parents l'ont activé) : voir core/galerie.js
  };
}

/**
 * La classe de l'enfant, dite à la première ouverture (ou plus tard dans Options / l'espace parents) : elle règle le niveau
 * de départ. La grande section est la seule à compter pour deux : les formes y sont acquises, on part des majuscules.
 */
export const CLASSES = [
  { id: 'ms', label: 'Moyenne section', sub: 'Je découvre les formes', depart: 1 },
  { id: 'gs', label: 'Grande section', sub: 'J’apprends les majuscules', depart: 1 },
  { id: 'cp1', label: 'CP, début d’année', sub: 'J’apprends les lettres', depart: 2 },
  { id: 'cp2', label: 'CP, fin d’année ou CE1', sub: 'J’écris des mots', depart: 3 },
];
export const classeLabel = (id) => CLASSES.find((c) => c.id === id)?.label || '';
/** Choisit la classe (une classe inconnue ne change rien) et règle le niveau de départ en conséquence. */
export function setClasse(st, id) {
  const c = CLASSES.find((x) => x.id === id);
  if (!c) return false;
  st.settings.classe = c.id;
  st.settings.depart = c.depart;
  return true;
}
/** Les parents règlent directement le niveau de départ (1 à 3) : la classe affichée suit, sans jamais le contredire. */
export function setDepart(st, depart) {
  const d = Math.min(3, Math.max(1, Math.round(depart) || 1));
  st.settings.depart = d;
  const cur = CLASSES.find((c) => c.id === st.settings.classe);
  if (!cur || cur.depart !== d) st.settings.classe = CLASSES.find((c) => c.depart === d).id;
  return d;
}
/** Tablette neuve, sans progression ni réglage fait : on se présente (prénom, classe, main) avant de jouer. */
export const needsWelcome = (st) => !st.settings.accueilFait && !st.settings.classe && !st.name && Object.keys(st.skills || {}).length === 0;
/** Le prénom tapé par l'enfant ou l'adulte : des lettres seulement, une majuscule au début de chaque partie, quatorze lettres au plus. */
export function cleanName(raw) {
  const letters = String(raw || '').replace(/[^\p{L}\- ]/gu, '').replace(/\s+/g, ' ').replace(/-+/g, '-').trim().replace(/^[- ]+|[- ]+$/g, '');
  const cut = letters.slice(0, 14).replace(/[- ]+$/g, '');
  return cut.toLowerCase().replace(/(^|[- ])(\p{L})/gu, (m, sep, c) => sep + c.toUpperCase());
}

/** Complète un état enregistré avec les réglages et champs ajoutés depuis (les anciennes sauvegardes restent valables). */
export function hydrate(s) {
  const base = newState();
  const galerie = Array.isArray(s.galerie) ? s.galerie.filter(validDrawing).slice(-MAX_DESSINS) : [];
  return { ...base, ...s, galerie, settings: { ...base.settings, ...(s.settings || {}) }, rest: { ...base.rest, ...(s.rest || {}) } };
}

const blank = () => ({ sessions: 0, attempts: 0, phase: 0, mastered: false, masteredAt: null, last: null, history: [] });
export const skillState = (st, id) => st.skills[id] || blank();

export const dayKey = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Enregistre la fin d'une séance (et les essais détaillés). Retourne ce qui a été débloqué. */
export function recordSession(st, skillId, session, now = Date.now()) {
  const s = (st.skills[skillId] = st.skills[skillId] || blank());
  const wasMastered = s.mastered;
  const last = lastEvent(s);
  s.sessions++;
  s.attempts += session.log.length;
  s.last = now;
  s.phase = Math.max(s.phase, session.phase);
  for (const l of session.log) {
    s.history.push({ t: now, ph: l.phase, sc: Math.round(l.score * 100) / 100, st: l.stars, c: roundCrit(l.criteria), tg: l.tags });
  }
  if (s.history.length > 40) s.history = s.history.slice(-40);
  const newlyMastered = session.mastered && !wasMastered;
  // Aisance : seuls comptent les nouveaux exercices (pas les rappels) ; en mode démonstration tout est trop facile pour dire quelque chose
  if (!wasMastered && !st.settings.demo) {
    const sansRate = session.mastered && session.log.every((l) => l.stars >= 2);
    st.aisance = [...(st.aisance || []), sansRate ? 'e' : 'x'].slice(-6);
  }
  if (newlyMastered) { s.mastered = true; s.masteredAt = now; }
  // Consolidation : réussir de mémoire, sans aide, à des jours espacés (au moins 2 jours d'écart, deux fois).
  let consolidated = false;
  if (wasMastered && session.mastered && daysBetween(last, now) >= 2) {
    s.reviews = [...(s.reviews || []), now].slice(-6);
    if (s.reviews.length >= 2 && !s.consolidatedAt) { s.consolidatedAt = now; consolidated = true; }
  }
  return { newlyMastered, item: newlyMastered ? SKILLS[skillId].item || null : null, consolidated };
}

// ---------- Maîtrise consolidée (révision espacée) ----------
const DAY = 86400000;
const dayNum = (t) => { const d = new Date(t); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); };
/** Nombre de jours calendaires entre deux instants. */
export const daysBetween = (a, b) => dayNum(b) - dayNum(a);
const lastEvent = (s) => Math.max(s.masteredAt || 0, ...(s.reviews || []));
export const isConsolidated = (st, id) => !!st.skills[id]?.consolidatedAt;
/** Un exercice acquis, pas encore consolidé, et assez ancien pour un rappel. */
export function reviewDue(st, id, now = Date.now()) {
  const s = st.skills[id];
  return !!s && s.mastered && !s.consolidatedAt && daysBetween(lastEvent(s), now) >= 2;
}
/**
 * La difficulté monte pour l'enfant qui réussit tout : trois nouveaux exercices de suite acquis sans le moindre raté.
 * Ce n'est ni un score ni un niveau : le prochain exercice jamais essayé saute seulement l'étape du guide (la démonstration reste montrée).
 * Un seul raté (exercice acquis avec difficulté, ou séance finie fatigué) et tout redevient comme avant. Les parents peuvent le couper.
 */
export const AISANCE_N = 3;
export const aLAise = (st) => st.settings.montee !== false && !st.settings.demo && (st.aisance || []).length >= AISANCE_N && (st.aisance || []).slice(-AISANCE_N).every((x) => x === 'e');
/**
 * Par quelle étape commence l'exercice : 0 (le guide), 1 (les pointillés : enfant à l'aise, exercice jamais essayé)
 * ou 2 (tout seul : un exercice déjà acquis un autre jour, rappel express).
 */
export function startPhaseFor(st, id, now = Date.now()) {
  const s = st.skills[id];
  if (s && paperEncore(s)) return 0; // à retravailler : on repart du guide
  if (s?.mastered && s.masteredAt && daysBetween(s.masteredAt, now) >= 1) return 2;
  if (!s?.sessions && aLAise(st)) return 1;
  return 0;
}

// ---------- Cahier (papier) : le transfert est une compétence à part, déclarée par l'enfant ----------
export const paperState = (st, id) => st.skills[id]?.paper || { n: 0, last: null, seen: null };
/** « J'ai essayé » : l'application ne vérifie rien, elle valorise l'essai sur papier. */
export function markPaper(st, id, now = Date.now()) {
  const s = (st.skills[id] = st.skills[id] || blank());
  const p = { ...paperState(st, id) };
  p.n++; p.last = now;
  s.paper = p;
}
/** Validation facultative d'un adulte. */
export function confirmPaper(st, id, now = Date.now()) {
  const s = st.skills[id];
  if (!s?.paper?.n) return false;
  s.paper = { ...s.paper, seen: now };
  return true;
}
/**
 * Comment l'essai sur papier s'est passé, d'après l'adulte qui a regardé le cahier (facultatif) : l'appli ne voit rien du papier.
 * « encore » ramène l'exercice dans les « à reprendre » jusqu'à ce que l'enfant le rejoue ; les deux autres n'ont qu'un rôle d'information.
 */
export const AVIS_PAPIER = [['facile', 'Réussi facilement'], ['aide', 'Avec de l’aide'], ['encore', 'À retravailler']];
export function avisPapier(st, id, avis, now = Date.now()) {
  const s = st.skills[id];
  if (!s?.paper?.n || !AVIS_PAPIER.some(([k]) => k === avis)) return false;
  s.paper = { ...s.paper, avis, avisAt: now, seen: s.paper.seen || now }; // donner son avis, c'est avoir regardé
  return true;
}
const paperEncore = (s) => s.paper?.avis === 'encore' && (s.paper.avisAt || 0) > (s.last || 0);
export const paperCount = (st) => Object.values(st.skills).filter((s) => s.paper?.n > 0).length;

const roundCrit = (c) => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.round(v * 100) / 100]));

const REST_GAP = 5 * 60 * 1000; // une absence de 5 minutes compte comme une pause
export function addUsage(st, seconds, now = Date.now()) {
  const k = dayKey(now);
  st.usage[k] = Math.round((st.usage[k] || 0) + seconds);
  const r = (st.rest = st.rest || { since: 0, at: 0, sleepUntil: 0, overrideDay: '' });
  if (!r.at || now - r.at > REST_GAP) r.since = 0;
  r.since += seconds;
  r.at = now;
}

// ---------- Pauses : suggestion, pause douce, limite du jour (jamais de blocage par surprise au milieu d'un essai) ----------
const rest = (st) => (st.rest = st.rest || { since: 0, at: 0, sleepUntil: 0, overrideDay: '' });
export const activeSince = (st) => st.rest?.since || 0;
export const sleepRemaining = (st, now = Date.now()) => Math.max(0, (st.rest?.sleepUntil || 0) - now);
export const dailyLimitReached = (st, now = Date.now()) => st.settings.pauseMode === 'limite' && todaySeconds(st, now) >= st.settings.limiteMin * 60 && rest(st).overrideDay !== dayKey(now);
/** Une pause est à proposer : activité continue depuis assez longtemps. */
export const breakDue = (st, now = Date.now()) => st.settings.pauseMin > 0 && activeSince(st) >= st.settings.pauseMin * 60 && !blocked(st, now);
/** 'sleep' (pause douce en cours) | 'limit' (limite du jour atteinte) | null */
export function blocked(st, now = Date.now()) {
  if (st.settings.pauseMode === 'douce' && sleepRemaining(st, now) > 0) return 'sleep';
  if (dailyLimitReached(st, now)) return 'limit';
  return null;
}
/** L'enfant a pris sa pause : on repart de zéro. */
export function takeBreak(st) { rest(st).since = 0; }
/** Pause douce : le renard s'endort quelques minutes. */
export function beginSleep(st, now = Date.now()) { const r = rest(st); r.sleepUntil = now + st.settings.pauseLen * 60000; r.since = 0; }
/** Un adulte autorise à continuer malgré la limite du jour. */
export function overrideLimit(st, now = Date.now()) { rest(st).overrideDay = dayKey(now); }

/** 'new' | 'progress' | 'review' | 'mastered' */
export function skillStatus(st, id) {
  const s = st.skills[id];
  if (!s || s.sessions === 0) return 'new';
  if (paperEncore(s)) return 'review'; // un adulte a vu le cahier : « à retravailler » (jusqu'à ce que l'enfant rejoue l'exercice)
  if (s.mastered) return 'mastered';
  const recent = s.history.slice(-6);
  if (recent.length >= 5 && avg(recent.map((h) => h.sc)) < 0.5) return 'review';
  return 'progress';
}

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

/** Exercices d'un niveau dans l'ordre choisi : les parents peuvent suivre l'ordre de la classe (niveau 2). L'ordre est complété par les lettres qu'il ne cite pas. */
export function levelSkills(st, level) {
  const o = st.settings?.order2;
  if (level.id === 2 && Array.isArray(o)) {
    const known = o.filter((id, i) => level.skills.includes(id) && o.indexOf(id) === i);
    if (known.length === o.length) return [...known, ...level.skills.filter((id) => !known.includes(id))];
  }
  return level.skills.slice();
}
export const orderedSkills = (st) => LEVELS.flatMap((l) => levelSkills(st, l));

/** Les étapes d'un niveau (« Les lettres rondes », « Les animaux »…) ; sans étapes, une seule liste. Un ordre de classe choisi par les parents est découpé par paquets. */
export function levelSections(st, level) {
  const ids = levelSkills(st, level);
  if (!level.sections) return [{ id: 'tout', title: null, skills: ids }];
  if (ids.join() === level.skills.join()) return level.sections;
  const out = [];
  for (let i = 0; i < ids.length; i += 7) out.push({ id: `ordre${i}`, title: `Dans l’ordre de la classe (${i / 7 + 1})`, skills: ids.slice(i, i + 7) });
  return out;
}

const levelOf = (id) => LEVELS.find((l) => l.skills.includes(id));

// ---- Séries : une série est une partie d'un niveau (« Mes premiers mots », « Les animaux »…). Elle est terminée quand tous ses exercices
// sont acquis ; on la fête une fois, puis on propose la suivante. Les séries du niveau se lisent dans levelSections().
export const serieKey = (level, section) => `${level.id}:${section.id}`;
export const serieTerminee = (st, section) => section.skills.length > 0 && section.skills.every((id) => skillState(st, id).mastered);
export const niveauTermine = (st, level) => levelSections(st, level).every((x) => serieTerminee(st, x));
/** Nombre de séries d'un niveau et nombre de séries déjà terminées (un niveau sans séries n'en annonce pas). */
export function seriesDuNiveau(st, level) {
  if (!level.sections || level.sections.length < 2) return { total: 0, done: 0 };
  const secs = levelSections(st, level);
  return { total: secs.length, done: secs.filter((x) => serieTerminee(st, x)).length };
}

/**
 * À appeler après la réussite d'un exercice : si cet exercice vient de terminer sa série, la série est notée « à fêter » (une seule fois)
 * et sa clé est rendue ; sinon ''. Un exercice déjà acquis avant n'ouvre pas de fête rétroactive.
 */
export function noterSerie(st, skillId, now = Date.now()) {
  const level = levelOf(skillId);
  if (!level?.sections) return '';
  const secs = levelSections(st, level);
  const sec = secs.find((x) => x.skills.includes(skillId));
  if (!sec || secs.length < 2 || !serieTerminee(st, sec)) return '';
  st.series = st.series || {};
  const key = serieKey(level, sec);
  if (st.series[key]) return '';
  st.series[key] = { t: now, vu: false };
  return key;
}

/** La première série terminée qu'on n'a pas encore fêtée (seulement dans le niveau `levelId`, s'il est donné) : { level, index, key } ou null. */
export function serieAFeter(st, levelId = null) {
  for (const level of LEVELS) {
    if (!level.available || !level.sections || (levelId != null && level.id !== levelId)) continue;
    const secs = levelSections(st, level);
    for (let index = 0; index < secs.length; index++) {
      const key = serieKey(level, secs[index]);
      if (st.series?.[key] && st.series[key].vu === false && serieTerminee(st, secs[index])) return { level, index, key };
    }
  }
  return null;
}
export function serieVue(st, level, index) {
  const sec = levelSections(st, level)[index];
  if (!sec) return;
  st.series = st.series || {};
  const key = serieKey(level, sec);
  st.series[key] = { t: st.series[key]?.t || Date.now(), vu: true };
}

/**
 * La série à proposer après la série `index` : la première, plus loin, où il reste quelque chose à apprendre et que l'enfant peut déjà jouer ;
 * à défaut, la première, plus loin, où il reste quelque chose ; null s'il n'y a plus rien devant (fin du niveau).
 */
export function serieSuivante(st, level, index) {
  const secs = levelSections(st, level);
  const reste = (x) => x.skills.some((id) => !skillState(st, id).mastered);
  const devant = secs.map((x, i) => ({ x, i })).filter(({ x, i }) => i > index && reste(x));
  const jouable = devant.find(({ x }) => x.skills.some((id) => !skillState(st, id).mastered && isSkillOpen(st, id)));
  return (jouable || devant[0])?.i ?? null;
}
/** Niveau de départ choisi par les parents (1 à 3) : les niveaux d'avant sont déjà ouverts. */
export const departLevel = (st) => Math.min(3, Math.max(1, Math.round(st.settings?.depart) || 1));
const known = (st, id) => skillState(st, id).sessions > 0 || levelOf(id).id < departLevel(st);

/**
 * Un exercice est ouvert – ou en mode démonstration :
 * · formes et lettres : quand le précédent du niveau a été essayé (on avance pas à pas) ;
 * · sons, mots et phrases : dès que leurs lettres ont été essayées (pas de file d'attente : l'enfant choisit).
 * Les niveaux d'avant le niveau de départ choisi par les parents sont ouverts.
 */
export function isSkillOpen(st, id) {
  if (st.settings.demo) return true;
  const level = levelOf(id);
  if (level.id < departLevel(st)) return true;
  const sk = SKILLS[id];
  if (sk.needs) return sk.needs.every((l) => known(st, l));
  const list = levelSkills(st, level);
  const i = list.indexOf(id);
  // Grande section : les formes de départ sont acquises, on commence directement par les majuscules
  if (sk.capital && st.settings.classe === 'gs' && !SKILLS[list[i - 1]]?.capital) return true;
  // Les chiffres forment leur propre file : le 0 s'ouvre dès que les ronds sont essayés (ou d'emblée en grande section)
  if (sk.chiffre && !SKILLS[list[i - 1]]?.chiffre) return st.settings.classe === 'gs' || known(st, 'ronds');
  return i === 0 || skillState(st, list[i - 1]).sessions > 0;
}
/** Raison pour laquelle un exercice est fermé : 'before' (exercice d'avant) ou 'letters' (lettres du mot). */
export function lockReason(st, id) {
  return SKILLS[id].needs ? 'letters' : 'before';
}
/** Lettres qu'il reste à essayer pour ouvrir un mot. */
export const missingLetters = (st, id) => (SKILLS[id].needs || []).filter((l) => !known(st, l));

/**
 * Parcours conseillé : les formes, puis les lettres une à une, chaque mot arrivant dès que ses lettres sont connues
 * (on écrit des mots très tôt, c'est motivant). Seuls les exercices du niveau de départ et des suivants sont proposés.
 */
export function learningOrder(st) {
  const d = departLevel(st);
  const lv = (n) => LEVELS.find((l) => l.id === n);
  const first = levelSkills(st, lv(1));
  // Niveau 1 : les formes, les majuscules, les chiffres ; chaque mot en capitales arrive dès que ses majuscules sont connues.
  // Grande section : les majuscules d'abord, puis les chiffres (les formes restent disponibles, à la fin).
  const motsMaj = first.filter((id) => SKILLS[id].needs);
  const sans = first.filter((id) => !SKILLS[id].needs);
  const base = st.settings?.classe === 'gs' ? [...sans.filter((id) => SKILLS[id].capital), ...sans.filter((id) => SKILLS[id].chiffre), ...sans.filter((id) => !SKILLS[id].capital && !SKILLS[id].chiffre)] : sans;
  const out = [];
  if (d <= 1) {
    const vues = new Set(), pris = new Set();
    const prendre = () => motsMaj.forEach((w) => { if (!pris.has(w) && SKILLS[w].needs.every((l) => vues.has(l))) { pris.add(w); out.push(w); } });
    for (const id of base) { out.push(id); if (SKILLS[id].capital) { vues.add(id); prendre(); } }
    motsMaj.forEach((w) => { if (!pris.has(w)) out.push(w); });
  }
  const letters = levelSkills(st, lv(2));
  const words = levelSkills(st, lv(3));
  const seen = new Set(d >= 3 ? letters : []);
  const used = new Set();
  const take = () => words.forEach((w) => { if (!used.has(w) && SKILLS[w].needs.every((l) => seen.has(l))) { used.add(w); out.push(w); } });
  if (d >= 3) take();
  else letters.forEach((l) => { out.push(l); seen.add(l); take(); });
  words.forEach((w) => { if (!used.has(w)) out.push(w); });
  return [...out, ...lv(4).skills];
}

export const masteredCount = (st) => orderedSkills(st).filter((id) => skillState(st, id).mastered).length;

export function levelProgress(st, level) {
  const total = level.skills.length;
  const done = level.skills.filter((id) => skillState(st, id).mastered).length;
  const started = level.skills.filter((id) => skillState(st, id).sessions > 0).length;
  return { done, total, started, pct: total ? done / total : 0 };
}

/**
 * Prochain exercice conseillé, d'après les compétences réelles :
 * 1) un exercice à reprendre (progrès fragile) ; 2) le premier exercice commencé mais non acquis ;
 * 3) le premier exercice non commencé et ouvert.
 */
export function recommend(st, now = Date.now()) {
  const order = orderedSkills(st);
  const review = order.find((id) => skillStatus(st, id) === 'review');
  if (review) return { skillId: review, reason: 'review' };
  const prog = order.find((id) => skillStatus(st, id) === 'progress');
  if (prog) return { skillId: prog, reason: 'continue' };
  // Rappel espacé : un exercice acquis depuis quelques jours passe avant la nouveauté, pour fixer le geste.
  const revise = order.find((id) => reviewDue(st, id, now));
  if (revise) return { skillId: revise, reason: 'revise' };
  const fresh = learningOrder(st).find((id) => skillStatus(st, id) === 'new' && isSkillOpen(st, id));
  if (fresh) return { skillId: fresh, reason: st.skills && Object.keys(st.skills).length ? 'next' : 'first' };
  return { skillId: learningOrder(st)[0], reason: 'again' };
}

/** Stade du renard (évolue avec les compétences acquises, pas avec le temps passé). */
export const FOX_STAGES = [
  { min: 0, name: 'Petit renardeau', scale: 0.9 },
  { min: 2, name: 'Renard curieux', scale: 0.95 },
  { min: 5, name: 'Renard explorateur', scale: 1.0 },
  { min: 8, name: 'Renard apprenti', scale: 1.03 },
  { min: 20, name: 'Renard conteur', scale: 1.05 },
  { min: 40, name: 'Renard poète', scale: 1.07 },
  { min: 70, name: 'Grand renard écrivain', scale: 1.09 },
];
export function foxStage(st) {
  const n = masteredCount(st);
  let stage = FOX_STAGES[0], idx = 0;
  FOX_STAGES.forEach((s, i) => { if (n >= s.min) { stage = s; idx = i; } });
  return { ...stage, index: idx, mastered: n };
}

export const unlockedItems = (st) => Object.values(ITEMS).filter((it) => skillState(st, it.skill).mastered).map((it) => it.id);

// ---------- Vignettes d'animaux ----------
// Évaluées à partir de l'état seul (historique des essais, compétences acquises) : le résultat ne dépend
// donc que de ce que l'enfant a réussi, et une vignette méritée avant l'arrivée de la fonction est rattrapée.

/** Un essai raté (≤ 1 étoile) puis, dans la même séance, un essai réussi (≥ 2 étoiles). */
export function persisted(history) {
  let t = null, failed = false;
  for (const e of history) {
    if (e.t !== t) { t = e.t; failed = false; }
    if (e.st <= 1) failed = true;
    else if (failed) return true;
  }
  return false;
}

function stickerEarned(st, sticker) {
  switch (sticker.rule) {
    case 'first': return Object.values(st.skills).some((s) => s.sessions > 0);
    // Persévérer : rater puis réussir dans une séance, ou finir par acquérir un exercice en y revenant (≥ 2 séances).
    case 'persist': return Object.values(st.skills).some((s) => persisted(s.history) || (s.mastered && s.sessions >= 2));
    // Trois étoiles… ou l'exercice acquis : tout enfant qui apprend finit par l'obtenir, même sans jamais décrocher 3 étoiles.
    case 'star3': { const s = skillState(st, sticker.skill); return s.mastered || s.history.some((e) => e.st === 3); }
    case 'level': { const lv = LEVELS.find((l) => l.id === sticker.level); return (lv.core || lv.skills).every((id) => skillState(st, id).mastered); }
    case 'count': return LEVELS.find((l) => l.id === sticker.level).skills.filter((id) => skillState(st, id).mastered).length >= sticker.n;
    case 'paper': return paperCount(st) >= sticker.n;
    // La vignette dorée récompense l'album des exercices ; celles du cahier sont un bonus, jamais une condition.
    case 'all': return STICKERS.every((o) => o === sticker || o.page === 'paper' || st.stickers[o.id]);
    default: return false;
  }
}

/** Colle les vignettes méritées et retourne les nouvelles (dans l'ordre de l'album). Rien ne se retire jamais. */
export function awardStickers(st, now = Date.now()) {
  st.stickers = st.stickers || {};
  const won = [];
  for (const sticker of STICKERS) {
    if (st.stickers[sticker.id] || !stickerEarned(st, sticker)) continue;
    st.stickers[sticker.id] = now;
    won.push(sticker.id);
  }
  return won;
}

export const stickerCount = (st) => Object.keys(st.stickers || {}).length;

const CRIT_LABEL = {
  start: ['le point de départ', 'Rappelez le point vert : c’est là que le geste commence.'],
  direction: ['le sens du tracé', 'Montrez ensemble le sens des flèches, doigt dans l’air, avant de tracer.'],
  shape: ['la forme générale', 'Refaire l’exercice en phase « guide » aide à retenir la forme.'],
  size: ['les proportions', 'Jouer sur la taille : « grand comme le guide », sans dépasser.'],
  lines: ['le respect des lignes', 'Poser le crayon sur la ligne du bas, viser la ligne du haut.'],
  flow: ['la fluidité du geste', 'Tracer lentement, sans lever le doigt, comme si on glissait.'],
};

/**
 * Difficultés : pour chaque exercice pas encore acquis (≥ 3 essais), moyenne de chaque critère sur les 6 derniers essais ;
 * on signale ce qui reste sous 0,7, en citant l'exercice concerné (plus utile à un parent qu'une moyenne globale).
 */
export function difficulties(st, max = 4) {
  const out = [];
  for (const [skillId, s] of Object.entries(st.skills)) {
    if (s.mastered || s.history.length < 3) continue;
    const last = s.history.slice(-6);
    for (const k of CRITERIA) {
      const value = avg(last.map((h) => h.c[k] ?? 1));
      if (value < 0.7) out.push({ skillId, key: k, label: CRIT_LABEL[k][0], advice: CRIT_LABEL[k][1], value, count: last.length });
    }
  }
  return out.sort((a, b) => a.value - b.value).slice(0, max);
}

export function usageDays(st, n = 7, now = Date.now()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const k = dayKey(now - i * 86400000);
    out.push({ key: k, seconds: st.usage[k] || 0, date: new Date(now - i * 86400000) });
  }
  return out;
}

export const todaySeconds = (st, now = Date.now()) => st.usage[dayKey(now)] || 0;
