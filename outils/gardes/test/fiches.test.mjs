import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyserFiches, charger } from '../fiches.mjs';

// Fiches fictives écrites dans un dossier temporaire puis relues par charger().
function monter(defs) {
  const dossier = mkdtempSync(join(tmpdir(), 'fiches-'));
  for (const [id, d] of Object.entries(defs)) {
    const c = { id, titre: '"t"', phase: 'P4', lot: '"01"', couloir: 'A', statut: 'a_faire', sensible: 'non', depend_de: '[]',
      fichiers_autorises: `["src/${id}.ts"]`, taille_max_lignes: '100', tests_requis: 'oui', ...d.champs };
    const tete = Object.entries(c).filter(([, v]) => v !== null).map(([k, v]) => `${k}: ${v}`).join('\n');
    writeFileSync(join(dossier, `${id}.md`), `---\n${tete}\n---\n\n## Contexte\n${d.contexte ?? 'RAS'}\n\n## À faire\nrien\n`);
  }
  const { fiches } = charger(dossier);
  rmSync(dossier, { recursive: true });
  return fiches;
}
const A = 'L01-T01';
const B = 'L01-T02';
const C = 'L01-T03';
const dep = (...ids) => ({ champs: { depend_de: JSON.stringify(ids) } });
const analyse = (defs, exceptions = []) => analyserFiches(monter(defs), exceptions);

test('cycle-injecte-rouge', () => {
  const r = analyse({ [A]: dep(B), [B]: dep(C), [C]: dep(A), 'L01-T04': dep(A) });
  assert.equal(r.erreurs.length, 1);
  assert.match(r.erreurs[0], /cycle de dépendances : L01-T01 → L01-T02 → L01-T03 → L01-T01/);
  assert.deepEqual(analyse({ [A]: dep(), [B]: dep(A), [C]: dep(A, B) }).erreurs, []);
});

test('dependance-inconnue-rouge', () => {
  const r = analyse({ [A]: dep('L99-T99') });
  assert.match(r.erreurs[0], /dépendance L99-T99 inconnue/);
});

test('taille-450-rouge-380-vert', () => {
  assert.equal(analyse({ [A]: { champs: { taille_max_lignes: '450' } } }).erreurs.length, 1);
  assert.equal(analyse({ [A]: { champs: { taille_max_lignes: '401' } } }).erreurs.length, 1);
  assert.deepEqual(analyse({ [A]: { champs: { taille_max_lignes: '380' } } }).erreurs, []);
  assert.deepEqual(analyse({ [A]: { champs: { taille_max_lignes: '400' } } }).erreurs, []);
  assert.deepEqual(analyse({ [A]: { champs: { taille_max_lignes: '1' } } }).erreurs, []);
});

test('taille-non-entiere-rouge', () => {
  for (const t of ['300.5', 'NaN', '-1', '0', '"300"', '']) {
    assert.equal(analyse({ [A]: { champs: { taille_max_lignes: t } } }).erreurs.length, 1, `taille « ${t} »`);
  }
});

test('depend-d-une-fiche-bloquee-rouge', () => {
  const bloquee = { contexte: "bloque_par: D1 (décision en attente)\nSuite." };
  const r = analyse({ [A]: bloquee, [B]: dep(A) });
  assert.equal(r.erreurs.length, 1);
  assert.match(r.erreurs[0], /L01-T02 : dépend de L01-T01, fiche bloquée/);
  const mention = { contexte: 'Le mot bloque_par: dans une phrase ne compte pas.' };
  assert.deepEqual(analyse({ [A]: mention, [B]: dep(A) }).erreurs, []);
  assert.deepEqual(analyse({ [A]: { ...bloquee, champs: { statut: 'fait' } }, [B]: { champs: { statut: 'fait', depend_de: `["${A}"]` } } }).erreurs, []);
});

test('phase-plus-tardive-rouge', () => {
  const r = analyse({ [A]: { champs: { phase: 'P6' } }, [B]: { champs: { phase: 'P2', depend_de: `["${A}"]` } } });
  assert.match(r.erreurs[0], /phase plus tardive/);
  assert.deepEqual(analyse({ [A]: { champs: { phase: 'P2' } }, [B]: { champs: { phase: 'P10', depend_de: `["${A}"]` } } }).erreurs, []);
});

test('meme-fichier-meme-lot-sans-lien-rouge', () => {
  const commun = { champs: { fichiers_autorises: '["src/commun.ts", "pilotage/fiches/x.md"]' } };
  const r = analyse({ [A]: commun, [B]: commun });
  assert.equal(r.erreurs.length, 1);
  assert.match(r.erreurs[0], /partagent src\/commun\.ts sans dépendance/);
  const lien = { champs: { ...commun.champs, depend_de: `["${A}"]` } };
  assert.deepEqual(analyse({ [A]: commun, [B]: lien }).erreurs, []);
  const transitif = { champs: { ...commun.champs, depend_de: `["${B}"]` } };
  assert.deepEqual(analyse({ [A]: commun, [B]: dep(A), [C]: transitif }).erreurs, [], 'lien transitif accepté');
});

test('meme-fichier-deux-lots-avertit-seulement', () => {
  const commun = (lot) => ({ champs: { lot: `"${lot}"`, fichiers_autorises: '["src/routes.ts"]' } });
  const r = analyse({ [A]: commun('01'), 'L02-T01': commun('02') });
  assert.deepEqual(r.erreurs, []);
  assert.equal(r.avertissements.length, 1);
});

test('exception-sans-motif-rouge', () => {
  const defs = { [A]: dep('L99-T99') };
  const sans = (motif) => analyse(defs, [{ id: A, regle: 'dependance-inconnue', ...motif }]);
  assert.equal(sans({}).erreurs.length, 2, 'exception refusée, erreur d’origine conservée');
  assert.equal(sans({ motif: '  ' }).erreurs.length, 2);
  assert.deepEqual(sans({ motif: 'fiche privée, voir décision' }).erreurs, []);
  assert.deepEqual(analyse(defs, [{ id: [A], regle: 'dependance-inconnue', motif: 'liste d’id' }]).erreurs, []);
  assert.equal(analyse(defs, [{ id: A, regle: 'taille', motif: 'autre règle' }]).erreurs.length, 1);
});
