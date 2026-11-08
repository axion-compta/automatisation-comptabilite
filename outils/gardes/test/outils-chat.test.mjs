import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyserOutilsChat, lireCodes, CHEMIN_OUTILS, CHEMIN_REGISTRE, CHEMIN_TYPES } from '../outils-chat.mjs';

const lire = (c) => JSON.parse(readFileSync(c, 'utf8'));
const reel = () => ({ outils: lire(CHEMIN_OUTILS), registre: lire(CHEMIN_REGISTRE), codes: lireCodes(readFileSync(CHEMIN_TYPES, 'utf8')) });
const rouge = (mod, texte) => {
  const { outils, registre, codes } = reel();
  const r = mod(outils, registre, codes) ?? { outils, registre, codes };
  const pb = analyserOutilsChat(r.outils ?? outils, r.registre ?? registre, r.codes ?? codes);
  assert.ok(pb.some((p) => p.includes(texte)), `${texte} : ${pb.join(' | ')}`);
};

test('main-vert', () => {
  const { outils, registre, codes } = reel();
  assert.ok(codes.length > 0 && outils.length > 0);
  assert.deepEqual(analyserOutilsChat(outils, registre, codes), []);
});

test('doublon-rouge', () => rouge((o) => o.push({ ...o[0] }), 'en double'));

test('appliquer-rouge', () => {
  for (const nom of ['appliquer', 'Appliquer', 'chat.appliquer']) rouge((o) => { o[0].nom = nom; }, 'appliquer');
  rouge((o) => { o[0].nom = ''; }, 'nom vide');
});

test('outil-registre-inconnu-rouge', () => rouge((o) => { o[0].outil_registre = 'outil_fantome'; }, 'absent du registre'));

test('niveau-different-rouge', () => rouge((o) => { o[0].niveau = o[0].niveau === 'B' ? 'L' : 'B'; }, 'niveau différent'));

test('niveau-i-rouge', () => {
  rouge((o, r) => { o[0].niveau = 'I'; r.outils.find((x) => x.id === o[0].outil_registre).niveau = 'I'; return { registre: r }; }, 'niveau I');
  rouge((o, r) => { r.outils.find((x) => x.id === o[0].outil_registre).chat = 'ferme'; return { registre: r }; }, 'fermé au chat');
});

test('permission-sans-prefixe-rouge', () => rouge((o) => { o[0].permission = 'lire'; }, 'permission'));

test('code-erreur-inconnu-rouge', () => {
  rouge((o) => { o[0].codes_erreur = [...o[0].codes_erreur, 'acces_refuse']; }, 'code inconnu');
  rouge((o) => { o[0].codes_erreur = []; }, 'codes_erreur vide');
  rouge(() => ({ codes: [] }), 'liste des codes');
});

test('fichier-vide-ou-illisible-rouge', () => {
  assert.deepEqual(lireCodes(''), []);
  assert.deepEqual(lireCodes('export const CODES_ERREUR = [] as const;'), []);
  assert.ok(analyserOutilsChat(null, { outils: [] }, ['x']).length > 0);
  assert.ok(analyserOutilsChat([], null, ['x']).length > 0);
  assert.ok(analyserOutilsChat([{ nom: 'a' }], { outils: [] }, 'x').length > 0);
});
