// Tests des fonctions ajoutées après le premier prototype : mots, consolidation, cahier papier, pauses,
// ordre des lettres, gaucher, sauvegarde et fiches PDF.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../src/core/session.js';
import { SKILLS, LEVELS, isWriting, nbLettres, difficulte, ECRITURE } from '../src/content/skills.js';
import { STICKERS } from '../src/content/stickers.js';
import { FICHES, factsOf } from '../src/content/fiches.js';
import { buildTemplate } from '../src/core/template.js';
import { BOARD } from '../src/core/board.js';
import { HAUTEUR } from '../src/content/skills.js';
import { recognizer } from '../src/engine/recognizer.js';
import { recognizerContext } from '../src/core/tolerance.js';
import { encodeBackup, decodeBackup } from '../src/core/backup.js';
import { Page, A4, toPDF, toSVG, wrapText, textWidth } from '../src/core/pdf.js';
import * as P from '../src/core/progress.js';
import { simulate } from './sim.js';
import { writingSheet, animalSheet } from '../src/ui/sheets.js';
import { DESSINS, DESSINS_TRIES, IDEES_LIBRES, TRAITS, NIVEAUX_DESSIN, tierFor, bounds, partPath, modelGroup, suiteIdees, ideeSuivante } from '../src/content/dessins.js';
import { rankVoices, chooseVoice, voiceLabel, timbres, vitesses } from '../src/core/voices.js';
import * as G from '../src/core/galerie.js';

const ev = (stars) => ({ stars, score: stars / 3, criteria: { start: 1, direction: 1, shape: 1, size: 1, lines: 1, flow: 1 }, tags: [] });
const DAY = 86400000;
const T0 = new Date(2026, 2, 3, 10, 0, 0).getTime(); // 3 mars 2026, 10 h
const mastered = (st, id, now, opts = { demo: true }) => {
  const s = new Session(id, opts);
  for (let i = 0; i < 3; i++) s.submit(ev(3));
  return P.recordSession(st, id, s, now);
};
const tried = (st, id, now = T0) => { const s = new Session(id); s.submit(ev(1)); P.recordSession(st, id, s, now); };

// ---------- Alphabet ----------
test('alphabet : les 26 lettres existent, chacune avec un seul rôle, des phrases d\'aide et un gabarit qui tient sur le cahier', () => {
  const ABC = 'abcdefghijklmnopqrstuvwxyz'.split('');
  assert.deepEqual([...LEVELS[1].skills].sort(), ABC);
  assert.equal(LEVELS[1].sections.flatMap((x) => x.skills).length, 26);
  for (const id of ABC) {
    const sk = SKILLS[id];
    assert.equal(sk.kind, 'letter');
    assert.ok(sk.say.intro && sk.say.how && sk.say.bubble && sk.word, id);
    const t = buildTemplate(sk);
    assert.ok(t.bbox.x0 >= 0.3 && t.bbox.x1 <= t.board.W - 0.3, `${id} : déborde`);
    assert.ok(t.bbox.y0 >= 0.2 && t.bbox.y1 <= t.board.H - 0.2, `${id} : hors du cahier`);
  }
  assert.equal(SKILLS.i.strokes.filter((x) => x.dot).length, 1);
  assert.equal(SKILLS.j.strokes.filter((x) => x.dot).length, 1, 'le j a son point');
  assert.equal(SKILLS.t.strokes.length, 2, 'le t a sa barre');
  assert.equal(SKILLS.x.strokes.length, 2, 'le x : deux traits');
  assert.equal(SKILLS.k.strokes.length, 1, 'le k cursif s\'écrit d\'un seul trait, comme au cahier (hampe, petit enroulé, pont)');
});

// ---------- Niveau 3 : sons, mots, phrases ----------
test('niveau 3 : sons, mots et phrases sont composés de lettres connues, tiennent sur le cahier et posent le point du i juste après le i', () => {
  const all = LEVELS[2].skills;
  assert.ok(all.length >= 150, 'beaucoup de contenu');
  assert.ok(LEVELS[2].available);
  assert.equal(new Set(all).size, all.length, 'pas de doublon');
  assert.equal(LEVELS[2].sections.flatMap((x) => x.skills).length, all.length);
  const kinds = { groupe: 0, phrase: 0, mot: 0 };
  for (const id of all) {
    const sk = SKILLS[id];
    assert.equal(sk.kind, 'word');
    assert.ok(isWriting(sk));
    assert.ok(/^[a-z ]+$/.test(sk.glyph), `${id} : lettres sans accent`);
    assert.ok(sk.needs.every((l) => LEVELS[1].skills.includes(l)), `${id} : lettres connues`);
    kinds[sk.phrase ? 'phrase' : sk.groupe ? 'groupe' : 'mot']++;
    const t = buildTemplate(sk);
    assert.ok(t.bbox.x0 >= 0.3 && t.bbox.x1 <= t.board.W - 0.3, `${id} : déborde (${t.bbox.x0.toFixed(2)}–${t.bbox.x1.toFixed(2)})`);
    assert.ok(t.bbox.y0 >= 0.2 && t.bbox.y1 <= t.board.H - 0.2, `${id} : hors du cahier en hauteur`);
    assert.ok(t.board.W <= 48, `${id} : cahier trop large (${t.board.W})`);
    const dots = t.strokes.filter((s) => s.kind === 'dot');
    const expected = sk.glyph.split('').filter((c) => c === 'i' || c === 'j').length + (sk.phrase ? 1 : 0);
    assert.equal(dots.length, expected, `${id} : points du i, du j et point final`);
    // Le point du i vient juste après le i (pendant l'écriture du mot), pas à la fin : il suit un trait de la même lettre, juste dessous.
    t.strokes.forEach((s, i) => {
      if (s.kind !== 'dot' || (sk.phrase && i === t.strokes.length - 1)) return; // le point final de la phrase reste à la fin
      const prev = t.strokes[i - 1];
      assert.ok(prev && prev.kind !== 'dot', `${id} : le point ${i + 1} suit le trait de sa lettre`);
      const xs = prev.pts.map((q) => q.x);
      assert.ok(s.start.x >= Math.min(...xs) - 0.9 && s.start.x <= Math.max(...xs) + 0.9, `${id} : le point ${i + 1} est au-dessus de sa lettre`);
    });
    if (sk.phrase) assert.equal(t.strokes.at(-1).kind, 'dot', `${id} : le point final est le dernier trait`);
    if (sk.phrase) {
      const last = dots.at(-1), body = t.strokes.filter((s) => s.kind !== 'dot');
      assert.ok(Math.abs(last.start.y - t.frame.baseline) < 0.01, `${id} : le point final repose sur la ligne`);
      assert.ok(last.start.x > Math.max(...body.map((s) => s.bbox.x1)) - 0.5, `${id} : le point final est à la fin`);
    }
  }
  assert.ok(kinds.groupe >= 12 && kinds.phrase >= 30 && kinds.mot >= 100, JSON.stringify(kinds));
});

test('cahier : un mot long agrandit la page en gardant l\'interligne, la ligne d\'écriture reste sur une ligne', () => {
  const small = buildTemplate(SKILLS.mot_il), big = buildTemplate(SKILLS.phr_le_chat_dort);
  assert.equal(small.board.W, 10);
  assert.ok(big.board.W > 25);
  assert.equal(big.board.baseline % 1, 0);
  assert.ok(big.board.H >= big.board.W * 0.7 - 1e-9, 'la page couvre l\'écran (rapport 10:7)');
  assert.equal(big.frame.baseline, big.board.baseline);
  assert.ok(Math.abs(big.bbox.y1 - big.board.baseline) < 0.01, 'le point final est sur la ligne');
});

test('ouverture : une lettre s\'ouvre après la précédente, un mot dès que ses lettres ont été essayées', () => {
  const st = newState();
  assert.equal(P.isSkillOpen(st, 'mot_il'), false);
  tried(st, 'i');
  assert.equal(P.isSkillOpen(st, 'mot_il'), false, 'il manque le l');
  assert.equal(P.lockReason(st, 'mot_il'), 'letters');
  assert.deepEqual(P.missingLetters(st, 'mot_il'), ['l']);
  assert.equal(P.isSkillOpen(st, 'u'), false, 'le u attend les lettres d\'avant');
  assert.equal(P.lockReason(st, 'u'), 'before');
  tried(st, 'o'); tried(st, 'a'); tried(st, 'l'); tried(st, 'e');
  assert.equal(P.isSkillOpen(st, 'mot_il'), true);
  assert.equal(P.isSkillOpen(st, 'mot_aile'), true, 'pas de file d\'attente : tous les mots possibles sont ouverts');
  assert.equal(P.isSkillOpen(st, 'mot_oie'), true);
  assert.equal(P.isSkillOpen(st, 'son_ou'), false, 'le u manque');
  assert.equal(P.isSkillOpen(st, 'u'), true);
  tried(st, 'u');
  assert.equal(P.isSkillOpen(st, 'son_ou'), true);
  assert.equal(P.isSkillOpen(st, 'mot_chat'), false);
  st.settings.demo = true;
  assert.equal(P.isSkillOpen(st, 'phr_le_loup_a_faim'), true, 'mode démonstration');
});

test('parcours conseillé : les mots arrivent dès que leurs lettres sont connues', () => {
  const st = newState();
  const order = P.learningOrder(st);
  assert.equal(new Set(order).size, order.length);
  assert.equal(order.length, LEVELS[0].skills.length + 26 + LEVELS[2].skills.length);
  const pos = (id) => order.indexOf(id);
  assert.ok(pos('mot_il') > pos('l') && pos('mot_il') < pos('u'), '« il » juste après le l et le i, avant les lettres suivantes');
  assert.ok(pos('mot_aile') < pos('t'), 'les premiers mots avant le reste de l\'alphabet');
  for (const id of LEVELS[2].skills) for (const l of SKILLS[id].needs) assert.ok(pos(l) < pos(id), `${id} : après la lettre ${l}`);
  // le conseil suit ce parcours, pas à pas
  const st2 = newState();
  st2.settings.depart = 2; // les formes et les majuscules (niveau 1) sont derrière nous : on suit l'alphabet et les premiers mots
  for (let k = 0; k < 24; k++) {
    const rec = P.recommend(st2, T0 + k * 10);
    assert.equal(rec.skillId, P.learningOrder(st2).find((id) => P.skillStatus(st2, id) === 'new'), `étape ${k}`);
    assert.ok(P.isSkillOpen(st2, rec.skillId), `${rec.skillId} est ouvert`);
    mastered(st2, rec.skillId, T0 + k * 10);
  }
  const done = P.learningOrder(st2).slice(0, 24);
  assert.ok(done.every((id) => SKILLS[id].level >= 2), 'départ au CP : plus de formes ni de majuscules dans le conseil');
  assert.ok(done.some((id) => SKILLS[id].kind === 'word'), 'des sons ou des mots apparaissent avant la fin de l\'alphabet');
  assert.ok(done.indexOf('son_oi') < done.indexOf('e'), 'le son « oi » dès que le o et le i sont connus');
});

test('classe de l\'enfant : un niveau de départ ouvre les niveaux d\'avant et ne conseille que la suite', () => {
  const st = newState();
  assert.equal(P.departLevel(st), 1);
  assert.equal(P.isSkillOpen(st, 'z'), false);
  st.settings.depart = 2;
  assert.equal(P.isSkillOpen(st, 'boucles'), true, 'niveau 1 déjà ouvert');
  assert.equal(P.isSkillOpen(st, 'i'), true);
  assert.equal(P.isSkillOpen(st, 'z'), false, 'au niveau de départ, on avance lettre à lettre');
  assert.equal(P.recommend(st).skillId, 'i', 'le conseil commence au niveau 2');
  st.settings.depart = 3;
  assert.equal(P.isSkillOpen(st, 'z'), true, 'les lettres sont ouvertes');
  assert.equal(P.isSkillOpen(st, 'mot_chat'), true, 'et les mots dont les lettres sont ouvertes aussi');
  assert.equal(P.isSkillOpen(st, 'phr_le_chat_dort'), true);
  assert.equal(P.recommend(st).skillId, P.learningOrder(st)[0]);
  assert.ok(SKILLS[P.recommend(st).skillId].level === 3, 'on propose un son ou un mot');
  st.settings.depart = 9;
  assert.equal(P.departLevel(st), 3, 'valeur bornée');
  assert.equal(P.hydrate({ v: 1, settings: {}, skills: {} }).settings.depart, 1, 'anciennes sauvegardes');
});

