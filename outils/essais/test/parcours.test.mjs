import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ENTETE, cloturer, evaluer, lireRapport, lireSeuils, tableau } from '../parcours.mjs';

const seuils = lireSeuils(`${ENTETE}\nP1,accueil,300,5,80\nP2,liste,100,2,100\n`);
const rap = (o = {}) => ({ parcours: 'P1', date: '2026-11-12', version: 'v1', mesures: { duree_s: 200, gestes: 4, pieges_pct: 90 }, ...o });
const mes = (o) => rap({ mesures: { duree_s: 200, gestes: 4, pieges_pct: 90, ...o } });

test('rapport-vert-sous-les-seuils', () => {
  assert.equal(evaluer(rap(), seuils).etat, 'vert');
  // frontières incluses
  assert.equal(evaluer(mes({ duree_s: 300, gestes: 5, pieges_pct: 80 }), seuils).etat, 'vert');
  assert.equal(evaluer(mes({ duree_s: 0, gestes: 0 }), seuils).etat, 'vert');
});

test('rapport-rouge-au-dela', () => {
  const r1 = evaluer(mes({ duree_s: 301 }), seuils);
  assert.equal(r1.etat, 'rouge');
  assert.match(r1.raisons.join(), /duree/);
  assert.match(evaluer(mes({ gestes: 6 }), seuils).raisons.join(), /gestes/);
  assert.match(evaluer(mes({ pieges_pct: 79.9 }), seuils).raisons.join(), /pieges/);
});

test('parcours-inconnu-refuse', () => {
  assert.throws(() => evaluer(rap({ parcours: 'P9' }), seuils), /inconnu/);
  assert.throws(() => cloturer('P9', [], seuils), /inconnu/);
});

test('rouge-sans-nouvel-essai-refuse', () => {
  assert.throws(() => cloturer('P1', [], seuils), /aucun essai/);
  assert.throws(() => cloturer('P1', [mes({ gestes: 9 })], seuils), /rouge/);
  // vert le même jour que le rouge : pas plus récent
  assert.throws(() => cloturer('P1', [mes({ gestes: 9 }), rap()], seuils), /plus récent/);
  // vert antérieur au rouge
  assert.throws(() => cloturer('P1', [rap({ date: '2026-11-01' }), mes({ gestes: 9 })], seuils), /rouge/);
  // vert non postérieur à la correction
  assert.throws(() => cloturer('P1', [rap()], seuils, { correction: '2026-11-12' }), /correction/);
});

test('rouge-puis-vert-plus-recent-clos', () => {
  const r = [rap({ date: '2026-11-13' }), mes({ gestes: 9 })];
  assert.equal(cloturer('P1', r, seuils).clos, true);
  assert.equal(cloturer('P1', [rap()], seuils).clos, true);
  assert.equal(cloturer('P1', r, seuils, { correction: '2026-11-12' }).clos, true);
});

test('rapport-mal-forme-refuse', () => {
  assert.throws(() => lireRapport('pas du json'), /mal formé/);
  assert.throws(() => lireRapport('[]'), /mal formé/);
  assert.throws(() => lireRapport(JSON.stringify(rap({ date: '12/11/2026' }))), /date/);
  assert.throws(() => lireRapport(JSON.stringify(rap({ version: '' }))), /version/);
  assert.throws(() => lireRapport(JSON.stringify(mes({ duree_s: -1 }))), /duree_s/);
  assert.throws(() => lireRapport(JSON.stringify(mes({ gestes: 1.5 }))), /gestes/);
  assert.throws(() => lireRapport(JSON.stringify(mes({ pieges_pct: 101 }))), /pieges_pct/);
  assert.throws(() => lireRapport('{"parcours":"P1","date":"2026-11-12","version":"v","mesures":{"duree_s":null,"gestes":1,"pieges_pct":1}}'), /duree_s/);
  assert.throws(() => lireSeuils('x\nP1,a,1,1,1\n'), /en-tête/);
  assert.throws(() => lireSeuils(`${ENTETE}\nP1,a,abc,1,1\n`), /duree_max_s/);
  assert.throws(() => lireSeuils(`${ENTETE}\nP1,a,1,1,1\nP1,a,1,1,1\n`), /double/);
  assert.throws(() => lireRapport(JSON.stringify(rap({ date: '2026-02-30' }))), /date/);
  assert.throws(() => lireRapport(JSON.stringify(rap({ parcours: '' }))), /parcours/);
  assert.throws(() => lireRapport(JSON.stringify(rap({ parcours: undefined }))), /parcours/);
  assert.throws(() => lireRapport('null'), /mal formé/);
  assert.throws(() => lireRapport(JSON.stringify(rap({ mesures: null }))), /mesures/);
  assert.throws(() => lireRapport(JSON.stringify({ parcours: 'P1', date: '2026-11-12', version: 'v' })), /mesures/);
  assert.throws(() => lireRapport(JSON.stringify(mes({ gestes: -1 }))), /gestes/);
  assert.throws(() => lireRapport(JSON.stringify(mes({ pieges_pct: -1 }))), /pieges_pct/);
  assert.throws(() => lireSeuils(`${ENTETE}\nP1,a,1,1\n`), /5 colonnes/);
  assert.throws(() => lireSeuils(`${ENTETE}\n,a,1,1,1\n`), /5 colonnes/);
  assert.throws(() => lireSeuils(`${ENTETE}\nP1,a,1,x,1\n`), /gestes_max/);
  assert.throws(() => lireSeuils(`${ENTETE}\nP1,a,1,1,x\n`), /pieges_min_pct/);
  assert.throws(() => cloturer('P1', [rap()], seuils, { correction: 'hier' }), /correction/);
  assert.deepEqual(lireRapport(JSON.stringify(rap())).parcours, 'P1');
});

test('sortie-tableau-par-parcours', () => {
  const t = tableau([rap(), mes({ gestes: 9 }), rap({ parcours: 'P2', mesures: { duree_s: 10, gestes: 1, pieges_pct: 100 } })], seuils);
  assert.deepEqual(t.map((l) => [l.parcours, l.etat, l.essais]), [['P1', 'rouge', 2], ['P2', 'vert', 1]]);
  const etat = (...r) => tableau(r, seuils)[0].etat;
  const rouge = mes({ gestes: 9 });
  assert.equal(etat(rouge, rap()), 'rouge'); // même jour, les deux ordres : le rouge l'emporte
  assert.equal(etat(rap(), rouge), 'rouge');
  assert.equal(etat(rap({ date: '2026-11-13' }), rouge), 'vert'); // vert récent placé avant
  assert.equal(etat(rap({ date: '2026-11-01' }), rouge), 'rouge'); // vert ancien
});

test('seuils-reels-lisibles', () => {
  const chemin = new URL('../../../docs/essais-parcours.csv', import.meta.url);
  assert.deepEqual([...lireSeuils(readFileSync(chemin, 'utf8')).keys()], ['P1', 'P2', 'P3', 'P4']);
});
