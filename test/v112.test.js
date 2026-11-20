// Version 1.12 : accents, phrases sur plusieurs lignes, lettres voisines refusées, formes ajoutées, dictée ratée, essais selon la longueur.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, LEVELS, composeText, composeLines, sansAccent, SON_REPERE, ECRITURE } from '../src/content/skills.js';
import { buildTemplate } from '../src/core/template.js';
import { recognizer } from '../src/engine/recognizer.js';
import { recognizerContext } from '../src/core/tolerance.js';
import { rivaux, autreLettre, avecRivale } from '../src/core/rivaux.js';
import { Session, maxTriesFor } from '../src/core/session.js';
import * as P from '../src/core/progress.js';
import * as D from '../src/core/dictee.js';
import { calque, checkRow, clean, TABLEAU } from '../src/core/tableau.js';
import { buildFeedback, TIPS } from '../src/engine/feedback.js';
import { simulate, tapAt } from './sim.js';

const tplE = (id) => buildTemplate(SKILLS[id], undefined, { ecran: true });
const ctxOf = (sk, phase, W = 10) => recognizerContext(sk, phase, { main: 'droite' }, 'touch', W);

test('accents : « bébé » et « écrire » s\'écrivent avec leurs accents, posés juste après leur lettre', () => {
  assert.ok(SKILLS.phr_le_bebe_dort && SKILLS.phr_le_bebe_dort.glyph === 'Le bébé dort');
  assert.equal(SKILLS.phr_je_sais_ecrire.glyph, 'Je sais écrire');
  assert.ok(!Object.values(SKILLS).some((s) => /\b(bebe|ecrire|ecole|ete)\b/.test(s.glyph || '')), 'plus aucun mot écrit sans son accent');
  assert.equal(sansAccent('garçon'), 'garcon');
  assert.deepEqual(SKILLS.mot_ecole.needs.sort(), ['c', 'e', 'l', 'o']);
  const t = buildTemplate(SKILLS.mot_ete);
  assert.deepEqual(t.strokes.map((s) => s.mark || s.kind), ['path', 'aigu', 'path', 'path', 'path', 'aigu'], 'é, t (deux traits), é : l\'accent suit sa lettre');
  const [e, a] = t.strokes;
  assert.ok(a.bbox.y1 < e.bbox.y0 + 0.01, 'l\'accent est au-dessus du e');
  assert.ok(a.bbox.x0 > e.bbox.x0 - 0.2 && a.bbox.x1 < e.bbox.x1 + 0.4, 'et au-dessus de lui, pas à côté');
  assert.ok(a.start.x > a.end.x && a.start.y < a.end.y, 'aigu : du haut à droite vers le bas à gauche');
  const g = buildTemplate(SKILLS.mot_pere).strokes.find((s) => s.mark === 'grave');
  assert.ok(g.start.x < g.end.x && g.start.y < g.end.y, 'grave : du haut à gauche vers le bas à droite');
  const c = buildTemplate(SKILLS.mot_garcon);
  const ced = c.strokes.find((s) => s.mark === 'cedille');
  assert.ok(ced.bbox.y1 > c.frame.baseline + 0.4 && ced.bbox.y0 >= c.frame.baseline - 0.05, 'la cédille pend sous la ligne');
  // î et ï : l'accent remplace le point
  const ii = buildTemplate({ id: 't', kind: 'word', strokes: composeText('île') });
  assert.equal(ii.strokes.filter((s) => s.kind === 'dot').length, 0);
  assert.equal(buildTemplate({ id: 't', kind: 'word', strokes: composeText('noël') }).strokes.filter((s) => s.kind === 'dot').length, 2, 'le tréma : deux points');
  // majuscule accentuée (prénom) : l'accent est posé au-dessus de la capitale, droit
  const E = buildTemplate({ id: 't', kind: 'word', strokes: composeText('Élodie', { skills: ECRITURE }) });
  const acc = E.strokes.find((s) => s.mark === 'aigu');
  assert.ok(acc && acc.bbox.y1 <= E.frame.baseline - 3.3, 'au-dessus des 3 interlignes de la capitale');
});

