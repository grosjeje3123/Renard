// Voix enregistrées : découpage en phrases et identifiants stables (les fichiers voix/<id>.mp3 en dépendent).
import test from 'node:test';
import assert from 'node:assert/strict';
import { decouper, idPhrase, normaliser } from '../src/core/voixId.js';

test('découpage : une phrase par ! ? . suivi d’une majuscule', () => {
  assert.deepEqual(decouper('Bravo ! Tu sais écrire le e !'), ['Bravo !', 'Tu sais écrire le e !']);
  assert.deepEqual(decouper('Très bien ! Quel joli tracé ! Continue jusqu’au bout du chemin !'), ['Très bien !', 'Quel joli tracé !', 'Continue jusqu’au bout du chemin !']);
  assert.deepEqual(decouper('Et une nouvelle vignette : le hérisson !'), ['Et une nouvelle vignette : le hérisson !']);
});

test('découpage : le « : » et les guillemets ne coupent pas, les phrases se suivent', () => {
  const t = 'Écris « renard » : suis la première ligne, puis les pointillés, puis écris tout seul !';
  assert.deepEqual(decouper(t), [t]);
  assert.deepEqual(decouper('Voici le hérisson ! Touche un haut-parleur pour l’écouter, ou « Tout lire ».'), ['Voici le hérisson !', 'Touche un haut-parleur pour l’écouter, ou « Tout lire ».']);
  assert.deepEqual(decouper('  '), []);
});

test('identifiant : stable, insensible aux espaces insécables et aux blancs en trop', () => {
  assert.equal(idPhrase('Bonjour !'), '92652413');
  assert.equal(idPhrase('Bonjour !'), idPhrase('Bonjour !'));
  assert.equal(idPhrase('  Bonjour   !  '), idPhrase('Bonjour !'));
  assert.notEqual(idPhrase('Bonjour !'), idPhrase('Bonjour.'));
  assert.match(idPhrase('n’importe quoi'), /^[0-9a-f]{8}$/);
  assert.equal(normaliser('a b'), 'a b');
});
