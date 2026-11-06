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

// IBAN fictifs construits par code (clé de contrôle calculée), jamais écrits en clair.
const cle = (pays, bban) => {
  const r = (bban + pays).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55)) + '00';
  let reste = 0;
  for (const ch of r) reste = (reste * 10 + Number(ch)) % 97;
  return pays + String(98 - reste).padStart(2, '0') + bban;
};
const frValide = cle('FR', '3'.repeat(23));
const parGroupes = (s, sep) => s.match(/.{1,4}/g).join(sep);

test('rouge : IBAN en minuscules, espaces insécables, tirets', () => {
  assert.equal(analyserTexte(`iban ${frValide.toLowerCase()}`, 't.txt').length, 1);
  assert.equal(analyserTexte(`iban ${parGroupes(frValide, ' ')}`, 't.txt').length, 1);
  assert.equal(analyserTexte(`iban ${parGroupes(frValide, '-')}`, 't.txt').length, 1);
  assert.equal(analyserTexte(`iban ${parGroupes(frValide.toLowerCase(), '\u202f')}`, 't.txt').length, 1);
});

// Ancien contrôle : pays quelconque, préfixe de 15 à 34 caractères, modulo 97 seul.
const ancienOk = (s) => {
  for (let n = 15; n <= 34; n++) {
    const p = s.slice(0, n);
    if (p.length < n) break;
    const r = (p.slice(4) + p.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
    let reste = 0;
    for (const ch of r) reste = (reste * 10 + Number(ch)) % 97;
    if (reste === 1) return true;
  }
  return false;
};
const base32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

test('vert : jetons base32 de 34 caractères (pays inconnu ou longueur inexacte)', () => {
  let graine = 12345;
  const alea = () => (graine = (graine * 1103515245 + 12345) % 2147483648);
  const jetons = [];
  while (jetons.length < 20) {
    // Deux lettres de pays inconnu (Q?), deux chiffres base32 (2 à 7), puis 30 caractères base32.
    let t = 'Q' + base32[alea() % 26] + String(2 + (alea() % 6)) + String(2 + (alea() % 6));
    for (let i = 0; i < 30; i++) t += base32[(alea() >> 8) % 32];
    if (ancienOk(t)) jetons.push(t);
  }
  for (const t of jetons) assert.deepEqual(analyserTexte(`secret ${t}`, 't.txt'), [], t);
  // Pays connu mais longueur inexacte (25 au lieu de 27) : clé valide, pas un IBAN.
  assert.deepEqual(analyserTexte(`x ${cle('FR', '3'.repeat(21))}`, 't.txt'), []);
});

test('rouge : binaires et bureautique hors dossier fictif ; vert dans packages/donnees-fictives', () => {
  const noms = ['a.xlsx', 'b.docx', 'c.zip', 'd.png', 'e.JPG', 'f.woff2', 'g.ttf', 'h.gif', 'i.ico'];
  const pb = analyserDepot(fauxGit(noms.map((n) => `app/${n}`).join('\0') + '\0'), () => '');
  assert.equal(pb.length, noms.length);
  assert.match(pb[0], /app\/a\.xlsx binaire suivi/);
  const dedans = noms.map((n) => `${DOSSIERS_PDF_FICTIFS[0]}${n}`).join('\0') + '\0';
  assert.deepEqual(analyserDepot(fauxGit(dedans), () => ''), []);
});
