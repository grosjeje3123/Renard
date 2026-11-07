import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS } from '../src/content/skills.js';
import { buildTemplate } from '../src/core/template.js';
import { recognizer } from '../src/engine/recognizer.js';
import { simulate, scribble, tapAt } from './sim.js';
import { recognizerContext } from '../src/core/tolerance.js';

const IDS = Object.keys(SKILLS).filter((id) => SKILLS[id].kind !== 'word'); // les mots sont composés des tracés des lettres
const TPL = Object.fromEntries(IDS.map((id) => [id, buildTemplate(SKILLS[id])]));
const first = (id) => TPL[id].strokes[0];
const run = (id, opts, phase = 0) => recognizer.evaluateStroke(first(id), simulate(first(id), opts), recognizerContext(SKILLS[id], phase));
const seeds = Array.from({ length: 20 }, (_, i) => i + 1);
const rate = (fn) => seeds.filter(fn).length / seeds.length;

test('un tracé soigné d\'enfant obtient 3 étoiles (suivi du guide)', () => {
  for (const id of IDS) {
    const ok = rate((s) => run(id, { seed: s, noise: 0.05, drift: 0.12 }).stars === 3);
    assert.ok(ok >= 0.9, `${id}: seulement ${ok * 100}% à 3 étoiles`);
  }
});

test('un tracé approximatif mais honnête obtient au moins 2 étoiles', () => {
  for (const id of IDS) {
    const ok = rate((s) => run(id, { seed: s, noise: 0.1, drift: 0.3 }).stars >= 2);
    assert.ok(ok >= 0.85, `${id}: seulement ${ok * 100}% à 2 étoiles ou plus`);
  }
});

test('sans modèle (écriture de mémoire), la forme correcte reste reconnue même décalée', () => {
  for (const id of IDS) {
    const ok = rate((s) => run(id, { seed: s, noise: 0.07, drift: 0.2, dx: 0.5, dy: 0.4 }, 2).stars >= 2);
    assert.ok(ok >= 0.85, `${id}: ${ok * 100}%`);
  }
});

test('le sens inverse est détecté et limité à 1 étoile', () => {
  for (const id of IDS) {
    if (id === 'lignes') continue; // trait vertical : le départ en bas est le signal
    const res = seeds.map((s) => run(id, { seed: s, reverse: true }));
    const bad = res.filter((e) => e.stars > 1).length;
    assert.ok(bad <= 1, `${id}: ${bad} tracés inversés à plus d'une étoile`);
    assert.ok(res.filter((e) => e.tags.includes('sens-inverse')).length >= 17, `${id}: sens inverse non signalé`);
  }
  const l = run('lignes', { reverse: true });
  assert.ok(l.stars <= 1 && l.tags.includes('sens-inverse'));
});

test('tracé incomplet : au plus 1 étoile et message "incomplet"', () => {
  for (const id of IDS) {
    const res = seeds.map((s) => run(id, { seed: s, to: 0.5 }));
    assert.ok(res.every((e) => e.stars <= 1), `${id}: tracé à moitié mais plus d'une étoile`);
    assert.ok(res.filter((e) => e.tags.includes('incomplet')).length >= 18, `${id}: incomplet non signalé`);
  }
});

test('départ au mauvais endroit : conseil donné, jamais 3 étoiles', () => {
  for (const id of IDS) {
    if (id === 'lignes' || id === 'x') continue; // un trait droit : partir un peu plus loin sur le même trait reste sur le trait
    if (/^M\s*-?[\d.]+\s+-?[\d.]+\s*L\s*-?[\d.]+\s+-?[\d.]+\s*$/.test(SKILLS[id].strokes[0].d || '')) continue; // majuscules dont le premier trait est un segment (I, L, T, E, F, H…)
    const res = seeds.map((s) => run(id, { seed: s, from: 0.3 }));
    assert.ok(res.every((e) => e.stars < 3), `${id}`);
  }
});

