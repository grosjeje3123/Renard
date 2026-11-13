import test from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../src/core/session.js';
import { newState, recordSession, skillStatus, recommend, isSkillOpen, foxStage, difficulties, unlockedItems, awardStickers, stickerCount, persisted, markPaper } from '../src/core/progress.js';
import { STICKERS } from '../src/content/stickers.js';
import { ANIMALS } from '../src/ui/animals.js';
import { LEVELS, SKILLS, skillOrder } from '../src/content/skills.js';

const ev = (stars, crit = {}) => ({ stars, score: stars / 3, criteria: { start: 1, direction: 1, shape: 1, size: 1, lines: 1, flow: 1, ...crit }, tags: [] });

test('séance : une réussite par phase par défaut, puis maîtrise', () => {
  const s = new Session('o');
  const actions = [];
  for (let i = 0; i < 3; i++) actions.push(s.submit(ev(3)).action);
  assert.deepEqual(actions, ['phase', 'phase', 'done']);
  assert.ok(s.mastered && s.ended === 'complete' && s.tries === 3);
  assert.equal(s.totalNeeded, 3);
});

test('séance : si les parents le demandent, deux réussites par phase (le mode démo reste à une)', () => {
  const s = new Session('o', { reps: 2 });
  const actions = [];
  for (let i = 0; i < 6; i++) actions.push(s.submit(ev(3)).action);
  assert.deepEqual(actions, ['again', 'phase', 'again', 'phase', 'again', 'done']);
  assert.ok(s.mastered && s.tries === 6 && s.totalNeeded === 6);
  assert.equal(new Session('o', { reps: 2, demo: true }).totalNeeded, 3);
  assert.equal(new Session('o', { reps: 7 }).totalNeeded, 3, 'valeur inconnue : une réussite');
});

test('séance : trois échecs → on remontre le geste et on revient en arrière', () => {
  const s = new Session('o', { reps: 2 });
  s.submit(ev(3)); s.submit(ev(3)); // phase 1
  assert.equal(s.phase, 1);
  s.submit(ev(1)); s.submit(ev(0));
  const r = s.submit(ev(1));
  assert.equal(r.action, 'back'); assert.ok(r.rewatch);
  assert.equal(s.phase, 0);
});

test('séance : trop d\'essais → fin douce sans maîtrise', () => {
  const s = new Session('a');
  let r;
  for (let i = 0; i < 10; i++) r = s.submit(ev(1));
  assert.equal(r.action, 'done'); assert.equal(s.ended, 'tired'); assert.equal(s.mastered, false);
});

test('séance : revoir le modèle en phase 3 empêche la maîtrise', () => {
  const s = new Session('e', { demo: true });
  s.submit(ev(3)); s.submit(ev(3)); s.rewatch(); s.submit(ev(3));
  assert.ok(s.done && !s.mastered);
});

test('progression : maîtrise, déblocage, recommandation et stade du renard', () => {
  const st = newState();
  assert.deepEqual(recommend(st), { skillId: 'lignes', reason: 'first' });
  assert.equal(isSkillOpen(st, 'ronds'), false);
  const s = new Session('lignes', { demo: true });
  for (let i = 0; i < 3; i++) s.submit(ev(3));
  const res = recordSession(st, 'lignes', s);
  assert.ok(res.newlyMastered && res.item === 'echarpe');
  assert.equal(skillStatus(st, 'lignes'), 'mastered');
  assert.equal(isSkillOpen(st, 'ronds'), true);
  assert.deepEqual(unlockedItems(st), ['echarpe']);
  assert.equal(recommend(st).skillId, 'ronds');
  assert.equal(foxStage(st).index, 0);
});

test('progression : un exercice raté plusieurs fois est proposé à nouveau', () => {
  const st = newState();
  const s = new Session('lignes');
  for (let i = 0; i < 10; i++) s.submit(ev(1, { direction: 0.2 }));
  recordSession(st, 'lignes', s);
  assert.equal(skillStatus(st, 'lignes'), 'review');
  assert.equal(recommend(st).reason, 'review');
  assert.equal(difficulties(st)[0].key, 'direction');
});

// ---------- Vignettes d'animaux ----------
/** Une séance où l'enfant obtient successivement ces nombres d'étoiles, enregistrée comme dans l'application. */
const play = (st, skillId, stars, now = Date.now()) => {
  const s = new Session(skillId);
  for (const n of stars) s.submit(ev(n));
  recordSession(st, skillId, s, now);
  return awardStickers(st, now);
};
const masterAll = (st, ids, now = 1000) => ids.forEach((id, i) => play(st, id, [3, 3, 3], now + i));