test('étapes de la carte : les étapes couvrent le niveau, et un ordre de classe est découpé par paquets', () => {
  const st = newState();
  for (const lv of [LEVELS[1], LEVELS[2]]) {
    const secs = P.levelSections(st, lv);
    assert.deepEqual(secs.flatMap((x) => x.skills), lv.skills);
    assert.ok(secs.every((x) => x.title && x.skills.length >= 5 && x.skills.length <= 14), lv.name);
  }
  assert.deepEqual(P.levelSections(st, LEVELS[0]).flatMap((x) => x.skills), LEVELS[0].skills, 'niveau 1 : les formes, puis les majuscules par familles');
  assert.equal(LEVELS[0].sections.length, 13, 'les formes, cinq familles de majuscules, les chiffres, quatre paliers de mots et deux de phrases en capitales');
  assert.equal(LEVELS[0].sections.flatMap((x) => x.skills).filter((id) => SKILLS[id].capital).length, 26);
  st.settings.order2 = ['z', 'y', ...LEVELS[1].skills.filter((x) => x !== 'z' && x !== 'y').reverse()];
  const secs = P.levelSections(st, LEVELS[1]);
  assert.deepEqual(secs.flatMap((x) => x.skills), P.levelSkills(st, LEVELS[1]));
  assert.deepEqual(secs[0].skills.slice(0, 2), ['z', 'y']);
});

function newState() { return P.newState(); }

// ---------- Gaucher : tolérance de pente ----------
test('gaucher : une pente ordinaire passe pour les deux profils, une pente extrême seulement pour le profil gaucher', () => {
  const seeds = Array.from({ length: 20 }, (_, i) => i + 1);
  const rate = (id, k, main) => {
    const tpl = buildTemplate(SKILLS[id]).strokes[0];
    return seeds.filter((s) => {
      const sim = simulate(tpl, { seed: s, noise: 0.06, drift: 0.12 });
      sim.points = sim.points.map((p) => ({ ...p, x: p.x + k * (p.y - 5) }));
      return recognizer.evaluateStroke(tpl, sim, recognizerContext(SKILLS[id], 2, { main })).stars >= 2;
    }).length / seeds.length;
  };
  for (const main of ['droite', 'gauche']) for (const k of [0, 0.3, -0.3]) assert.ok(rate('l', k, main) >= 0.95, `l, pente ${k}, ${main}`);
  assert.ok(rate('l', 0.8, 'gauche') >= 0.9, 'profil gaucher : écriture très penchée en arrière acceptée');
  assert.ok(rate('l', 0.8, 'droite') <= 0.4, 'profil droitier : pas aussi large');
  // Le réglage n'est jamais appliqué sans modèle ni alignement (phase 0 : on suit le guide)
  assert.equal(recognizerContext(SKILLS.l, 0, { main: 'gauche' }).slant, null);
});

// ---------- Consolidation (révision espacée) ----------
test('consolidation : acquis, puis réussi de mémoire à des jours espacés, devient « consolidé »', () => {
  const st = newState();
  assert.ok(mastered(st, 'o', T0).newlyMastered);
  assert.equal(P.isConsolidated(st, 'o'), false);
  assert.equal(P.reviewDue(st, 'o', T0 + DAY), false, 'le lendemain : trop tôt');
  assert.equal(P.reviewDue(st, 'o', T0 + 3 * DAY), true, 'après deux jours : rappel conseillé');
  assert.equal(P.startPhaseFor(st, 'o', T0 + 3600e3), 0, 'le jour même : on recommence normalement');
  assert.equal(P.startPhaseFor(st, 'o', T0 + DAY), 2, 'un autre jour : rappel express, directement « tout seul »');
  assert.equal(P.startPhaseFor(st, 'i', T0 + DAY), 0, 'un exercice non acquis ne saute rien');

  assert.equal(mastered(st, 'o', T0 + 5000).consolidated, false);
  assert.equal(st.skills.o.reviews, undefined, 'le même jour ne compte pas');
  assert.equal(mastered(st, 'o', T0 + 2 * DAY).consolidated, false);
  assert.equal(st.skills.o.reviews.length, 1);
  assert.equal(mastered(st, 'o', T0 + 3 * DAY).consolidated, false, 'un seul jour d\'écart avec le rappel précédent : pas compté');
  const r = mastered(st, 'o', T0 + 4 * DAY);
  assert.equal(r.consolidated, true);
  assert.ok(P.isConsolidated(st, 'o'));
  assert.equal(P.reviewDue(st, 'o', T0 + 20 * DAY), false);
  assert.equal(mastered(st, 'o', T0 + 9 * DAY).consolidated, false, 'ne se déclare qu\'une fois');
});

test('consolidation : le rappel express (départ en phase 3) suffit à confirmer l\'acquis, une aide l\'annule', () => {
  const st = newState();
  mastered(st, 'a', T0);
  const s = new Session('a', { demo: true, startPhase: 2 });
  assert.equal(s.phase, 2);
  s.submit(ev(3));
  assert.ok(s.done && s.mastered);
  assert.equal(P.recordSession(st, 'a', s, T0 + 2 * DAY).newlyMastered, false);
  assert.equal(st.skills.a.reviews.length, 1);
  const helped = new Session('a', { demo: true, startPhase: 2 });
  helped.rewatch(); helped.submit(ev(3));
  assert.equal(helped.mastered, false, 'modèle revu : pas de confirmation');
  P.recordSession(st, 'a', helped, T0 + 5 * DAY);
  assert.equal(st.skills.a.reviews.length, 1);
});

test('recommandation : un rappel espacé passe avant la nouveauté', () => {
  const st = newState();
  LEVELS[0].skills.forEach((id, i) => mastered(st, id, T0 + i));
  assert.equal(P.recommend(st, T0 + 1000).reason, 'next', 'le jour même : on avance');
  const r = P.recommend(st, T0 + 3 * DAY);
  assert.equal(r.reason, 'revise');
  assert.equal(r.skillId, 'lignes');
});

// ---------- Cahier (papier) ----------
test('cahier : « J\'ai essayé » est compté, jamais vérifié ; l\'adulte peut confirmer ; deux vignettes bonus', () => {
  const st = newState();
  assert.equal(P.paperCount(st), 0);
  P.markPaper(st, 'i', T0);
  P.markPaper(st, 'i', T0 + 1);
  assert.equal(P.paperState(st, 'i').n, 2);
  assert.equal(P.paperCount(st), 1, 'on compte les exercices essayés, pas les répétitions');
  assert.equal(st.skills.i.sessions, 0, 'le papier ne compte pas comme une séance à l\'écran');
  assert.equal(P.skillStatus(st, 'i'), 'new', 'ni comme une maîtrise');
  assert.deepEqual(P.awardStickers(st, T0), ['escargot']);
  P.markPaper(st, 'o'); P.markPaper(st, 'a');
  assert.deepEqual(P.awardStickers(st, T0), ['coccinelle']);
  assert.equal(P.confirmPaper(st, 'i', T0), true);
  assert.equal(P.paperState(st, 'i').seen, T0);
  assert.equal(P.confirmPaper(st, 'e', T0), false, 'rien à confirmer');
});

// ---------- Pauses ----------
const minutes = (st, n, from) => { for (let i = 0; i < n * 12; i++) P.addUsage(st, 5, from + i * 5000); return from + n * 60000; };

test('pauses : l\'activité continue se cumule, une absence de 5 minutes compte comme une pause', () => {
  const st = newState();
  let t = minutes(st, 14, T0);
  assert.equal(P.breakDue(st, t), false);
  t = minutes(st, 1, t);
  assert.equal(P.activeSince(st), 900);
  assert.equal(P.breakDue(st, t), true, 'après 15 minutes');
  P.takeBreak(st);
  assert.equal(P.breakDue(st, t), false);
  t = minutes(st, 10, t);
  P.addUsage(st, 5, t + 6 * 60000);
  assert.equal(P.activeSince(st), 5, 'six minutes d\'absence : on repart de zéro');
  st.settings.pauseMin = 0;
  minutes(st, 40, t + 10 * 60000);
  assert.equal(P.breakDue(st, t + 60 * 60000), false, 'pauses désactivées');
});

test('pauses : pause douce = le renard dort quelques minutes, puis tout repart', () => {
  const st = newState();
  st.settings.pauseMode = 'douce'; st.settings.pauseLen = 3;
  let t = minutes(st, 15, T0);
  assert.equal(P.breakDue(st, t), true);
  assert.equal(P.blocked(st, t), null);
  P.beginSleep(st, t);
  assert.equal(P.blocked(st, t + 60000), 'sleep');
  assert.equal(P.sleepRemaining(st, t + 60000), 120000);
  assert.equal(P.blocked(st, t + 181000), null);
  assert.equal(P.breakDue(st, t + 181000), false, 'le compteur est reparti de zéro');
  st.settings.pauseMode = 'suggestion';
  assert.equal(P.blocked(st, t + 60000), null, 'en mode suggestion, rien ne bloque jamais');
});

test('pauses : limite du jour, levée par un adulte pour la journée seulement', () => {
  const st = newState();
  st.settings.pauseMode = 'limite'; st.settings.limiteMin = 20;
  let t = minutes(st, 19, T0);
  assert.equal(P.dailyLimitReached(st, t), false);
  t = minutes(st, 2, t);
  assert.equal(P.dailyLimitReached(st, t), true);
  assert.equal(P.blocked(st, t), 'limit');
  P.overrideLimit(st, t);
  assert.equal(P.blocked(st, t), null);
  assert.equal(P.dailyLimitReached(st, t + 2 * 3600e3), false, 'levée pour toute la journée');
  const tomorrow = T0 + DAY;
  assert.equal(P.blocked(st, tomorrow), null, 'un nouveau jour repart de zéro');
  minutes(st, 21, tomorrow);
  assert.equal(P.blocked(st, tomorrow + 22 * 60000), 'limit', 'et la limite s\'applique de nouveau');
});

// ---------- Ordre des lettres ----------
test('ordre des lettres : les parents suivent l\'ordre de la classe ; un ordre incohérent est ignoré, un ordre partiel est complété', () => {
  const st = newState();
  const lv = LEVELS[1];
  const ABC = lv.skills;
  assert.deepEqual(P.levelSkills(st, lv).slice(0, 5), ['i', 'o', 'a', 'l', 'e']);
  st.settings.order2 = ['a', 'e', 'i', 'l', 'o', ...ABC.filter((x) => !'aeilo'.includes(x))];
  assert.deepEqual(P.levelSkills(st, lv).slice(0, 5), ['a', 'e', 'i', 'l', 'o']);
  assert.equal(P.levelSkills(st, lv).length, 26);
  assert.deepEqual(P.orderedSkills(st).slice(LEVELS[0].skills.length, LEVELS[0].skills.length + 5), ['a', 'e', 'i', 'l', 'o']);
  assert.equal(P.isSkillOpen(st, 'a'), true, 'première lettre de l\'ordre choisi');
  assert.equal(P.isSkillOpen(st, 'i'), false);
  tried(st, 'a'); tried(st, 'e');
  assert.equal(P.isSkillOpen(st, 'i'), true);
  st.settings.order2 = ['a', 'a', 'i', 'l', 'o'];
  assert.deepEqual(P.levelSkills(st, lv), ABC, 'doublon : ordre d\'origine');
  st.settings.order2 = ['a', 'e'];
  assert.deepEqual(P.levelSkills(st, lv).slice(0, 3), ['a', 'e', 'i'], 'ordre partiel (ancienne sauvegarde) : complété avec les autres lettres');
  assert.equal(new Set(P.levelSkills(st, lv)).size, 26);
  st.settings.order2 = ['a', 'e', 'chou'];
  assert.deepEqual(P.levelSkills(st, lv), ABC, 'lettre inconnue : ordre d\'origine');
  assert.deepEqual(P.levelSkills(st, LEVELS[0]), LEVELS[0].skills, 'les autres niveaux ne bougent pas');
});

// ---------- Anciennes sauvegardes ----------
test('un état enregistré par une version plus ancienne reste lisible', () => {
  const old = { v: 1, name: 'Léo', created: 1, settings: { voix: false, sons: true, souple: true, demo: false }, skills: { lignes: { sessions: 2, attempts: 5, phase: 2, mastered: true, masteredAt: T0, last: T0, history: [] } }, usage: {}, equipped: [], seen: {}, stickers: {} };
  const st = P.hydrate(old);
  assert.equal(st.settings.voix, false);
  assert.equal(st.settings.souple, true);
  assert.equal(st.settings.main, 'droite');
  assert.equal(st.settings.pauseMin, 15);
  assert.deepEqual(st.fiches, {});
  assert.ok(st.rest && st.rest.since === 0);
  assert.doesNotThrow(() => { P.recommend(st, T0 + 5 * DAY); P.awardStickers(st); P.breakDue(st); P.blocked(st); });
});