test('lettre trop petite ou posée trop haut : signalé (écriture sans modèle)', () => {
  for (const id of ['o', 'a', 'e', 'l', 'i', 'ponts']) {
    const small = seeds.map((s) => run(id, { seed: s, scale: 0.5 }, 2));
    assert.ok(small.filter((e) => e.tags.includes('trop-petit')).length >= 16, `${id}: trop petit non détecté`);
    const high = seeds.map((s) => run(id, { seed: s, dy: -1.2 }, 2));
    assert.ok(high.filter((e) => e.tags.includes('flotte')).length >= 16, `${id}: flotte non détecté`);
    assert.ok(high.every((e) => e.stars <= 2), `${id}: lettre décollée de la ligne avec 3 étoiles`);
  }
});

test('un gribouillis ne rapporte aucune étoile', () => {
  for (const id of IDS) for (const s of [1, 2, 3, 4, 5]) {
    const e = recognizer.evaluateStroke(first(id), scribble(s), recognizerContext(SKILLS[id], 0));
    assert.equal(e.stars, 0, `${id} seed ${s}: score ${e.score.toFixed(2)}`);
  }
});

test('le point du i : tapoter au bon endroit réussit, loin échoue', () => {
  const dot = TPL.i.strokes[1];
  assert.equal(recognizer.evaluateStroke(dot, tapAt(dot.start.x, dot.start.y)).stars, 3);
  assert.ok(recognizer.evaluateStroke(dot, tapAt(dot.start.x + 3, dot.start.y + 2)).stars <= 1);
});

test('les lettres se distinguent : le bon gabarit gagne presque toujours', () => {
  const letters = ['i', 'o', 'a', 'l', 'e'];
  let wins = 0, total = 0;
  const table = [];
  for (const L of letters) {
    const row = [];
    for (const M of letters) {
      let sum = 0;
      for (const s of seeds) sum += recognizer.evaluateStroke(first(M), simulate(first(L), { seed: s, noise: 0.06, drift: 0.12 }), recognizerContext(SKILLS[M], 0)).score;
      row.push(sum / seeds.length);
    }
    table.push(row);
    total++;
    if (row.indexOf(Math.max(...row)) === letters.indexOf(L)) wins++;
  }
  console.log('\nMatrice de confusion (ligne = lettre tracée, colonne = gabarit comparé)\n      ' + letters.map((l) => l.padStart(5)).join(''));
  table.forEach((row, i) => console.log(letters[i].padStart(5), row.map((v) => v.toFixed(2).padStart(5)).join('')));
  assert.equal(wins, total);
  // Le bon gabarit domine d'au moins 0,1 point de score moyen
  table.forEach((row, r) => row.forEach((v, c) => { if (r !== c) assert.ok(row[r] - v >= 0.1, `${letters[r]} contre ${letters[c]} : écart ${(row[r] - v).toFixed(2)}`); }));
  // Un autre gabarit ne donne pas 3 étoiles. Limite connue : i et e restent proches
  // (le point du i les départage en pratique ; un moteur d'apprentissage est prévu pour la suite).
  for (const L of letters) for (const M of letters) {
    if (L === M || (L + M === 'ie') || (L + M === 'ei')) continue;
    const r = recognizer.evaluateStroke(first(M), simulate(first(L), { seed: 7, noise: 0.06, drift: 0.12 }), recognizerContext(SKILLS[M], 0));
    assert.ok(r.stars <= 2, `${L} tracé contre ${M} : ${r.stars} étoiles`);
  }
});

test('mots, sons et phrases : un enfant soigneux obtient au moins 2 étoiles sur l\'essai complet (traits dans l\'ordre, points compris)', () => {
  const ids = Object.keys(SKILLS).filter((id) => SKILLS[id].kind === 'word');
  const pick = ids.filter((id, i) => id.startsWith('son_') || id.startsWith('phr_') || i % 4 === 0);
  const six = [1, 2, 3, 4, 5, 6];
  for (const id of pick) {
    const t = buildTemplate(SKILLS[id]);
    const good = six.filter((seed) => {
      const evals = t.strokes.map((s, i) => recognizer.evaluateStroke(s, simulate(s, { seed: seed * 100 + i, noise: 0.05, drift: 0.1 }), recognizerContext(SKILLS[id], 0, {}, 'touch', t.board.W)));
      return recognizer.evaluateAttempt(t, evals).stars >= 2;
    }).length;
    assert.ok(good >= 5, `${id} : ${good}/6 essais à 2 étoiles ou plus`);
  }
});