test('accents : un accent bien posé est accepté, penché du mauvais côté il est refusé (é n\'est pas è)', () => {
  const t = buildTemplate(SKILLS.mot_ete), a = t.strokes[1], ctx = ctxOf(SKILLS.mot_ete, 1, t.board.W);
  const trait = (from, to) => ({ points: [0, 0.25, 0.5, 0.75, 1].map((k, i) => ({ x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, t: i * 20 })), lifts: 0 });
  assert.ok(recognizer.evaluateStroke(a, trait(a.start, a.end), ctx).stars >= 2, 'tracé comme le modèle');
  assert.ok(recognizer.evaluateStroke(a, trait(a.end, a.start), ctx).stars >= 2, 'de bas en haut : le sens du geste n\'est pas jugé');
  const miroir = recognizer.evaluateStroke(a, trait({ x: a.end.x, y: a.start.y }, { x: a.start.x, y: a.end.y }), ctx);
  assert.ok(miroir.stars <= 1 && miroir.tags.includes('accent-pente'), 'un accent grave à la place de l\'aigu');
  assert.ok(buildFeedback(miroir).text.includes('penche'), 'et le renard le dit');
  assert.ok(recognizer.evaluateStroke(a, tapAt((a.start.x + a.end.x) / 2, (a.start.y + a.end.y) / 2), ctx).stars >= 2, 'un tout petit trait posé au bon endroit suffit');
  const loin = recognizer.evaluateStroke(a, trait({ x: a.start.x + 3, y: a.start.y }, { x: a.end.x + 3, y: a.end.y }), ctx);
  assert.ok(loin.stars <= 1 && loin.tags.includes('accent-loin'));
  // un essai complet du mot « été », accents compris, est réussi ; avec un accent à l'envers il ne l'est pas
  const evs = t.strokes.map((s, i) => recognizer.evaluateStroke(s, s.mark ? trait(s.start, s.end) : simulate(s, { seed: 3 + i }), ctx));
  assert.ok(recognizer.evaluateAttempt(t, evs).stars >= 2);
  evs[1] = miroir;
  assert.ok(recognizer.evaluateAttempt(t, evs).stars <= 1, 'un accent faux n\'est pas compensé par le reste');
});

test('tableau libre : le prénom garde ses accents et se reconnaît (accent posé d\'un petit trait ou d\'un toucher)', () => {
  assert.equal(clean('Léa'), 'léa');
  const base = TABLEAU.rows[1], c = calque('léa', base, 'debut');
  assert.equal(c.text, 'Léa');
  assert.equal(c.tpl.filter((s) => s.mark).length, 1);
  const ecrit = (accent) => c.tpl.map((s, i) => (s.mark ? accent(s) : { pts: simulate(s, { seed: 5 + i, noise: 0.03, drift: 0.05 }).points }));
  const petitTrait = (s) => ({ pts: [s.start, { x: (s.start.x + s.end.x) / 2, y: (s.start.y + s.end.y) / 2 }, s.end] });
  const toucher = (s) => ({ pts: tapAt((s.start.x + s.end.x) / 2, (s.start.y + s.end.y) / 2).points });
  for (const [nom, f] of [['petit trait', petitTrait], ['toucher', toucher]]) {
    const r = checkRow({ text: 'léa', mode: 'debut', baseline: base, strokes: ecrit(f), phase: 1 });
    assert.ok(r.ok, `${nom} : ${r.stars} étoiles ${r.tags}`);
  }
  const sans = checkRow({ text: 'léa', mode: 'debut', baseline: base, strokes: ecrit(() => null).filter(Boolean), phase: 1 });
  assert.ok(!sans.tags.includes('trait-manquant'), 'un accent oublié ne bloque pas (il pèse seulement sur la note)');
});