// ---------- Sauvegarde ----------
test('sauvegarde : le code se relit à l\'identique, et les mauvais codes sont refusés avec un message clair', async () => {
  const st = newState();
  st.name = 'Léa — « test »';
  mastered(st, 'lignes', T0); mastered(st, 'ronds', T0 + 1);
  P.markPaper(st, 'i', T0); P.awardStickers(st, T0);
  st.settings.main = 'gauche'; st.settings.order2 = ['a', 'e', 'i', 'l', 'o'];
  const code = await encodeBackup(st, 42);
  assert.match(code, /^RENARD1:[A-Za-z0-9+/=]+$/);
  assert.ok(code.length < JSON.stringify(st).length, 'le code est compressé');
  const back = await decodeBackup(code);
  assert.deepEqual(back, P.hydrate(JSON.parse(JSON.stringify(st))));
  assert.equal(back.settings.main, 'gauche');
  assert.deepEqual(await decodeBackup(`  ${code.slice(0, 60)}\n${code.slice(60)}  `), back, 'retours à la ligne et espaces tolérés');

  await assert.rejects(decodeBackup('bonjour'), /pas un code de sauvegarde/);
  await assert.rejects(decodeBackup(''), /pas un code de sauvegarde/);
  await assert.rejects(decodeBackup(code.slice(0, 40)), /incomplet|abîmé/);
  await assert.rejects(decodeBackup('RENARD1:@@@'), /incomplet|abîmé/);
  const other = `RENARD0:${Buffer.from(JSON.stringify({ app: 'autre', v: 1, state: { v: 1, skills: {} } })).toString('base64')}`;
  await assert.rejects(decodeBackup(other), /ne vient pas de Renard/);
  const future = `RENARD0:${Buffer.from(JSON.stringify({ app: 'renard', v: 9, state: { v: 9, skills: {} } })).toString('base64')}`;
  await assert.rejects(decodeBackup(future), /ne vient pas de Renard|trop différente/);
  const plain = `RENARD0:${Buffer.from(JSON.stringify({ app: 'renard', v: 1, state: st })).toString('base64')}`;
  assert.deepEqual(await decodeBackup(plain), back, 'code non compressé');
});

// ---------- Fiches animaux ----------
test('fiches animaux : chaque vignette a ses faits et un défi pour bouger', () => {
  for (const s of STICKERS) {
    if (s.rule === 'all') continue; // le renard doré n'a pas de fiche
    const f = FICHES[s.animal];
    assert.ok(f, `fiche manquante : ${s.animal}`);
    assert.ok(f.more.length >= 2 && f.move, s.animal);
    for (const t of factsOf(s)) assert.ok(t.length > 20 && t.length < 130 && /[.!?]$/.test(t), `${s.animal} : « ${t} »`);
  }
});

