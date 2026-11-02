import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyserTexte } from '../fictif.mjs';

// Les valeurs sont assemblées ici pour ne pas figurer en clair dans le dépôt.
const domaineReel = ['exemple', 'com'].join('.');
const arobase = '@';
const ibanReel = ['GB82', 'WEST', '1234', '5698', '7654', '32'].join(' ');

test('vert : e-mail @exemple.fr', () => {
  assert.deepEqual(analyserTexte('contact : camille.durand@exemple.fr', 't.txt'), []);
});

test('rouge : e-mail hors @exemple.fr', () => {
  const pb = analyserTexte(`contact : camille@${domaineReel}`, 't.txt');
  assert.equal(pb.length, 1);
  assert.match(pb[0], /t\.txt:1 e-mail hors/);
});

test('rouge : sous-domaine ou domaine voisin', () => {
  assert.equal(analyserTexte(`a${arobase}mail.exemple.fr`, 't.txt').length, 1);
  assert.equal(analyserTexte(`a${arobase}exemple.fr.autre.org`, 't.txt').length, 1);
});

test('rouge : IBAN valide, vert : numéro quelconque', () => {
  assert.equal(analyserTexte(`iban ${ibanReel}`, 't.txt').length, 1);
  assert.deepEqual(analyserTexte('réf FR00 0000 0000 0000 0000 0000 000', 't.txt'), []);
});

test('vert : texte sans donnée personnelle', () => {
  assert.deepEqual(analyserTexte('Société Exemple, facture 42', 't.txt'), []);
});