test('phrases : une longue phrase revient à la ligne à l\'écran, les lettres y sont nettement plus grandes', () => {
  const longues = LEVELS[2].skills.concat(LEVELS[0].skills).filter((id) => SKILLS[id].phrase);
  assert.ok(longues.length >= 45);
  let pire = 0, pireAvant = 0;
  for (const id of longues) {
    const sk = SKILLS[id], t1 = buildTemplate(sk), t = tplE(id);
    pireAvant = Math.max(pireAvant, t1.board.W); pire = Math.max(pire, t.board.W);
    assert.ok(t.board.W <= t1.board.W, `${id} : jamais plus petit qu'avant`);
    assert.equal(t.strokes.length, t1.strokes.length, `${id} : les mêmes traits, dans le même ordre`);
    assert.ok(t.bbox.x0 >= 0.3 && t.bbox.x1 <= t.board.W - 0.3 && t.bbox.y0 >= 0.2 && t.bbox.y1 <= t.board.H - 0.2, `${id} : tient sur la page`);
    const rows = t.board.rows;
    if (rows.length > 1) assert.ok(t.board.H <= Math.ceil(t.board.W * 0.7) + 0.01, `${id} : la page garde le rapport 10:7 de l'écran (${t.board.W} × ${t.board.H})`);
    assert.equal(rows.length, sk.ecran ? sk.ecran.lignes.length : 1);
    // chaque trait repose sur sa ligne d'écriture ; le point final est sur la dernière
    for (const s of t.strokes) assert.ok(rows.includes(s.base), `${id} : ligne d'écriture du trait`);
    const last = t.strokes.at(-1);
    assert.ok(last.kind === 'dot' && Math.abs(last.start.y - rows.at(-1)) < 0.01, `${id} : point final sur la dernière ligne`);
    if (rows.length > 1) {
      // on ne coupe jamais un mot : chaque ligne commence au début d'un mot, à gauche, et les lignes se suivent de haut en bas
      const parLigne = rows.map((b) => t.strokes.filter((s) => s.base === b));
      assert.ok(parLigne.every((l) => l.length > 0));
      const gauche = parLigne.map((l) => Math.min(...l.map((s) => s.bbox.x0)));
      assert.ok(Math.max(...gauche) - Math.min(...gauche) < 0.7, `${id} : lignes alignées à gauche (${gauche.map((x) => x.toFixed(2))})`);
      assert.ok(t.strokes.every((s, i) => i === 0 || s.base >= t.strokes[i - 1].base), `${id} : on écrit de haut en bas`);
      for (let k = 1; k < rows.length; k++) assert.equal(rows[k] - rows[k - 1], 5, 'cinq interlignes entre deux lignes d\'écriture');
    }
  }
  assert.ok(pireAvant >= 44 && pire <= 27, `la page la plus large passe de ${pireAvant} à ${pire} interlignes`);
  const c = composeLines('le chat boit du lait', { period: true });
  assert.equal(c.lignes.length, 3);
  assert.equal(composeLines('tu lis', { period: true }).lignes.length, 1, 'une phrase courte reste sur une ligne');
  // un essai complet sur trois lignes est reconnu, à chaque étape
  const sk = SKILLS.phr_le_chat_boit_du_lait, t = tplE(sk.id);
  for (const phase of [0, 1, 2]) {
    const ctx = ctxOf(sk, phase, t.board.W);
    const evs = t.strokes.map((s, i) => recognizer.evaluateStroke(s, s.kind === 'dot' ? tapAt(s.start.x, s.start.y) : simulate(s, { seed: 11 + i, noise: 0.03, drift: 0.06 }), ctx));
    assert.ok(recognizer.evaluateAttempt(t, evs).stars >= 2, `étape ${phase + 1}`);
  }
});