// ---------- PDF et fiches imprimables ----------
test('pdf : structure valide (table des références juste, pages, texte accentué)', async () => {
  const page = new Page();
  page.text('Écris le « é » — œuf', 20, 30, { size: 14, bold: true });
  page.line(10, 10, 100, 10, { color: '#B7A5E2', w: 0.3 });
  page.circle(50, 50, 4, { fill: '#E8791C' });
  page.svg('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>', 20, 60, 30, 30);
  const bytes = await toPDF([page, new Page()], { title: 'Essai', raster: async () => ({ w: 2, h: 2, rgb: new Uint8Array(12).fill(200) }) });
  const txt = Buffer.from(bytes).toString('latin1');
  assert.ok(txt.startsWith('%PDF-1.4') && txt.trimEnd().endsWith('%%EOF'));
  assert.match(txt, /\/Count 2/);
  const at = +/startxref\n(\d+)/.exec(txt)[1];
  assert.equal(txt.slice(at, at + 4), 'xref');
  const size = +/\/Size (\d+)/.exec(txt)[1];
  const table = txt.slice(at).split('\n').slice(3, 3 + size - 1);
  table.forEach((line, i) => {
    const off = +line.slice(0, 10);
    assert.equal(txt.slice(off, off + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`, `objet ${i + 1}`);
  });
  assert.match(txt, /\/Subtype \/Image/);
  assert.ok(textWidth('Bonjour', 12) > 10 && textWidth('Bonjour', 12) < 30);
  assert.ok(wrapText('un deux trois quatre cinq six sept huit neuf dix', 30, 12).length > 1);
});

test('fiches : chaque exercice et chaque animal donne une page A4 qui ne déborde pas', () => {
  const inside = (page, id) => {
    for (const o of page.ops) {
      const xs = o.t === 'poly' ? o.pts.map((p) => p[0]) : o.t === 'text' ? (o.align === 'right' ? [o.x] : [o.x]) : [o.x, o.x + (o.w || 0)];
      const ys = o.t === 'poly' ? o.pts.map((p) => p[1]) : [o.y, o.y + (o.h || 0)];
      for (const x of xs) assert.ok(x >= -0.5 && x <= A4.w + 0.5, `${id} : x=${x} (${o.t})`);
      for (const y of ys) assert.ok(y >= -0.5 && y <= A4.h + 0.5, `${id} : y=${y} (${o.t})`);
    }
  };
  for (const id of Object.keys(SKILLS)) for (const reglure of [2, 2.5, 3]) for (const lefty of [false, true]) {
    const page = writingSheet(id, { reglure, name: 'Léa', lefty });
    inside(page, `${id}/${reglure}`);
    assert.ok(page.ops.length > 150, `${id} : fiche presque vide`);
    assert.ok(toSVG(page).startsWith('<svg'));
  }
  for (const s of STICKERS) {
    const page = animalSheet(s.id, { reglure: 3, name: '' });
    inside(page, s.id);
    assert.ok(page.ops.some((o) => o.t === 'svg'), `${s.id} : dessin de l'animal`);
  }
});

test('fiches : la fiche de gaucher donne le conseil de placement de la feuille adapté', () => {
  const said = (lefty) => writingSheet('o', { lefty }).ops.filter((o) => o.t === 'text').map((o) => o.str).join(' ');
  assert.match(said(true), /vers la droite/);
  assert.match(said(false), /vers la gauche/);
});

// ---------- Voix du renard ----------
const V = (name, lang, localService = true) => ({ name, lang, localService });

test('voix : on choisit une voix qui reste sur l\'appareil, la plus naturelle d\'abord', () => {
  const list = [
    V('Google français', 'fr-FR', false),
    V('Thomas', 'fr-FR'),
    V('Amélie (Premium)', 'fr-FR'),
    V('Amélie', 'fr-CA'),
    V('Samantha', 'en-US'),
  ];
  const r = rankVoices(list);
  assert.deepEqual(r.map((d) => d.name), ['Amélie (Premium)', 'Thomas', 'Amélie', 'Google français'], 'les voix non françaises sont écartées, les voix en ligne passent en dernier');
  const c = chooseVoice(list);
  assert.equal(c.name, 'Amélie (Premium)');
  assert.equal(c.reason, 'auto');
  assert.equal(c.local, true);
});

test('voix : une voix en ligne n\'est jamais prise automatiquement s\'il existe une voix locale, même moins bien notée', () => {
  const c = chooseVoice([V('Microsoft Denise Online (Natural) - French (France)', 'fr-FR', false), V('Pico fr', 'fr-FR')]);
  assert.equal(c.name, 'Pico fr');
  assert.equal(c.local, true);
});

test('voix : sans voix locale, on prend la meilleure voix en ligne plutôt que le silence, et on le signale', () => {
  const c = chooseVoice([V('Google français', 'fr-FR', false)]);
  assert.equal(c.name, 'Google français');
  assert.equal(c.reason, 'enligne');
  assert.equal(c.local, false);
  assert.equal(chooseVoice([V('Samantha', 'en-US')]), null);
  assert.equal(chooseVoice([]), null);
});

test('voix : le choix des parents l\'emporte, et un nom inconnu retombe sur le mode automatique', () => {
  const list = [V('Amélie (Premium)', 'fr-FR'), V('Thomas', 'fr-FR'), V('Google français', 'fr-FR', false)];
  assert.equal(chooseVoice(list, 'Thomas').reason, 'choix');
  assert.equal(chooseVoice(list, 'Thomas').name, 'Thomas');
  assert.equal(chooseVoice(list, 'Google français').local, false, 'choix volontaire d\'une voix en ligne');
  assert.equal(chooseVoice(list, 'Voix disparue').name, 'Amélie (Premium)');
});

test('voix : les voix robotiques (eSpeak, compactes) passent après les autres voix françaises', () => {
  const r = rankVoices([V('eSpeak French', 'fr-FR'), V('Marie', 'fr-FR'), V('Thomas (Compact)', 'fr-FR')]);
  assert.equal(r[0].name, 'Marie');
  assert.ok(voiceLabel(r[0]).includes('sur l’appareil'));
  assert.ok(voiceLabel({ name: 'X', lang: 'fr-FR', local: false }).includes('en ligne'));
});

test('voix : les réglages par défaut sont naturels (hauteur non modifiée) et les anciennes sauvegardes les reçoivent', () => {
  const st = P.hydrate({ v: 1, name: '', settings: { voix: true }, skills: {} });
  assert.equal(st.settings.voixNom, '');
  assert.equal(timbres[st.settings.voixTimbre], 1.0);
  assert.equal(vitesses[st.settings.voixVitesse], 0.92);
  assert.ok(timbres.renard > timbres.naturel && vitesses.lent < vitesses.normal && vitesses.normal < vitesses.vif);
});

// ---------- Alignement sur les lignes du cahier ----------
test('cahier : sommets et creux des formes du niveau 1 tombent exactement sur les lignes', () => {
  const near = (v, tol) => Math.abs(v - Math.round(v)) <= tol;
  for (const id of LEVELS[0].core) {
    const t = buildTemplate(SKILLS[id]);
    assert.ok(near(t.bbox.y0, 0.01) && near(t.bbox.y1, 0.01), `${id} : y ${t.bbox.y0.toFixed(3)} → ${t.bbox.y1.toFixed(3)} doit tomber sur des lignes`);
    assert.equal(Math.round(t.bbox.y1), BOARD.baseline, `${id} repose sur la ligne d'écriture`);
  }
  // hauteurs voulues : ponts et vagues = 2 interlignes (jusqu'à la ligne du haut des petites lettres), boucles et pluie = 3
  const h = (id) => { const b = buildTemplate(SKILLS[id]).bbox; return Math.round(b.y1 - b.y0); };
  assert.deepEqual(['ponts', 'vagues', 'boucles', 'lignes', 'ronds'].map(h), [2, 2, 3, 3, 3]);
});

test('cahier : lettres et mots sont calés sur les lignes (pied sur la ligne d\'écriture, hauteurs de 2 ou 3 interlignes, point du i sur la ligne de 3)', () => {
  const bodyOf = (id) => {
    const t = buildTemplate(SKILLS[id]);
    const body = t.strokes.filter((s) => s.kind !== 'dot');
    return { base: t.board.baseline, y0: Math.min(...body.map((s) => s.bbox.y0)), y1: Math.max(...body.map((s) => s.bbox.y1)), dots: t.strokes.filter((s) => s.kind === 'dot') };
  };
  const DESC = 'fgjpqy'; // les jambages descendent sous la ligne
  for (const [id, h] of Object.entries(HAUTEUR)) {
    const b = bodyOf(id);
    assert.ok(Math.abs(b.y1 - b.base) <= 0.04, `${id} : le pied doit toucher la ligne d'écriture (${b.y1.toFixed(3)})`);
    assert.ok(Math.abs(b.y0 - (b.base - h)) <= 0.04, `${id} : le haut doit toucher la ligne de ${h} interlignes (${b.y0.toFixed(3)})`);
  }
  for (const id of DESC) {
    const b = bodyOf(id);
    assert.ok(b.y1 - b.base >= 1.4 && b.y1 - b.base <= 2.0, `${id} : le jambage descend de ${(b.y1 - b.base).toFixed(2)} interlignes`);
    const top = id === 'f' ? 3 : 2;
    assert.ok(Math.abs(b.y0 - (b.base - top)) <= 0.04, `${id} : le haut touche la ligne de ${top} (${(b.base - b.y0).toFixed(3)})`);
  }
  const bi = bodyOf('i');
  assert.ok(Math.abs(bi.dots[0].start.y - (bi.base - 3)) < 0.001, 'le point du i est sur la ligne de 3 interlignes');
  const bj = bodyOf('j');
  assert.ok(Math.abs(bj.dots[0].start.y - (bj.base - 3)) < 0.001, 'le point du j aussi');
  // les mots héritent du calage : leur plus grande lettre touche la ligne voulue, les jambages passent sous la ligne
  for (const id of LEVELS[2].skills) {
    const sk = SKILLS[id], b = bodyOf(id);
    const letters = sk.needs;
    // à l'école : b f h k l montent à la 3e ligne, d et t à la « 2e ligne » (2,5 interlignes), les autres à 2
    const top = letters.some((l) => 'bfhkl'.includes(l)) ? 3 : letters.some((l) => 'dt'.includes(l)) ? 2.5 : 2;
    const desc = letters.some((l) => (DESC + 'z').includes(l)); // le z cursif descend aussi sous la ligne
    assert.ok(desc ? b.y1 - b.base > 1.3 : Math.abs(b.y1 - b.base) <= 0.04, `${id} : pied ${(b.y1 - b.base).toFixed(3)}`);
    assert.ok(Math.abs(b.y0 - (b.base - top)) <= 0.04, `${id} : haut ${(b.base - b.y0).toFixed(3)}`);
  }
});

test('séance : un parcours complet demande trois réussites par défaut, et l\'enfant qui hésite n\'est jamais bloqué', () => {
  const st = newState();
  assert.equal(st.settings.reps, 1);
  assert.equal(P.hydrate({ v: 1, settings: {}, skills: {} }).settings.reps, 1, 'anciennes sauvegardes');
  const s = new Session('vagues');
  const res = [s.submit(ev(3)), s.submit(ev(1)), s.submit(ev(2)), s.submit(ev(3))].map((r) => r.action);
  assert.deepEqual(res, ['phase', 'again', 'phase', 'done']);
  assert.ok(s.mastered && s.tries === 4);
});

// ---------- Dessin libre : modèles à reproduire ----------
test('dessin libre : chaque modèle est complet, tient sur la feuille et utilise les couleurs de la palette', () => {
  assert.ok(DESSINS.length >= 10 && IDEES_LIBRES.length >= 1);
  assert.equal(new Set(DESSINS.map((d) => d.id)).size, DESSINS.length, 'identifiants uniques');
  assert.equal(new Set(DESSINS.map((d) => d.phrase)).size, DESSINS.length, 'phrases uniques');
  for (const d of DESSINS) {
    assert.ok(d.parts.length >= 2, `${d.id} : au moins deux éléments`);
    for (const p of d.parts) {
      assert.ok(TRAITS[p.c], `${d.id} : couleur inconnue ${p.c}`);
      assert.ok(partPath(p).startsWith('M'), `${d.id} : chemin invalide`);
      assert.ok(!/NaN|undefined/.test(partPath(p)), `${d.id} : coordonnées invalides`);
    }
    const b = bounds(d);
    assert.ok(b.x0 >= 0.3 && b.y0 >= 0.3 && b.x1 <= 9.7 && b.y1 <= 6.7, `${d.id} sort de la feuille : ${JSON.stringify(b)}`);
    assert.ok(b.x1 - b.x0 >= 2.5 && b.y1 - b.y0 >= 2.5, `${d.id} trop petit pour être suivi du doigt`);
    assert.equal((modelGroup(d).match(/<path /g) || []).length, d.parts.length);
    assert.ok(modelGroup(d, { dotted: true }).includes('stroke-dasharray'), 'calque en pointillés');
  }
});

test('dessin libre : trois niveaux de difficulté, qui s\'ouvrent avec la progression, et des modèles « à Renard »', () => {
  for (const t of [1, 2, 3]) assert.ok(DESSINS.filter((d) => d.tier === t).length >= 3, `niveau ${t} : au moins trois modèles`);
  assert.ok(DESSINS.every((d) => [1, 2, 3].includes(d.tier) && NIVEAUX_DESSIN[d.tier]));
  // plus un dessin est difficile, plus il a de pièces en moyenne
  const moy = (t) => { const l = DESSINS.filter((d) => d.tier === t); return l.reduce((a, d) => a + d.parts.length, 0) / l.length; };
  assert.ok(moy(1) < moy(2) && moy(2) < moy(3), `${moy(1)} < ${moy(2)} < ${moy(3)}`);
  assert.deepEqual([0, 2, 3, 6, 7, 20].map((n) => tierFor(n)), [1, 1, 2, 2, 3, 3]);
  assert.equal(tierFor(0, true), 3, 'mode démonstration : tout est ouvert');
  for (const id of ['maison-renard', 'voiture', 'bateau', 'cerf-volant']) {
    const d = DESSINS.find((x) => x.id === id);
    assert.ok(d && /Renard/.test(d.phrase) && d.ask && /Renard/.test(d.ask), id);
  }
  // l'enfant qui débute ne voit que les modèles faciles
  assert.ok(DESSINS.filter((d) => d.tier <= tierFor(0)).every((d) => d.tier === 1));
});

test('dessin libre : les modèles se suivent du plus simple au plus compliqué, puis les idées libres, puis on recommence', () => {
  assert.equal(DESSINS_TRIES.length, DESSINS.length);
  const cle = (m) => m.tier * 100 + m.parts.length;
  for (let i = 1; i < DESSINS_TRIES.length; i++) assert.ok(cle(DESSINS_TRIES[i - 1]) <= cle(DESSINS_TRIES[i]), `${DESSINS_TRIES[i - 1].id} avant ${DESSINS_TRIES[i].id}`);
  // le débutant n'a que les modèles faciles, dans l'ordre, puis les idées libres
  const facile = suiteIdees(1);
  assert.deepEqual(facile.slice(0, -IDEES_LIBRES.length).map((x) => x.model.id), DESSINS_TRIES.filter((m) => m.tier === 1).map((m) => m.id));
  assert.deepEqual(facile.slice(-IDEES_LIBRES.length).map((x) => x.phrase), IDEES_LIBRES);
  assert.ok(facile.slice(-IDEES_LIBRES.length).every((x) => !x.model), 'les idées libres n\'ont pas de modèle');
  // « Autre idée » : on avance dans l'ordre, sans jamais tirer au hasard, et on boucle
  let vu = '';
  const vus = [];
  for (let i = 0; i < facile.length + 1; i++) { const x = ideeSuivante(1, vu); vus.push(x.phrase); vu = x.phrase; }
  assert.deepEqual(vus.slice(0, facile.length), facile.map((x) => x.phrase), 'dans l\'ordre');
  assert.equal(vus[facile.length], facile[0].phrase, 'au bout, on recommence par le plus simple');
  assert.equal(ideeSuivante(1, '').model.id, DESSINS_TRIES[0].id, 'sans rien de vu : le plus simple');
  assert.equal(ideeSuivante(1, 'une idée inconnue').phrase, facile[0].phrase, 'idée inconnue : on repart du début');
  // on rouvre l'écran là où l'enfant s'était arrêté ; quand la progression ouvre un niveau, la suite s'allonge
  const deuxieme = ideeSuivante(1, '');
  assert.equal(ideeSuivante(1, deuxieme.phrase, { reprendre: true }).phrase, deuxieme.phrase);
  const toutes = suiteIdees(3);
  assert.equal(toutes.length, DESSINS.length + IDEES_LIBRES.length);
  assert.equal(toutes[0].model.id, DESSINS_TRIES[0].id);
  assert.equal(toutes[DESSINS.length - 1].model.id, DESSINS_TRIES[DESSINS.length - 1].id, 'le plus compliqué en dernier des modèles');
  assert.ok(suiteIdees(2).length > suiteIdees(1).length && suiteIdees(3).length > suiteIdees(2).length);
});

test('progression : la dernière idée de dessin montrée est mémorisée (vide au départ)', () => {
  const st = newState();
  assert.equal(st.settings.dessinVu, '');
});

// ---- Séries : une série est une partie d'un niveau ; on la fête une fois, puis on propose la suivante
test('séries : terminée quand tous ses exercices sont acquis, fêtée une seule fois', () => {
  const st = P.newState();
  const lv = LEVELS[2];
  const secs = P.levelSections(st, lv);
  const prem = secs[0];
  assert.equal(prem.id, 'premiers');
  assert.equal(P.serieTerminee(st, prem), false);
  assert.equal(P.serieAFeter(st), null);
  const [dernier, ...avant] = [...prem.skills].reverse();
  for (const id of avant) mastered(st, id, T0);
  assert.equal(P.serieTerminee(st, prem), false, 'il manque un exercice');
  const r = mastered(st, dernier, T0 + 1000);
  assert.ok(r.newlyMastered);
  assert.equal(P.noterSerie(st, dernier, T0 + 1000), '3:premiers', 'la dernière réussite termine la série');
  assert.equal(P.noterSerie(st, dernier, T0 + 2000), '', 'pas deux fois');
  assert.deepEqual(st.series['3:premiers'], { t: T0 + 1000, vu: false });
  const fete = P.serieAFeter(st, 3);
  assert.deepEqual([fete.level.id, fete.index, fete.key], [3, 0, '3:premiers']);
  assert.equal(P.serieAFeter(st, 1), null, 'seulement dans le niveau demandé');
  assert.equal(P.serieAFeter(st).key, '3:premiers');
  P.serieVue(st, lv, 0);
  assert.equal(P.serieAFeter(st), null, 'une fois vue, plus de fête');
  assert.equal(st.series['3:premiers'].t, T0 + 1000, 'la date de fin est gardée');
});

test('séries : un exercice d\'une autre série, ou déjà acquis avant, ne déclenche rien', () => {
  const st = P.newState();
  const prem = P.levelSections(st, LEVELS[2])[0];
  for (const id of prem.skills) mastered(st, id, T0); // série terminée sans passer par noterSerie (ancienne sauvegarde)
  assert.equal(P.noterSerie(st, 'mot_chat', T0), '', 'un exercice non acquis d\'une autre série : rien');
  assert.deepEqual(st.series, {}, 'pas de fête rétroactive tant qu\'on ne note pas');
  assert.equal(P.serieAFeter(st), null);
  // une fausse fête (série plus complète) n'est pas montrée
  st.series['3:premiers'] = { t: 1, vu: false };
  st.skills[prem.skills[0]].mastered = false;
  assert.equal(P.serieAFeter(st), null, 'une série qui n\'est plus finie ne se fête pas');
});

test('séries : la série suivante est la prochaine où il reste quelque chose à apprendre et à jouer', () => {
  const st = P.newState();
  st.settings.demo = true; // tout est ouvert
  const lv = LEVELS[2];
  const secs = P.levelSections(st, lv);
  assert.equal(P.serieSuivante(st, lv, 0), 1);
  for (const id of secs[1].skills) mastered(st, id, T0);
  assert.equal(P.serieSuivante(st, lv, 0), 2, 'une série déjà finie est sautée');
  assert.equal(P.serieSuivante(st, lv, secs.length - 1), null, 'rien après la dernière');
  // plus rien devant : la fin
  for (const x of secs.slice(1)) for (const id of x.skills) mastered(st, id, T0);
  assert.equal(P.serieSuivante(st, lv, 0), null);
  assert.equal(P.niveauTermine(st, lv), false, 'la première série n\'est pas finie');
  for (const id of secs[0].skills) mastered(st, id, T0);
  assert.equal(P.niveauTermine(st, lv), true);
});

test('séries : à défaut de série jouable, la prochaine série non finie ; les séries sont comptées par niveau', () => {
  const st = P.newState(); // pas de démonstration : les mots attendent leurs lettres
  const lv = LEVELS[2];
  st.settings.depart = 1;
  assert.equal(P.serieSuivante(st, lv, 0), 1, 'même fermée, la suivante est proposée');
  assert.deepEqual(P.seriesDuNiveau(st, LEVELS[0]), { total: LEVELS[0].sections.length, done: 0 });
  assert.deepEqual(P.seriesDuNiveau(st, LEVELS[3]), { total: 0, done: 0 }, 'un niveau sans séries n\'en annonce pas');
  assert.ok(P.seriesDuNiveau(st, LEVELS[0]).total >= 10 && P.seriesDuNiveau(st, LEVELS[1]).total === 5 && P.seriesDuNiveau(st, LEVELS[2]).total >= 10);
  const prem = P.levelSections(st, LEVELS[2])[0];
  for (const id of prem.skills) mastered(st, id, T0);
  assert.equal(P.seriesDuNiveau(st, LEVELS[2]).done, 1);
});

test('séries : l\'état neuf et une ancienne sauvegarde ont de quoi suivre les séries', async () => {
  const st = P.newState();
  assert.deepEqual(st.series, {});
  assert.deepEqual(st.seen, {});
  assert.equal(st.settings.serieAuto, true, 'l\'enchaînement automatique est actif au départ');
  const vieux = { ...P.newState(), v: P.STATE_VERSION };
  delete vieux.series; delete vieux.seen;
  const h = P.hydrate(vieux);
  delete vieux.settings.serieAuto;
  assert.equal(P.hydrate(vieux).settings.serieAuto, true, 'une ancienne sauvegarde reçoit le réglage par défaut');
  assert.deepEqual(h.series, {});
  assert.deepEqual(h.seen, {});
  assert.equal(P.serieAFeter(h), null);
  // la sauvegarde par code garde les séries fêtées
  h.series['1:formes'] = { t: 5, vu: true };
  assert.deepEqual((await decodeBackup(await encodeBackup(h))).series, { '1:formes': { t: 5, vu: true } });
});

test('séries : les phrases du renard sont complètes et sans prénom', async () => {
  const { feteSerie, feteNiveau, introSeries, FETE_SUITE, FETE_SUITE_NIVEAU, FETE_SUITE_CARTE } = await import('../src/content/series.js');
  assert.equal(feteSerie('Mes premiers mots'), 'Bravo ! Tu as fini la série « Mes premiers mots » !');
  assert.match(feteNiveau('Les écrivains en herbe'), /tout le niveau « Les écrivains en herbe »/);
  assert.match(introSeries(18), /18 séries/);
  for (const t of [FETE_SUITE, FETE_SUITE_NIVEAU, FETE_SUITE_CARTE, introSeries(5)]) assert.match(t, /[.!?]$/);
  // tous les niveaux ouverts ont des séries aux titres uniques (la fête les nomme)
  for (const lv of LEVELS.filter((l) => l.available)) {
    const titres = lv.sections.map((x) => x.title);
    assert.equal(new Set(titres).size, titres.length, `niveau ${lv.id} : titres de séries uniques`);
    assert.equal(new Set(lv.sections.map((x) => x.id)).size, lv.sections.length, `niveau ${lv.id} : identifiants de séries uniques`);
  }
});

// ---- Papier : l'adulte qui a regardé le cahier note comment cela s'est passé
test('papier : « à retravailler » remet l\'exercice dans les « à reprendre » jusqu\'à ce que l\'enfant le rejoue', () => {
  const st = P.newState();
  mastered(st, 'i', T0);
  assert.equal(P.avisPapier(st, 'i', 'facile', T0), false, 'pas d\'avis sans essai sur papier');
  P.markPaper(st, 'i', T0 + 1000);
  assert.equal(P.skillStatus(st, 'i'), 'mastered');
  assert.equal(P.avisPapier(st, 'i', 'n\'importe quoi', T0 + 2000), false, 'avis inconnu refusé');
  assert.equal(P.avisPapier(st, 'i', 'aide', T0 + 2000), true);
  assert.equal(P.skillStatus(st, 'i'), 'mastered', '« avec de l\'aide » ne change rien au statut');
  assert.equal(st.skills.i.paper.avis, 'aide');
  assert.ok(st.skills.i.paper.seen, 'donner son avis, c\'est avoir regardé');
  assert.equal(P.avisPapier(st, 'i', 'encore', T0 + 3000), true);
  assert.equal(P.skillStatus(st, 'i'), 'review', 'à retravailler');
  assert.equal(P.recommend(st, T0 + 4000).skillId, 'i');
  assert.equal(P.recommend(st, T0 + 4000).reason, 'review');
  assert.equal(P.startPhaseFor(st, 'i', T0 + 3 * DAY), 0, 'on repart du guide, pas du rappel express');
  // l'enfant rejoue l'exercice : l'avis ne pèse plus
  mastered(st, 'i', T0 + 5000);
  assert.equal(P.skillStatus(st, 'i'), 'mastered');
  assert.equal(P.startPhaseFor(st, 'i', T0 + 3 * DAY), 2);
  assert.equal(st.skills.i.paper.avis, 'encore', 'l\'avis est gardé pour les parents');
});

// ---- Galerie du renard : dessins accrochés par l'enfant (réglage parents, désactivé par défaut)
const trait = (n = 60, c = '#E5392F', w = 0.22) => ({ c, w, pts: Array.from({ length: n }, (_, i) => ({ x: 1 + i * (8 / (n - 1)), y: 3.5 + Math.sin(i / 6) * 0.01 })) });
const stOn = () => { const st = P.newState(); st.settings.galerie = true; return st; };

test('galerie : désactivée par défaut, donc rien n\'est conservé tant que les parents ne l\'ouvrent pas', () => {
  const st = P.newState();
  assert.equal(st.settings.galerie, false);
  const r = G.hang(st, { strokes: [trait()] });
  assert.equal(r.entry, null);
  assert.equal(G.galleryCount(st), 0);
  assert.deepEqual(st.galerie, []);
});

test('galerie : on accroche, on met à jour, on retire, et le plus ancien est remplacé au-delà du maximum', () => {
  const st = stOn();
  const a = G.hang(st, { strokes: [trait()], title: 'La maison de Renard', model: 'maison-renard', now: 1000 }).entry;
  assert.ok(a && a.s.length === 1 && a.title === 'La maison de Renard');
  const up = G.hang(st, { strokes: [trait(), trait(30, '#4E9A63')], replaceId: a.id, title: 'La maison de Renard', now: 2000 });
  assert.ok(up.replaced && st.galerie.length === 1 && st.galerie[0].s.length === 2, 'même dessin mis à jour, pas de doublon');
  assert.equal(st.galerie[0].t, 1000, 'la date de départ est conservée');
  for (let i = 0; i < G.MAX_DESSINS + 3; i++) G.hang(st, { strokes: [trait()], title: `n°${i}`, now: 3000 + i });
  assert.equal(st.galerie.length, G.MAX_DESSINS);
  assert.ok(st.galerie.every((e) => e.title !== 'La maison de Renard'), 'le plus ancien a été remplacé');
  assert.equal(G.drawings(st)[0].title, `n°${G.MAX_DESSINS + 2}`, 'les plus récents d\'abord');
  assert.ok(G.unhang(st, st.galerie[0].id));
  assert.equal(st.galerie.length, G.MAX_DESSINS - 1);
  G.clearGallery(st);
  assert.equal(G.galleryCount(st), 0);
  assert.equal(G.hang(st, { strokes: [] }).entry, null, 'feuille vide : rien à accrocher');
});

test('galerie : les traits sont allégés sans changer le dessin, et le tout reste petit', () => {
  const pts = trait(600).pts.map((p, i) => ({ x: p.x, y: 3.5 + Math.sin(i / 6) * 0.004 })); // trait presque droit, avec un tremblement invisible
  const s = G.simplify(pts, 0.012);
  assert.ok(s.length <= 3 && s[0] === pts[0] && s.at(-1) === pts.at(-1), `points gardés : ${s.length}`);
  const wave = Array.from({ length: 300 }, (_, i) => ({ x: i / 30, y: 3.5 + Math.sin(i / 10) })); // une vraie courbe garde sa forme
  const sw = G.simplify(wave, 0.012);
  assert.ok(sw.length > 20 && sw.length < 150, `courbe : ${sw.length} points`);
  const [c] = G.compactStrokes([{ c: '#E5392F', w: 0.22, pts }]);
  assert.ok(c.d.length < 400 && c.d.startsWith('M '), c.d.length);
  const dot = G.compactStrokes([{ c: '#E5392F', w: 0.22, pts: [{ x: 5, y: 3 }] }])[0];
  assert.match(dot.d, /^M 5 3 l 0\.001 0$/, 'un simple point reste un point');
  // un dessin chargé (30 traits de 400 points) tient largement sur la tablette
  const st = stOn();
  const big = Array.from({ length: 30 }, (_, k) => ({ c: '#4A8FD6', w: 0.1, pts: Array.from({ length: 400 }, (_, i) => ({ x: 5 + 4 * Math.cos(i / 20 + k), y: 3.5 + 3 * Math.sin(i / 17 + k) })) }));
  G.hang(st, { strokes: big });
  assert.ok(JSON.stringify(st.galerie).length < 60000, JSON.stringify(st.galerie).length);
});

test('galerie : les données relues sont vérifiées (rien d\'inattendu n\'arrive dans la page)', () => {
  const st = stOn();
  G.hang(st, { strokes: [trait()], title: 'Mon dessin' });
  const bon = st.galerie[0];
  assert.ok(G.validDrawing(bon));
  assert.ok(!G.validDrawing({ ...bon, s: [{ c: 'red', w: 0.2, d: 'M 0 0' }] }), 'couleur non hexadécimale');
  assert.ok(!G.validDrawing({ ...bon, s: [{ c: '#E5392F', w: 0.2, d: 'M 0 0" onload="x' }] }), 'chemin avec autre chose que des nombres');
  assert.ok(!G.validDrawing({ ...bon, s: [] }) && !G.validDrawing(null) && !G.validDrawing({ id: 3 }));
  const h = P.hydrate({ ...P.newState(), settings: { ...P.newState().settings, galerie: true }, galerie: [bon, { id: 'x', t: 1, s: [{ c: '<script>', w: 1, d: 'M' }] }, 'n\'importe quoi'] });
  assert.equal(h.galerie.length, 1, 'les entrées abîmées sont ignorées');
  assert.deepEqual(P.hydrate({ v: 1, skills: {} }).galerie, [], 'ancienne sauvegarde sans galerie');
  assert.equal(P.hydrate({ v: 1, skills: {} }).settings.galerie, false);
  const svg = G.drawingSVG({ ...bon, title: '<b>"x"</b>' });
  assert.ok(svg.includes('<path') && !svg.includes('<b>') && !/aria-label="[^"]*"[^>]*"x"/.test(svg));
  assert.equal(G.titleFor('la maison de Renard'), 'La maison de Renard');
  assert.equal(G.titleFor('ton animal préféré'), 'Mon animal préféré');
  assert.equal(G.titleFor('ta famille'), 'Ma famille');
  assert.equal(G.titleFor(''), 'Mon dessin');
});

test('galerie : le code de sauvegarde ne contient jamais les dessins', async () => {
  const st = stOn();
  st.name = 'Léa';
  G.hang(st, { strokes: [trait()], title: 'Mon dessin' });
  const code = await encodeBackup(st);
  const back = await decodeBackup(code);
  assert.deepEqual(back.galerie, []);
  assert.equal(back.name, 'Léa');
  assert.equal(back.settings.galerie, true, 'le réglage, lui, suit la sauvegarde');
  assert.equal(st.galerie.length, 1, 'l\'état d\'origine n\'est pas modifié');
});

// ---------- Tableau libre ----------
import * as T from '../src/core/tableau.js';
test('tableau libre : le texte est nettoyé (a–z sans accent), le calque tient sur la page et la page s\'agrandit pour un texte long', () => {
  assert.equal(T.clean('  Léa-Rose Œuf '), 'lea rose oeuf ');
  assert.equal(T.clean('ÉLÈVE ça va 123'), 'eleve ca va 123', 'les chiffres sont gardés');
  assert.equal(T.clean('Léa : 6 ans !!'), 'lea 6 ans ');
  assert.equal(T.clean(''), '');
  assert.equal(T.clean('x'.repeat(100)).length, T.TABLEAU.maxLen);
  const a = T.calque('il');
  assert.ok(a.strokes.length >= 3 && a.width > 2);
  assert.equal(a.strokes.filter((s) => s.kind === 'dot').length, 1, 'le point du i');
  assert.ok(Math.abs(a.bbox.x0 - T.TABLEAU.margin) < 1e-9, 'calque aligné à gauche');
  assert.equal(T.page(a.width).W, 18);
  const long = T.calque('le chat dort');
  assert.ok(T.fits('le chat dort'));
  const pg = T.page(long.width);
  assert.ok(pg.W > 18 && pg.W >= long.width + 2 * T.TABLEAU.margin, 'la page s\'agrandit');
  assert.ok(pg.H >= pg.W * 0.7 - 1e-9 && pg.rows.length >= 3 && pg.rows[0] === T.TABLEAU.rows[0]);
  assert.equal(T.fits('abcdefghijklmnopqrstuvwxyz'), false, 'un texte trop long est refusé');
  assert.equal(T.calque('   ').strokes.length, 0);
  assert.equal(T.calque('chat', 8.2).strokes.every((s) => s.d.length > 0), true);
  const st = P.newState();
  assert.equal(T.suggestions(st).prenom, '');
  st.name = 'Léa'; tried(st, 'i'); tried(st, 'l'); tried(st, 'mot_il');
  const sg = T.suggestions(st);
  assert.equal(sg.prenom, 'lea');
  assert.deepEqual(sg.mots, ['il']);
  st.name = 'Jean-Baptiste-Alexandre-Maximilien';
  assert.equal(T.suggestions(st).prenom, '', 'un prénom trop long pour la page n\'est pas proposé');
});

// ---------- Les majuscules, avant le CP ----------
test('majuscules : 26 exercices dans le niveau 1, par familles, droits et posés sur la ligne d\'écriture', () => {
  const caps = Object.values(SKILLS).filter((s) => s.capital);
  assert.equal(caps.length, 26);
  assert.equal(caps.map((s) => s.glyph).sort().join(''), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  for (const sk of caps) {
    assert.equal(sk.level, 1, sk.id);
    assert.ok(LEVELS[0].skills.includes(sk.id), `${sk.id} est au niveau 1`);
    assert.ok(sk.say.intro && sk.say.how && sk.say.bubble, `${sk.id} : consignes`);
    assert.ok(sk.say.intro.includes(`Le ${sk.glyph} majuscule`), sk.id);
    const t = buildTemplate(SKILLS[sk.id]);
    // la lettre tient dans le cahier : sommet à 3 interlignes, pied sur la ligne (la queue du Q et le crochet du J descendent un peu)
    assert.ok(Math.abs((BOARD.baseline - t.bbox.y0) - 3) < 0.05, `${sk.id} : sommet à 3 interlignes (${(BOARD.baseline - t.bbox.y0).toFixed(2)})`);
    assert.ok(t.bbox.y1 >= BOARD.baseline - 0.05 && t.bbox.y1 <= BOARD.baseline + 0.5, `${sk.id} : pied sur la ligne (${(t.bbox.y1 - BOARD.baseline).toFixed(2)})`);
    assert.ok(t.bbox.w < 3.2, `${sk.id} : largeur raisonnable (${t.bbox.w.toFixed(2)})`);
  }
  const I = buildTemplate(SKILLS.maj_I).strokes[0];
  assert.ok(I.bbox.w < 0.01, 'le I est une barre bien verticale (pas penchée comme l\'écriture cursive)');
  const sections = LEVELS[0].sections.slice(1, 6); // les cinq familles de majuscules (les chiffres viennent après)
  assert.deepEqual(sections.map((x) => x.skills.length), [6, 6, 5, 5, 4]);
  assert.ok(sections.every((x) => x.title && x.skills.every((id) => SKILLS[id].section === x.id)));
});

test('majuscules : on avance pas à pas ; la grande section commence directement par les majuscules', () => {
  const st = newState();
  assert.equal(P.isSkillOpen(st, 'maj_I'), false, 'pas avant d\'avoir essayé les formes');
  tried(st, 'lignes'); tried(st, 'ronds'); tried(st, 'ponts'); tried(st, 'vagues'); tried(st, 'boucles');
  assert.equal(P.isSkillOpen(st, 'maj_I'), true);
  assert.equal(P.isSkillOpen(st, 'maj_L'), false, 'une à la fois');

  const gs = newState();
  gs.settings.classe = 'gs';
  assert.equal(P.isSkillOpen(gs, 'maj_I'), true, 'grande section : les formes sont derrière nous');
  assert.equal(P.isSkillOpen(gs, 'maj_L'), false);
  assert.equal(P.recommend(gs).skillId, 'maj_I', 'on conseille d\'abord les majuscules');
  assert.deepEqual(P.learningOrder(gs).filter((id) => SKILLS[id].capital).slice(0, 6), ['maj_I', 'maj_L', 'maj_T', 'maj_E', 'maj_F', 'maj_H']);
  assert.deepEqual(P.learningOrder(gs).slice(0, 3), ['maj_I', 'maj_L', 'mm_IL'], 'le premier mot arrive dès que ses deux majuscules sont connues');
  tried(gs, 'maj_I');
  assert.equal(P.isSkillOpen(gs, 'maj_L'), true);

  const ms = newState();
  ms.settings.classe = 'ms';
  assert.equal(P.recommend(ms).skillId, 'lignes', 'moyenne section : on commence par les formes');
});

test('majuscules : l\'étape du hibou ne demande que les formes de départ ; au CP, les majuscules sont déjà ouvertes', () => {
  const st = newState();
  LEVELS[0].core.forEach((id, i) => mastered(st, id, T0 + i));
  P.awardStickers(st);
  assert.ok(st.stickers.hibou, 'les cinq formes suffisent au hibou');
  const cp = newState();
  cp.settings.depart = 2;
  assert.equal(P.isSkillOpen(cp, 'maj_Z'), true);
  assert.ok(!P.learningOrder(cp).some((id) => SKILLS[id].level === 1), 'plus de formes ni de majuscules dans le conseil au CP');
});

test('première ouverture : la classe règle le niveau de départ', () => {
  assert.equal(P.CLASSES.length, 4);
  const st = newState();
  assert.equal(st.settings.classe, '');
  assert.equal(st.settings.accueilFait, false);
  for (const [id, depart] of [['ms', 1], ['gs', 1], ['cp1', 2], ['cp2', 3]]) {
    P.setClasse(st, id);
    assert.equal(st.settings.classe, id);
    assert.equal(st.settings.depart, depart, id);
  }
  P.setClasse(st, 'nimporte');
  assert.equal(st.settings.classe, 'cp2', 'une classe inconnue ne change rien');
  assert.equal(P.classeLabel('gs'), 'Grande section');
  assert.equal(P.needsWelcome(newState()), true, 'tablette neuve : on se présente');
  const used = newState(); tried(used, 'lignes');
  assert.equal(P.needsWelcome(used), false, 'une tablette déjà utilisée ne redemande rien');
  const done = newState(); done.settings.accueilFait = true;
  assert.equal(P.needsWelcome(done), false);
  assert.equal(P.cleanName('  léa  '), 'Léa');
  assert.equal(P.cleanName('jean-pierre'), 'Jean-Pierre');
  assert.equal(P.cleanName('<b>Zoé</b>'), 'Bzoéb', 'les caractères étranges disparaissent');
  assert.equal(P.cleanName('x'.repeat(40)).length, 14, 'quatorze lettres au plus');
  assert.equal(P.cleanName('123'), '');
});

// ---------- Les chiffres, avant le CP ----------
test('chiffres : 0 à 9 dans le niveau 1, droits, du haut vers le bas (le 1 part de sa pointe), posés sur la ligne d\'écriture', () => {
  const sec = LEVELS[0].sections.find((x) => x.id === 'chiffres');
  assert.deepEqual(sec.skills, [...'0123456789'].map((d) => `chf_${d}`));
  assert.ok(LEVELS[0].skills.includes('chf_9'));
  for (const id of sec.skills) {
    const sk = SKILLS[id], D = sk.glyph;
    assert.equal(sk.level, 1); assert.equal(sk.kind, 'letter'); assert.ok(isWriting(sk)); assert.equal(sk.slant, 0, `${id} : droit`);
    assert.ok(sk.say.intro.includes('Le chiffre') && sk.say.how && sk.say.bubble, `${id} : consignes`);
    const t = buildTemplate(sk);
    assert.ok(Math.abs(t.bbox.y0 - (t.frame.baseline - 3)) < 0.35 && Math.abs(t.bbox.y1 - t.frame.baseline) < 0.5, `${id} : hauteur de 3 interlignes (${(t.frame.baseline - t.bbox.y0).toFixed(2)})`);
    assert.ok(t.bbox.x0 >= 0.3 && t.bbox.x1 <= t.board.W - 0.3, `${id} : tient sur le cahier`);
    const first = t.strokes[0].start;
    if (D !== '1') assert.ok(first.y < t.frame.baseline - 2.6 + 0.5, `${id} : on part du haut`);
    else assert.ok(first.y > t.frame.baseline - 2.2, '1 : on part de la petite pointe, plus bas');
    assert.ok(ECRITURE[D] && ECRITURE[D].upright, `${id} : le tableau libre sait écrire « ${D} »`);
  }
  // une seule levée de crayon pour presque tous ; le 4 et le 5 en font deux
  const traits = (D) => SKILLS[`chf_${D}`].strokes.length;
  assert.deepEqual([...'0123456789'].map(traits), [1, 1, 1, 1, 2, 2, 1, 1, 1, 1]);
});

test('chiffres : une file à part, ouverte dès que les ronds sont essayés (d\'emblée en grande section), pas à pas ensuite', () => {
  const st = newState();
  assert.equal(P.isSkillOpen(st, 'chf_0'), false, 'pas avant les ronds');
  tried(st, 'ronds');
  assert.equal(P.isSkillOpen(st, 'chf_0'), true);
  assert.equal(P.isSkillOpen(st, 'chf_1'), false, 'un à la fois');
  tried(st, 'chf_0');
  assert.equal(P.isSkillOpen(st, 'chf_1'), true);
  const gs = newState(); gs.settings.classe = 'gs'; gs.settings.depart = 1;
  assert.equal(P.isSkillOpen(gs, 'chf_0'), true, 'grande section : les chiffres sont proposés d\'emblée');
  const ordre = P.learningOrder(gs);
  assert.ok(ordre.indexOf('maj_Z') < ordre.indexOf('chf_0') && ordre.indexOf('chf_9') < ordre.indexOf('lignes'), 'majuscules, puis chiffres, puis les formes');
  const cp = newState(); cp.settings.depart = 2;
  assert.equal(P.isSkillOpen(cp, 'chf_9'), true, 'au CP : le niveau 1 est derrière nous');
});

test('tableau libre : les chiffres s\'écrivent aussi (un âge, un numéro), droits à côté des lettres', async () => {
  const T = await import('../src/core/tableau.js');
  assert.equal(T.clean('Léa a 6 ans !').trim(), 'lea a 6 ans');
  assert.equal(T.cased('lea 6', 'maj'), 'LEA 6');
  const c = T.calque('lea 6', undefined, 'debut');
  assert.equal(c.text, 'Lea 6');
  assert.ok(c.width > 0 && c.strokes.length >= 4, 'une lettre ou un chiffre par trait au moins');
  assert.ok(T.fits('lea 6', 'min'));
});

// ---------- L'échelle des mots et des phrases, du plus simple au plus difficile ----------
test('échelle : mots puis phrases, de plus en plus longs, et à longueur égale de plus en plus difficiles', () => {
  const sections = LEVELS[2].sections;
  const echelle = (prefixe) => sections.filter((x) => x.id.startsWith(prefixe));
  const mots = echelle('mots_p'), phrases = echelle('phr_p');
  assert.equal(mots.length, 7); assert.equal(phrases.length, 4);
  assert.deepEqual(sections.slice(-11).map((x) => x.id), [...mots, ...phrases].map((x) => x.id), 'l\'échelle est à la fin du niveau 3 : d\'abord les mots, puis les phrases');
  for (const groupe of [mots, phrases]) {
    const textes = groupe.flatMap((x) => x.skills.map((id) => SKILLS[id].glyph));
    for (let i = 1; i < textes.length; i++) {
      const a = textes[i - 1], b = textes[i];
      assert.ok(nbLettres(a) < nbLettres(b) || (nbLettres(a) === nbLettres(b) && difficulte(a) <= difficulte(b)), `« ${a} » (${nbLettres(a)}/${difficulte(a)}) doit précéder « ${b} » (${nbLettres(b)}/${difficulte(b)})`);
    }
    let precedent = 0;
    for (const sec of groupe) { // les paliers se suivent sans se chevaucher
      const longueurs = sec.skills.map((id) => nbLettres(SKILLS[id].glyph));
      assert.ok(sec.skills.length >= 4, `${sec.id} : assez d'exercices`);
      assert.ok(Math.min(...longueurs) > precedent && Math.max(...longueurs) <= sec.max, `${sec.id} : de ${Math.min(...longueurs)} à ${Math.max(...longueurs)} lettres (limite ${precedent + 1}–${sec.max})`);
      precedent = sec.max;
    }
  }
  assert.ok(phrases.flatMap((x) => x.skills).every((id) => SKILLS[id].phrase), 'que des phrases à la fin');
  assert.ok(mots.flatMap((x) => x.skills).every((id) => !SKILLS[id].phrase && !SKILLS[id].groupe), 'que des mots dans l\'échelle des mots');
  const tous = LEVELS[2].skills.map((id) => SKILLS[id].glyph);
  assert.equal(new Set(tous).size, tous.length, 'aucun texte en double dans le niveau 3');
});

test('échelle : les mots difficiles s\'ouvrent quand leurs lettres sont connues, les lettres rares comptent', () => {
  assert.ok(difficulte('zoo') > difficulte('mot') - 1 && difficulte('kiwi') > difficulte('lune'), 'k, w, x, y, z pèsent plus que i, o, a, l, e');
  const st = newState();
  assert.equal(P.isSkillOpen(st, 'mot_zoo'), false);
  for (const l of 'zo') tried(st, l);
  assert.equal(P.isSkillOpen(st, 'mot_zoo'), true);
  assert.equal(P.isSkillOpen(st, 'mot_kiwi'), false, 'le k et le w ne sont pas encore connus');
});

// ---------- Des mots et des phrases en capitales, à la fin du niveau 1 ----------
test('niveau 1 : des mots puis des phrases en capitales, du plus simple au plus difficile, à la suite des chiffres', () => {
  const ids = LEVELS[0].sections.map((x) => x.id);
  assert.deepEqual(ids.slice(-6), ['mm_p1', 'mm_p2', 'mm_p3', 'mm_p4', 'mp_p1', 'mp_p2'], 'après les majuscules et les chiffres');
  assert.ok(ids.indexOf('chiffres') < ids.indexOf('mm_p1'));
  const secs = LEVELS[0].sections.filter((x) => /^m[mp]_/.test(x.id));
  for (const pre of ['mm_', 'mp_']) {
    const textes = secs.filter((x) => x.id.startsWith(pre)).flatMap((x) => x.skills.map((id) => SKILLS[id].glyph));
    assert.ok(textes.length >= 14, `${pre} : assez d'exercices`);
    for (let i = 1; i < textes.length; i++) assert.ok(nbLettres(textes[i - 1]) <= nbLettres(textes[i]), `« ${textes[i - 1]} » avant « ${textes[i]} »`);
  }
  const tous = secs.flatMap((x) => x.skills);
  assert.equal(new Set(tous).size, tous.length, 'aucun identifiant en double');
  for (const id of tous) {
    const sk = SKILLS[id];
    assert.ok(sk.kind === 'word' && sk.level === 1 && sk.majMot && !sk.capital, id);
    assert.ok(/^[A-Z ]+$/.test(sk.glyph), `${id} : écrit en capitales`);
    assert.ok(sk.needs.length > 0 && sk.needs.every((n) => SKILLS[n]?.capital), `${id} : dépend de majuscules existantes`);
    assert.ok(sk.strokes.length >= sk.glyph.replace(/ /g, '').length, `${id} : un trait au moins par lettre`);
    assert.ok(sk.say.intro && sk.say.how && sk.say.bubble, `${id} : consignes`);
  }
  assert.ok(secs.filter((x) => x.id.startsWith('mp_')).flatMap((x) => x.skills).every((id) => SKILLS[id].phrase && SKILLS[id].strokes.some((st) => st.dot)), 'les phrases ont leur point final');
  assert.ok(LEVELS[0].skills.includes('mm_IL') && LEVELS[0].skills.includes('mp_TU_LIS'));
});

test('capitales : un mot s\'ouvre dès que ses majuscules sont essayées (et dans l\'ordre conseillé, juste après)', () => {
  const st = newState();
  assert.equal(P.isSkillOpen(st, 'mm_IL'), false);
  assert.equal(P.lockReason(st, 'mm_IL'), 'letters');
  assert.deepEqual(P.missingLetters(st, 'mm_IL'), ['maj_I', 'maj_L']);
  const gs = newState();
  gs.settings.classe = 'gs';
  tried(gs, 'maj_I');
  assert.equal(P.isSkillOpen(gs, 'mm_IL'), false, 'il manque le L');
  tried(gs, 'maj_L');
  assert.equal(P.isSkillOpen(gs, 'mm_IL'), true);
  assert.equal(P.isSkillOpen(gs, 'mm_LIT'), false, 'il manque le T');
  const ordre = P.learningOrder(gs);
  assert.ok(ordre.indexOf('mm_IL') === ordre.indexOf('maj_L') + 1, 'le mot suit sa dernière majuscule');
  assert.ok(ordre.indexOf('mm_LIT') === ordre.indexOf('maj_T') + 1 || ordre.indexOf('mm_LIT') === ordre.indexOf('maj_T') + 2);
  assert.equal(new Set(ordre).size, ordre.length, 'aucun exercice proposé deux fois');
  assert.equal(ordre.length, LEVELS[0].skills.length + 26 + LEVELS[2].skills.length, 'tous les exercices du niveau 1, des lettres et des mots du niveau 3');
  const ms = newState();
  ms.settings.classe = 'ms';
  const ordreMs = P.learningOrder(ms);
  assert.ok(ordreMs.indexOf('mm_IL') > ordreMs.indexOf('maj_L') && ordreMs.indexOf('maj_I') > ordreMs.indexOf('boucles'), 'moyenne section : les formes, puis les majuscules, et le mot dès que ses lettres sont connues');
  const apresCp = newState();
  apresCp.settings.depart = 2;
  assert.ok(!P.learningOrder(apresCp).includes('mm_IL'), 'au CP on ne propose plus le niveau 1');
  assert.equal(P.isSkillOpen(apresCp, 'mm_IL'), true, 'mais il reste ouvert');
});

test('capitales : les mots sont droits sur la feuille et le Tableau propose le même texte en minuscules', () => {
  const tpl = buildTemplate(SKILLS.mm_IL);
  const [i, l] = tpl.strokes;
  assert.ok(Math.abs(i.start.x - i.end.x) < 0.02, 'le I est vertical (pas incliné comme une cursive)');
  assert.ok(Math.abs(l.start.x - l.pts[Math.floor(l.pts.length / 2)].x) < 0.02, 'la tige du L aussi');
  assert.ok(tpl.bbox.w > 2.5 && tpl.bbox.w < 3.2 && tpl.bbox.h > 2.9 && tpl.bbox.h < 3.1, `taille d'un IL : ${tpl.bbox.w.toFixed(1)} × ${tpl.bbox.h.toFixed(1)} (trois interlignes de haut)`);
  const long = buildTemplate(SKILLS.mp_TU_AS_FAIM);
  assert.ok(long.board.W > BOARD.W, 'une phrase en capitales agrandit la page');
  const st = newState();
  st.skills.mm_LUNE = { sessions: 1 }; st.skills.mot_lune = { sessions: 1 };
  const sug = T.suggestions(st, 'min');
  assert.deepEqual(sug.mots.filter((w) => w === 'lune' || w === 'LUNE'), ['lune'], 'un seul « lune », en minuscules');
});

// ---------- Épaisseur du trait ----------
import * as E from '../src/core/epaisseur.js';

test('épaisseur : par défaut, le trait est plus fin à mesure que le niveau monte', () => {
  const st = P.newState();
  const f = (id) => E.epaisseur(st, SKILLS[id]);
  const l1 = f('lignes'), l2 = f('i'), l3 = f(LEVELS[2].skills.find((id) => SKILLS[id].kind === 'word'));
  assert.ok(l1.ink > l2.ink && l2.ink > l3.ink, `${l1.ink} > ${l2.ink} > ${l3.ink}`);
  assert.equal(l2.ink, 1, 'le niveau 2 garde l’épaisseur d’origine');
  assert.ok(E.PAR_NIVEAU[3] > E.PAR_NIVEAU[4]);
  assert.equal(st.settings.trait, 'auto');
  assert.equal(st.settings.traitAide, true);
});

test('épaisseur : un réglage fixé par les parents vaut pour tous les niveaux', () => {
  const st = P.newState();
  st.settings.trait = 'fin';
  assert.equal(E.epaisseur(st, SKILLS.lignes).ink, E.epaisseur(st, SKILLS.i).ink);
  const fin = E.epaisseur(st, SKILLS.i).ink;
  st.settings.trait = 'moyen'; const moyen = E.epaisseur(st, SKILLS.i).ink;
  st.settings.trait = 'epais'; const epais = E.epaisseur(st, SKILLS.i).ink;
  assert.ok(fin < moyen && moyen < epais);
});

test('épaisseur : le chemin d’un mot ne dépasse jamais sa largeur d’origine, celui d’une lettre reste borné', () => {
  const st = P.newState();
  st.settings.trait = 'epais';
  const mot = SKILLS[LEVELS[2].skills.find((id) => SKILLS[id].kind === 'word')];
  const e = E.epaisseur(st, mot, [{ stars: 0 }, { stars: 0 }, { stars: 0 }, { stars: 0 }, { stars: 0 }]);
  assert.equal(e.route, 1);
  assert.ok(e.ink > 1 && e.ink <= E.MAX_EPAISSEUR);
  assert.ok(E.epaisseur(st, SKILLS.i).route <= 1.05, 'une minuscule cursive garde ses boucles ouvertes');
  const aidee = E.epaisseur(st, SKILLS.i, Array.from({ length: 9 }, () => ({ stars: 0 })));
  assert.ok(aidee.route > 1.05 && aidee.route <= 1.05 + 0.08 * E.MAX_CRANS + 1e-9, 'l’aide élargit un peu le chemin d’une minuscule');
  assert.ok(E.epaisseur(st, SKILLS.maj_E, [{ stars: 0 }, { stars: 0 }]).route <= 1.2);
  assert.equal(E.epaisseur(P.newState(), SKILLS.maj_E).route, 1.2);
});

test('épaisseur : l’aide s’active après des essais ratés, par cran, et se coupe', () => {
  const st = P.newState();
  const log = (n) => Array.from({ length: n }, () => ({ stars: 1 }));
  const base = E.epaisseur(st, SKILLS.i).ink;
  assert.equal(E.epaisseur(st, SKILLS.i, log(1)).crans, 0);
  assert.equal(E.epaisseur(st, SKILLS.i, log(2)).crans, 1);
  assert.equal(E.epaisseur(st, SKILLS.i, log(5)).crans, 2);
  assert.ok(Math.abs(E.epaisseur(st, SKILLS.i, log(2)).ink - base * E.CRAN) < 0.002);
  assert.ok(E.epaisseur(st, SKILLS.i, log(9)).ink > E.epaisseur(st, SKILLS.i, log(2)).ink);
  // les réussites ne comptent pas
  assert.equal(E.epaisseur(st, SKILLS.i, [{ stars: 3 }, { stars: 2 }, { stars: 3 }]).crans, 0);
  // l'historique des séances précédentes compte aussi : un exercice difficile démarre déjà plus épais
  st.skills.i = { sessions: 2, attempts: 4, phase: 0, mastered: false, history: [{ sc: 0.2 }, { sc: 0.3 }, { sc: 0.4 }, { sc: 0.5 }] };
  assert.equal(E.epaisseur(st, SKILLS.i).crans, 1);
  assert.equal(E.epaisseur(st, SKILLS.i, log(9)).crans, E.MAX_CRANS, 'deux crans au plus');
  // un exercice acquis ne compte plus comme difficile
  st.skills.i.mastered = true;
  assert.equal(E.epaisseur(st, SKILLS.i).crans, 0);
  st.skills.i.mastered = false;
  st.settings.traitAide = false;
  assert.equal(E.epaisseur(st, SKILLS.i, log(9)).crans, 0, 'aide coupée par les parents');
});

test('épaisseur : un ancien enregistrement reçoit les réglages par défaut', () => {
  const old = P.newState();
  delete old.settings.trait; delete old.settings.traitAide;
  const st = P.hydrate(JSON.parse(JSON.stringify(old)));
  assert.equal(st.settings.trait, 'auto');
  assert.equal(st.settings.traitAide, true);
});

// ---------- Le point du i pendant l'écriture, et les étapes du tableau (retour du 8 novembre) ----------
test('mots : le point du i se pose juste après le i, la numérotation suit l\'écriture', () => {
  const ordre = (id) => buildTemplate(SKILLS[id]).strokes.map((s) => (s.kind === 'dot' ? '•' : '—')).join('');
  assert.equal(ordre('mot_il'), '—•—', 'i, son point, puis le l');
  assert.equal(ordre('mot_lit'), '——•——', 'l, i, son point, puis le t et sa barre');
  assert.ok(ordre('mot_ami').endsWith('—•'), 'ami se termine par le i et son point');
  // aucun mot ne garde ses points pour la fin (sauf le dernier i) : chaque point suit un trait
  for (const id of Object.keys(SKILLS)) {
    const sk = SKILLS[id];
    if (sk.kind !== 'word' || sk.capital || sk.majMot || sk.phrase) continue;
    const o = ordre(id);
    assert.ok(!o.includes('••'), `${id} : deux points de suite (${o})`);
    assert.ok(!o.startsWith('•'), `${id} : commence par un point`);
  }
  assert.deepEqual(T.calque('il').strokes.map((s) => s.kind === 'dot'), [false, true, false], 'même ordre dans le tableau libre');
  assert.ok(/juste après le i/.test(SKILLS.mot_il.say.how), 'la consigne le dit');
});

// ---------- La dictée : le renard dit, l'enfant écrit sans modèle ----------
import * as D from '../src/core/dictee.js';
import * as DC from '../src/content/dictee.js';
import { decouper } from '../src/core/voixId.js';

test('dictée : sans exercice acquis ni essayé, rien à dicter ; les acquis d\'abord, puis les essais', () => {
  const st = P.newState();
  assert.equal(D.dicteePossible(st), false);
  assert.deepEqual(D.dicteeItems(st), []);
  tried(st, 'i'); tried(st, 'o');
  assert.equal(D.dicteePossible(st), true, 'deux exercices essayés suffisent');
  assert.deepEqual(D.dicteePool(st).sort(), ['i', 'o']);
  for (const id of ['a', 'maj_I', 'maj_L']) mastered(st, id);
  assert.deepEqual(D.dicteePool(st).sort(), ['a', 'maj_I', 'maj_L'], 'dès trois acquis, on ne dicte que ce qui est acquis');
});

test('dictée : jamais de graphisme, de phrase ni de mot trop long ; mélange de lettres et de mots, sans doublon', () => {
  const st = P.newState();
  st.settings.demo = true; // tout est ouvert
  const pool = D.dicteePool(st);
  assert.ok(pool.length > 50);
  for (const id of pool) {
    const s = SKILLS[id];
    assert.ok(isWriting(s) && !s.phrase, `${id} : ni graphisme ni phrase`);
    if (s.kind === 'word') assert.ok(nbLettres(s.word) <= 5, `${id} : mot trop long`);
  }
  const items = D.dicteeItems(st);
  assert.equal(items.length, D.DICTEE_N);
  assert.equal(new Set(items).size, items.length, 'aucun doublon');
  assert.equal(items.filter((id) => SKILLS[id].kind === 'letter').length, 3);
  assert.equal(items.filter((id) => SKILLS[id].kind === 'word').length, 2);
});

test('dictée : ce qui n\'a jamais été dicté passe d\'abord, puis le moins récent ; le résultat est noté sans toucher à la maîtrise', () => {
  const st = P.newState();
  for (const id of ['i', 'o', 'a', 'maj_I', 'maj_L', 'maj_T', 'mot_il', 'mot_la', 'mot_le']) mastered(st, id);
  const avant = JSON.stringify(st.skills);
  const first = D.dicteeItems(st);
  first.forEach((id, k) => D.recordDictee(st, id, 3, 1000 + k));
  assert.equal(JSON.stringify(st.skills), avant, 'une dictée ne change ni les étoiles, ni la maîtrise, ni les séances');
  assert.equal(st.dictees[first[0]].n, 1);
  const second = D.dicteeItems(st);
  const jamais = D.dicteePool(st).filter((id) => !st.dictees[id]);
  assert.ok(jamais.length > 0 && second.some((id) => jamais.includes(id)), 'les exercices jamais dictés reviennent en premier');
  D.recordDictee(st, first[0], 1, 5000);
  assert.deepEqual([st.dictees[first[0]].best, st.dictees[first[0]].last, st.dictees[first[0]].n], [3, 1, 2], 'meilleur résultat conservé, dernier résultat, nombre d\'essais');
  assert.equal(D.dicteesFaites(st), first.length + 1);
});

test('dictée : un ancien enregistrement reçoit un carnet de dictées vide', () => {
  const old = P.newState(); delete old.dictees;
  const st = P.hydrate(JSON.parse(JSON.stringify(old)));
  assert.deepEqual(st.dictees, {});
});

test('dictée : ce que dit le renard — une lettre, un chiffre ou un mot, en phrases que la voix enregistrée sait découper', () => {
  const st = P.newState(); st.settings.demo = true;
  for (const id of D.dicteePool(st)) {
    const s = SKILLS[id], dit = DC.dicteeDit(s), parts = decouper(dit);
    assert.ok(/^Écris /.test(dit) && /[.]$/.test(dit), `${id} : « ${dit} »`);
    if (s.kind === 'letter') {
      assert.equal(parts.length, 1, `${id} : une seule phrase`);
      const nom = s.chiffre ? DC.NOMS_CHIFFRES[+s.glyph] : DC.NOMS_LETTRES[s.glyph.toLowerCase()];
      assert.ok(nom && dit.includes(`« ${nom} »`), `${id} : le nom « ${nom} » est dit`);
    } else {
      assert.equal(parts.length, 2, `${id} : la consigne, puis le mot seul`);
      assert.equal(parts[1], `« ${s.word.toLowerCase()} ».`);
    }
  }
  assert.ok(/majuscule/.test(DC.dicteeDit(SKILLS.maj_B)) && /majuscules/.test(DC.dicteeDit(SKILLS.mm_IL)));
  assert.ok(/le son/.test(DC.dicteeDit(SKILLS.son_ou)));
  for (const l of 'abcdefghijklmnopqrstuvwxyz') assert.ok(DC.NOMS_LETTRES[l], `nom de la lettre ${l}`);
  assert.equal(DC.NOMS_CHIFFRES.length, 10);
});

// ---------- La difficulté qui monte pour l'enfant qui réussit tout ----------
test('difficulté : trois nouveaux exercices acquis sans un raté, et le suivant commence aux pointillés', () => {
  const st = P.newState();
  assert.equal(P.aLAise(st), false);
  assert.equal(P.startPhaseFor(st, 'a'), 0, 'au départ, tout commence par le guide');
  mastered(st, 'i', T0); mastered(st, 'o', T0 + DAY); 
  assert.equal(P.startPhaseFor(st, 'a', T0 + DAY), 0, 'deux ne suffisent pas');
  mastered(st, 'l', T0 + 2 * DAY);
  assert.equal(P.aLAise(st), true);
  assert.deepEqual(st.aisance, ['e', 'e', 'e']);
  assert.equal(P.startPhaseFor(st, 'a', T0 + 2 * DAY), 1, 'un exercice jamais essayé saute le guide');
  assert.equal(P.startPhaseFor(st, 'l', T0 + 3 * DAY), 2, 'un exercice acquis la veille reste un rappel « tout seul »');
  tried(st, 'a', T0 + 3 * DAY);
  assert.equal(P.startPhaseFor(st, 'a', T0 + 3 * DAY), 0, 'un exercice déjà commencé repart du guide : on ne saute rien sur ce qu\'on connaît à moitié');
});

test('difficulté : un seul raté, une séance finie fatigué, ou un rappel — et tout redevient comme avant', () => {
  const st = P.newState();
  for (const id of ['i', 'o', 'l']) mastered(st, id, T0);
  assert.equal(P.aLAise(st), true);
  // un exercice acquis, mais avec un essai raté : plus à l'aise
  const dur = new Session('a', { demo: true });
  dur.submit(ev(1)); dur.submit(ev(3)); dur.submit(ev(3)); dur.submit(ev(3));
  assert.equal(dur.mastered, true);
  P.recordSession(st, 'a', dur, T0 + DAY);
  assert.equal(st.aisance.at(-1), 'x');
  assert.equal(P.aLAise(st), false);
  assert.equal(P.startPhaseFor(st, 'e', T0 + DAY), 0);
  // il faut trois acquis sans raté de nouveau
  mastered(st, 'e', T0 + 2 * DAY); mastered(st, 'u', T0 + 2 * DAY); assert.equal(P.aLAise(st), false);
  mastered(st, 'c', T0 + 2 * DAY); assert.equal(P.aLAise(st), true);
  // un rappel réussi (exercice déjà acquis) ne compte pas : seuls les nouveaux exercices parlent
  const avant = st.aisance.length;
  mastered(st, 'i', T0 + 9 * DAY);
  assert.equal(st.aisance.length, avant);
  // une séance finie fatigué (trois essais ratés de suite, jusqu'à la limite) : pas à l'aise
  const st2 = P.newState();
  for (const id of ['i', 'o', 'l']) mastered(st2, id, T0);
  const fatigue = new Session('a', { demo: true });
  for (let k = 0; k < 12 && !fatigue.done; k++) fatigue.submit(ev(0));
  assert.equal(fatigue.mastered, false);
  P.recordSession(st2, 'a', fatigue, T0 + DAY);
  assert.equal(P.aLAise(st2), false);
});

test('difficulté : les parents peuvent la couper, le mode démonstration ne la déclenche pas, une ancienne sauvegarde repart de zéro', () => {
  const st = P.newState();
  for (const id of ['i', 'o', 'l']) mastered(st, id, T0);
  assert.equal(P.startPhaseFor(st, 'a', T0), 1);
  st.settings.montee = false;
  assert.equal(P.startPhaseFor(st, 'a', T0), 0, 'réglage coupé');
  const dem = P.newState(); dem.settings.demo = true;
  for (const id of ['i', 'o', 'l']) mastered(dem, id, T0);
  assert.deepEqual(dem.aisance, [], 'la démonstration ne mesure rien');
  assert.equal(P.aLAise(dem), false);
  const vieux = P.newState(); delete vieux.aisance; delete vieux.settings.montee;
  const h = P.hydrate(JSON.parse(JSON.stringify(vieux)));
  assert.deepEqual(h.aisance, []);
  assert.equal(h.settings.montee, true, 'actif par défaut');
  assert.equal(P.aLAise(h), false);
});

test('lignes du cahier : une seule épaisseur pour toutes les lignes (horizontales et verticales)', async () => {
  const css = (await import('node:fs')).readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const bloc = css.match(/\.r-thin,\.r-main,\.r-base,\.r-vert\{[^}]*stroke-width:([^;}]+)/);
  assert.ok(bloc, 'une règle commune fixe l\'épaisseur des quatre sortes de lignes');
  for (const c of ['r-thin', 'r-main', 'r-base', 'r-vert']) {
    const own = css.match(new RegExp(`(?:^|\\})\\s*\\.${c}\\{[^}]*stroke-width`, 'm'));
    assert.equal(own, null, `.${c} ne redéfinit pas l'épaisseur`);
  }
});

test('défi « tout seul » : après six nouveaux exercices sans raté, le suivant commence tout seul ; au premier raté, pointillés', () => {
  const st = P.newState();
  st.aisance = ['e', 'e', 'e', 'e', 'e'];
  assert.equal(P.startPhaseFor(st, 'i'), 1, 'cinq : on saute seulement le guide');
  st.aisance = ['e', 'e', 'e', 'e', 'e', 'e'];
  assert.equal(P.startPhaseFor(st, 'i'), 2, 'six : défi tout seul');
  st.settings.montee = false;
  assert.equal(P.startPhaseFor(st, 'i'), 0, 'réglage coupé : on garde le guide');
  const s = new Session('i', { startPhase: 2, defi: true });
  const r = s.submit({ stars: 1, score: 0.3, criteria: {}, tags: [] });
  assert.equal(r.action, 'back'); assert.equal(r.defi, true); assert.equal(s.phase, 1);
  assert.equal(s.submit({ stars: 3, score: 0.9, criteria: {}, tags: [] }).action, 'phase', 'une réussite en pointillés ramène à tout seul');
  assert.equal(s.submit({ stars: 3, score: 0.9, criteria: {}, tags: [] }).action, 'done');
  assert.equal(s.mastered, true);
  const s2 = new Session('i', { startPhase: 2, defi: true });
  assert.equal(s2.submit({ stars: 3, score: 0.9, criteria: {}, tags: [] }).action, 'done', 'défi réussi du premier coup : acquis');
  const rappel = new Session('i', { startPhase: 2 });
  assert.equal(rappel.submit({ stars: 1, score: 0.3, criteria: {}, tags: [] }).action, 'again', 'un rappel express garde la règle des trois ratés');
});

test('cahier de vacances : une dizaine de pages par niveau, au plus trois modèles par page, jeux et règles inclus', async () => {
  const { cahierPages } = await import('../src/ui/sheets.js');
  for (const id of [1, 2, 3]) {
    const c = cahierPages(id, { name: 'Léa' });
    assert.ok(c.pages.length >= 9 && c.pages.length <= 12, `niveau ${id} : ${c.pages.length} pages`);
    assert.ok(c.n >= 6, `niveau ${id} : ${c.n} exercices d'écriture`);
    const texts = c.pages.map((p) => p.ops.filter((o) => o.t === 'text').map((o) => o.str).join(' '));
    assert.match(texts[0], /Mon cahier de vacances/);
    assert.match(texts[1], /Le départ/);
    assert.match(texts.join(' '), /labyrinthe/i);
    assert.match(texts.join(' '), /lettres cachées/i);
    assert.match(texts.join(' '), /Relie les points/);
    for (const t of texts) assert.doesNotMatch(t, /^\d$/, 'pas de numéro de trait isolé');
  }
});

test('stylet : la paume est ignorée pendant qu’on écrit au stylet, le doigt remarche ensuite', async () => {
  globalThis.performance ??= { now: () => Date.now() };
  const { notePen, isPalm } = await import('../src/ui/stylet.js');
  assert.equal(isPalm({ pointerType: 'touch', width: 12, height: 12 }), false, 'un doigt seul écrit');
  assert.equal(isPalm({ pointerType: 'touch', width: 80, height: 70 }), true, 'une paume large est ignorée');
  notePen({ pointerType: 'pen' });
  assert.equal(isPalm({ pointerType: 'touch', width: 12, height: 12 }), true, 'pendant le stylet, le toucher est ignoré');
  assert.equal(isPalm({ pointerType: 'pen' }), false);
});

test('les six règles de la reconnaissance sont expliquées aux adultes', async () => {
  const { REGLES } = await import('../src/content/regles.js');
  assert.deepEqual(REGLES.map((r) => r.k), ['start', 'direction', 'shape', 'size', 'lines', 'flow']);
});
