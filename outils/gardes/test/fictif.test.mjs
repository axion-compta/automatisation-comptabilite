import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyserDepot, analyserTexte, DOSSIERS_PDF_FICTIFS } from '../fictif.mjs';

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

const norvege = ['NO93', '8601', '1117', '947'].join(' ');
const mail = (n) => `${n}${arobase}${domaineReel}`;

test('rouge : IBAN suivi d’une année, IBAN compact, IBAN de 15 caractères', () => {
  assert.equal(analyserTexte(`${ibanReel} 2024`, 't.txt').length, 1);
  assert.equal(analyserTexte(`iban ${ibanReel.replace(/ /g, '')}`, 't.txt').length, 1);
  assert.equal(analyserTexte(`iban ${norvege}`, 't.txt').length, 1);
  assert.equal(analyserTexte(`iban ${norvege.replace(/ /g, '')}.`, 't.txt').length, 1);
});

const fauxGit = (liste, racine = '/r') => (args) =>
  args[0] === 'rev-parse' ? racine + '\n' : args[0] === 'ls-files' && args[1] === '-z' ? liste : null;

test('rouge : chemin accentué lu et analysé', () => {
  const lu = [];
  const lire = (f) => (lu.push(f), `x ${mail('a')}`);
  const pb = analyserDepot(fauxGit('dossier/café.txt\0ok.txt\0'), lire);
  assert.deepEqual(lu, ['/r/dossier/café.txt', '/r/ok.txt']);
  assert.match(pb[0], /^dossier\/café\.txt:1 e-mail/);
});

test('rouge : git ls-files ou rev-parse en échec, fichier illisible', () => {
  assert.match(analyserDepot(fauxGit(null), () => '')[0], /ls-files a échoué/);
  assert.match(analyserDepot(() => null, () => '')[0], /rev-parse/);
  assert.match(analyserDepot(fauxGit('a.txt\0'), () => { throw Object.assign(new Error('x'), { code: 'ENOENT' }); })[0], /illisible/);
});

test('rouge : PDF hors dossier fictif ; vert dans le dossier prévu', () => {
  const pb = analyserDepot(fauxGit(`doc/a.pdf\0${DOSSIERS_PDF_FICTIFS[0]}b.pdf\0`), () => '');
  assert.equal(pb.length, 1);
  assert.match(pb[0], /doc\/a\.pdf PDF suivi/);
});