test('lettres voisines : un « o » n\'est plus accepté pour un « a », ni un « n » pour un « m » ; la bonne lettre n\'est jamais refusée', () => {
  const T = (l) => buildTemplate(SKILLS[l]).strokes.find((s) => s.kind === 'path');
  assert.equal(rivaux(T('a')).length, 23, 'les autres lettres d\'un seul trait (ni t ni x)');
  assert.equal(rivaux(T('t')).length, 0);
  assert.equal(rivaux(buildTemplate(SKILLS.maj_A).strokes[0]).length, 0, 'les majuscules ne sont pas concernées');
  // une autre lettre, bien écrite, à la place de la lettre demandée
  for (const [ecrit, attendu] of [['o', 'a'], ['n', 'm'], ['h', 'l'], ['u', 'a'], ['q', 'a'], ['b', 'l'], ['v', 'r']]) {
    const ts = T(attendu), autre = rivaux(ts).find((r) => r.id === ecrit).stroke;
    for (const phase of [1, 2]) {
      const ctx = ctxOf(SKILLS[attendu], phase), u = simulate(autre, { seed: 7, noise: 0.03, drift: 0.06 });
      const ev = avecRivale(ts, u, ctx, recognizer.evaluateStroke(ts, u, ctx));
      assert.ok(ev.stars <= 1, `« ${ecrit} » pour « ${attendu} », étape ${phase + 1} : ${ev.stars} étoiles`);
    }
  }
  // exemple détaillé : le moteur seul acceptait un o pour un a ; le renard le dit maintenant
  const ta = T('a'), ctx = ctxOf(SKILLS.a, 2), o = simulate(rivaux(ta).find((r) => r.id === 'o').stroke, { seed: 3, noise: 0.03, drift: 0.05 });
  const seul = recognizer.evaluateStroke(ta, o, ctx), corrige = avecRivale(ta, o, ctx, seul);
  assert.ok(seul.stars >= 2 && corrige.stars === 1 && corrige.confusion === 'o' && corrige.tags[0] === 'autre-lettre');
  assert.equal(TIPS[0][0], 'autre-lettre');
  assert.ok(buildFeedback(recognizer.evaluateAttempt(buildTemplate(SKILLS.a), [corrige])).text.includes('autre lettre'));
  // sur le guide plein (étape 1), l'enfant suit un chemin tracé : rien n'est comparé
  assert.equal(autreLettre(ta, o, ctxOf(SKILLS.a, 0), seul), null);
  // la bonne lettre, propre ou brouillonne, décalée, plus petite ou plus grande : jamais refusée pour « autre lettre »
  let acceptes = 0;
  for (const l of 'aoeildnmubhv') {
    const ts = T(l);
    for (let k = 0; k < 4; k++) for (const phase of [1, 2]) {
      const c = ctxOf(SKILLS[l], phase);
      const u = simulate(ts, { seed: 40 * k + l.charCodeAt(0) + phase, noise: k % 2 ? 0.08 : 0.04, drift: k % 2 ? 0.2 : 0.08, scale: 0.85 + k * 0.1, dx: (k - 1.5) * 0.3, dy: (k % 3 - 1) * 0.2 });
      const ev = recognizer.evaluateStroke(ts, u, c);
      if (ev.stars < 2) continue;
      acceptes++;
      assert.equal(autreLettre(ts, u, c, ev), null, `« ${l} » pris pour une autre lettre (essai ${k}, étape ${phase + 1})`);
    }
  }
  assert.ok(acceptes >= 80, `assez d'essais réussis pour que la vérification ait un sens (${acceptes})`);
  // dans un mot : chaque lettre connaît sa place et sa ligne
  const mot = buildTemplate(SKILLS.mot_lune), l0 = mot.strokes[0];
  assert.equal(l0.of, 'l');
  assert.ok(rivaux(l0).every((r) => Math.abs((r.stroke.bbox.x0 + r.stroke.bbox.w / 2) - (l0.bbox.x0 + l0.bbox.w / 2)) < 0.01 && r.stroke.base === l0.base));
});

test('conseil : un tracé allé au bout mais trop petit ne reçoit plus « continue jusqu\'au bout »', () => {
  const t = buildTemplate(SKILLS.a), ts = t.strokes[0], ctx = ctxOf(SKILLS.a, 0);
  const petit = recognizer.evaluateStroke(ts, simulate(ts, { seed: 2, scale: 0.6, noise: 0.02, drift: 0.03 }), ctx);
  assert.ok(petit.tags.includes('trop-petit') && !petit.tags.includes('incomplet'), String(petit.tags));
  const arrete = recognizer.evaluateStroke(ts, simulate(ts, { seed: 2, to: 0.6, noise: 0.02, drift: 0.03 }), ctx);
  assert.ok(arrete.tags.includes('incomplet'), String(arrete.tags));
});