test('vignettes : chaque vignette a son dessin et ses règles sont complètes', () => {
  assert.equal(new Set(STICKERS.map((x) => x.id)).size, STICKERS.length);
  for (const x of STICKERS) {
    assert.ok(ANIMALS[x.animal], `dessin manquant : ${x.animal}`);
    assert.ok(x.name && x.how && x.fact, `texte manquant : ${x.id}`);
    if (x.rule === 'star3') assert.ok(skillOrder.includes(x.skill), x.id);
    if (x.rule === 'level') assert.ok(LEVELS.some((l) => l.id === x.level && l.available), x.id);
    if (x.rule === 'count') assert.ok(LEVELS.find((l) => l.id === x.level).skills.length >= x.n, x.id);
    if (x.rule === 'paper') assert.equal(x.page, 'paper', x.id);
  }
  // une vignette par exercice du niveau 1 et par lettre du début du niveau 2 ; ensuite, des paliers (lettres, sons, mots et phrases)
  for (const id of [...LEVELS[0].core, 'i', 'o', 'a', 'l', 'e']) assert.ok(STICKERS.some((x) => x.rule === 'star3' && x.skill === id), id);
  for (const lv of [2, 3]) assert.ok(STICKERS.filter((x) => x.rule === 'count' && x.level === lv).length >= 2, `paliers du niveau ${lv}`);
});

test('vignettes : rien au départ ; la première séance donne le hérisson, trois étoiles donnent l\'animal de l\'exercice', () => {
  const st = newState();
  assert.deepEqual(awardStickers(st), []);
  assert.equal(stickerCount(st), 0);
  assert.deepEqual(play(st, 'lignes', [2]), ['herisson']);
  assert.deepEqual(play(st, 'lignes', [3]), ['grenouille']);
  assert.deepEqual(play(st, 'lignes', [3, 3]), [], 'une vignette ne se gagne qu\'une fois');
  assert.equal(stickerCount(st), 2);
});

test('vignettes : deux étoiles ne suffisent pas, mais l\'exercice acquis donne son animal (personne n\'est bloqué)', () => {
  const st = newState();
  assert.deepEqual(play(st, 'ronds', [2, 2]), ['herisson']);
  assert.ok(!st.stickers.poisson, 'pas encore acquis, pas de trois étoiles');
  assert.deepEqual(play(st, 'ronds', [2, 2, 2]), ['tortue', 'poisson'], 'acquis en deux séances : le poisson, et la tortue pour être revenu');
});

test('vignettes : la persévérance (rater puis réussir dans la même séance) est récompensée, pas l\'inverse', () => {
  assert.equal(persisted([{ t: 1, st: 2 }, { t: 1, st: 1 }]), false, 'réussir puis rater : rien');
  assert.equal(persisted([{ t: 1, st: 1 }, { t: 2, st: 3 }]), false, 'deux séances différentes : rien');
  assert.equal(persisted([{ t: 1, st: 0 }, { t: 1, st: 1 }, { t: 1, st: 2 }]), true);
  const st = newState();
  assert.ok(play(st, 'lignes', [1, 2]).includes('tortue'));
});

test('vignettes : les étapes de niveau (hibou, cerf) et la vignette dorée', () => {
  const st = newState();
  const l1 = LEVELS[0].core, l2 = LEVELS[1].skills, l3 = LEVELS[2].skills;
  masterAll(st, l1.slice(0, 4));
  assert.ok(!st.stickers.hibou);
  masterAll(st, l1.slice(4), 2000);
  assert.ok(st.stickers.hibou, 'niveau 1 terminé');
  assert.ok(!st.stickers.cerf && !st.stickers.renard);
  masterAll(st, l2, 3000);
  assert.ok(st.stickers.cerf, 'niveau 2 terminé');
  assert.ok(!st.stickers.tortue && !st.stickers.renard, 'sans jamais rater : pas de tortue, donc pas encore de renard doré');
  masterAll(st, l3.slice(0, 1), 4000);
  assert.ok(st.stickers.lapin && !st.stickers.souris, 'un premier mot : le lapin');
  masterAll(st, l3.slice(1, 3), 5000);
  assert.ok(st.stickers.souris && !st.stickers.blaireau, 'trois mots : la souris');
  masterAll(st, l3.slice(3), 6000);
  assert.ok(st.stickers.blaireau, 'niveau 3 terminé');
  assert.deepEqual(play(st, 'lignes', [1, 2], 9000), ['tortue', 'renard'], 'un essai raté puis réussi : la tortue, puis le renard doré');
  assert.ok(!st.stickers.escargot && !st.stickers.coccinelle, 'le cahier est un bonus : la vignette dorée ne l\'attend pas');
  ['i', 'o', 'a'].forEach((id) => markPaper(st, id));
  assert.deepEqual(awardStickers(st), ['escargot', 'coccinelle']);
  assert.equal(stickerCount(st), STICKERS.length);
});

test('vignettes : rattrapage d\'une progression ancienne, et jamais retirées', () => {
  const st = newState();
  masterAll(st, ['lignes', 'ronds']);
  st.stickers = {}; // état enregistré avant l'arrivée des vignettes
  const won = awardStickers(st);
  assert.ok(won.includes('herisson') && won.includes('grenouille') && won.includes('poisson'));
  const before = { ...st.stickers };
  st.skills.lignes.history = []; // même sans historique, ce qui est collé reste collé
  assert.deepEqual(awardStickers(st), []);
  assert.deepEqual(st.stickers, before);
});

test('vignettes : un ancien état sans champ « stickers » est accepté', () => {
  const st = newState();
  delete st.stickers;
  assert.doesNotThrow(() => awardStickers(st));
  assert.equal(stickerCount({}), 0);
});