test('graphisme : six formes de plus au niveau 1, reconnues dans le bon sens seulement, sans faire barrage aux majuscules', () => {
  const sec = LEVELS[0].sections.find((x) => x.id === 'formes2');
  assert.deepEqual(sec.skills, ['couches', 'montagnes', 'creneaux', 'coupes', 'spirale', 'lianes']);
  for (const id of sec.skills) {
    const sk = SKILLS[id], t = buildTemplate(sk);
    assert.ok(sk.kind === 'graphisme' && sk.say.intro && sk.say.how && sk.say.bubble && sk.title && sk.short);
    assert.ok(t.bbox.y0 >= t.frame.baseline - 3.05 && t.bbox.y1 <= t.frame.baseline + 0.05, `${id} : entre la ligne du haut et la ligne d'écriture`);
    for (const phase of [0, 1, 2]) {
      const ctx = ctxOf(sk, phase, t.board.W);
      const bon = recognizer.evaluateAttempt(t, t.strokes.map((s, i) => recognizer.evaluateStroke(s, simulate(s, { seed: 5 + i + phase, noise: 0.05, drift: 0.12 }), ctx)));
      const envers = recognizer.evaluateAttempt(t, t.strokes.map((s, i) => recognizer.evaluateStroke(s, simulate(s, { seed: 9 + i, reverse: true }), ctx)));
      assert.ok(bon.stars >= 2 && envers.stars <= 1, `${id}, étape ${phase + 1} : ${bon.stars} / ${envers.stars}`);
    }
  }
  const st = P.newState();
  for (const id of LEVELS[0].core) { st.skills[id] = { sessions: 1, attempts: 1, phase: 0, mastered: false, masteredAt: null, last: 1, history: [] }; }
  assert.ok(P.isSkillOpen(st, 'maj_I'), 'les majuscules s\'ouvrent après les cinq formes de départ, comme avant');
  assert.ok(P.isSkillOpen(st, 'couches') && !P.isSkillOpen(st, 'montagnes'));
  assert.equal(P.recommend(st).skillId, 'lignes', 'un exercice commencé reste conseillé en premier');
  // un exercice déjà joué ne se referme jamais, même si une mise à jour ajoute des exercices avant lui
  const vieux = P.newState();
  vieux.skills.maj_L = { sessions: 2, attempts: 4, phase: 2, mastered: true, masteredAt: 1, last: 1, history: [] };
  assert.ok(P.isSkillOpen(vieux, 'maj_L'));
});

test('dictée : une dictée ratée remet l\'exercice « à reprendre » jusqu\'à ce qu\'il soit rejoué ; un son seul ne se dicte plus', () => {
  assert.deepEqual(Object.keys(SON_REPERE).sort(), LEVELS[2].sections.find((x) => x.id === 'sons').skills.map((id) => SKILLS[id].word).sort());
  for (const [son, mot] of Object.entries(SON_REPERE)) assert.ok(mot.includes(son) && SKILLS[`son_${son}`].say.intro.includes(`comme dans « ${mot} »`), son);
  const st = P.newState(), now = Date.now();
  st.skills.a = { sessions: 1, attempts: 3, phase: 2, mastered: true, masteredAt: now - 5 * 86400000, last: now - 5 * 86400000, history: [] };
  assert.equal(P.skillStatus(st, 'a'), 'mastered');
  D.recordDictee(st, 'a', 1, now - 1000);
  assert.equal(P.skillStatus(st, 'a'), 'review');
  assert.deepEqual(P.recommend(st, now), { skillId: 'a', reason: 'review' });
  assert.ok(st.skills.a.mastered, 'l\'acquis n\'est pas retiré');
  st.skills.a.last = now; // l'exercice a été rejoué
  assert.equal(P.skillStatus(st, 'a'), 'mastered');
  D.recordDictee(st, 'a', 3, now + 1000);
  assert.equal(P.skillStatus(st, 'a'), 'mastered', 'une dictée réussie ne change rien');
  // un son raté en dictée avant la v1.12 (mal entendu, peut-être) ne reste pas « à reprendre » : il ne se dicte plus
  st.skills.son_in = { sessions: 1, attempts: 3, phase: 2, mastered: true, masteredAt: now - 5 * 86400000, last: now - 5 * 86400000, history: [] };
  D.recordDictee(st, 'son_in', 0, now - 1000);
  assert.equal(P.skillStatus(st, 'son_in'), 'mastered');
  assert.ok(!D.dicteePool(st).includes('son_in'));
});

test('séance : moins d\'essais pour un exercice long, mais toujours la place de réussir', () => {
  assert.deepEqual([1, 4, 5, 8, 9, 12, 13, 22].map(maxTriesFor), [10, 10, 8, 8, 6, 6, 5, 5]);
  const s = new Session('phr_le_chat_boit_du_lait', { strokes: 22 });
  const rate = { stars: 1, score: 0.4, criteria: {}, tags: [] };
  let r;
  for (let i = 0; i < 5; i++) r = s.submit(rate);
  assert.ok(s.done && s.ended === 'tired' && r.action === 'done', 'cinq essais ratés d\'une longue phrase : on s\'arrête là');
  const deux = new Session('phr_x', { strokes: 22, reps: 2 });
  assert.equal(deux.maxTries, 8, 'deux réussites par étape : six essais nécessaires, plus deux ratés permis');
  assert.equal(new Session('a').maxTries, 10);
});

test('parents : la semaine en bref dit le temps, les acquis, ce qui est à reprendre et les lettres confondues', () => {
  const now = new Date(2026, 10, 16, 18).getTime(), J = 86400000;
  const st = P.newState();
  st.usage[P.dayKey(now)] = 600; st.usage[P.dayKey(now - 2 * J)] = 900; st.usage[P.dayKey(now - 20 * J)] = 3000;
  const sk = (o) => ({ sessions: 1, attempts: 3, phase: 2, mastered: false, masteredAt: null, last: now - 3 * J, history: [], ...o });
  st.skills.i = sk({ mastered: true, masteredAt: now - J });
  st.skills.o = sk({ mastered: true, masteredAt: now - 30 * J, consolidatedAt: now - 2 * J });
  st.skills.a = sk({ mastered: true, masteredAt: now - 30 * J, history: [{ t: now - J, ph: 2, sc: 0.5, st: 1, c: {}, tg: ['autre-lettre'] }] });
  st.skills.l = sk({ mastered: true, masteredAt: now - 30 * J, last: now - 5 * J });
  D.recordDictee(st, 'l', 0, now - J);
  const b = P.bilanSemaine(st, now);
  assert.deepEqual({ minutes: b.minutes, jours: b.jours }, { minutes: 25, jours: 2 });
  assert.deepEqual(b.acquis, ['i']);
  assert.deepEqual(b.consolides, ['o']);
  assert.deepEqual(b.reprendre, [{ id: 'l', pourquoi: 'dictee' }]);
  assert.deepEqual(b.confusions, ['a']);
  assert.deepEqual(P.bilanSemaine(P.newState(), now), { minutes: 0, jours: 0, acquis: [], consolides: [], reprendre: [], confusions: [] });
});

test('phrases : une majuscule d\'imprimerie au début, un point à la fin ; la majuscule est droite, le reste est en cursive', () => {
  const phrases = LEVELS[2].skills.filter((id) => SKILLS[id].phrase);
  assert.equal(phrases.length, 36);
  for (const id of phrases) {
    const sk = SKILLS[id], t = buildTemplate(sk), M = sk.glyph[0];
    assert.ok(/^[A-Z]$/.test(M) && sk.glyph.slice(1) === sk.word.slice(1) && sk.word[0] === M.toLowerCase(), id);
    assert.ok(sk.title.includes(`« ${sk.glyph} »`) && sk.say.intro.includes('majuscule') && sk.say.how.startsWith('Commence par la majuscule'), id);
    assert.equal(t.strokes[0].of, M, `${id} : on commence par la majuscule`);
    const maj = t.strokes.filter((s) => s.of === M), cap = buildTemplate(SKILLS[`maj_${M}`]);
    assert.equal(maj.length, cap.strokes.length, `${id} : les mêmes traits que la majuscule apprise au niveau 1`);
    const y0 = Math.min(...maj.map((s) => s.bbox.y0)), y1 = Math.max(...maj.map((s) => s.bbox.y1));
    assert.ok(Math.abs(y0 - (t.frame.baseline - 3)) < 0.05 && Math.abs(y1 - t.frame.baseline) < 0.05, `${id} : la majuscule va de la ligne d'écriture à la 3e ligne`);
    assert.ok(!sk.needs.some((l) => l.length !== 1 || !/[a-z]/.test(l)), `${id} : seules les lettres cursives écrites sont demandées`);
    assert.ok(t.strokes.at(-1).kind === 'dot');
    assert.ok(rivaux(maj[0]).length === 0, 'une majuscule n\'est pas comparée aux minuscules');
  }
  // une barre verticale de majuscule reste verticale dans une phrase penchée (la cursive, elle, penche)
  const t = buildTemplate(SKILLS.phr_le_chat_dort), barre = t.strokes[0];
  assert.ok(barre.bbox.w < 0.05 && barre.bbox.h > 2.9, `le L est droit (${barre.bbox.w.toFixed(3)})`);
  assert.deepEqual(SKILLS.phr_je_sais_ecrire.needs.includes('j'), false, 'le j minuscule n\'est pas demandé pour « Je sais écrire »');
});
