import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { nombreReglesFec, REGLES_FEC } from '../catalogue.js';

const dossier = fileURLToPath(new URL('.', import.meta.url));
const chemin = fileURLToPath(new URL('../../../../../docs/fec_regles.csv', import.meta.url));
const EN_TETE = 'id,libelle,source,gravite,test_id';

/** Lit le CSV : BOM refusé, CRLF accepté, lignes vides finales acceptées. */
function lireCsv(texte: string): string[][] {
  if (texte.charCodeAt(0) === 0xfeff) throw new Error('BOM interdit dans docs/fec_regles.csv');
  const lignes = texte.split(/\r?\n/);
  while (lignes.length > 0 && lignes[lignes.length - 1] === '') lignes.pop();
  expect(lignes[0]).toBe(EN_TETE);
  return lignes.slice(1).map((x) => x.split(','));
}
const lignes = lireCsv(readFileSync(chemin, 'utf8'));

describe('catalogue des règles du FEC', () => {
  it('csv-egal-au-code', () => {
    expect(lignes.map((x) => [x[0], x[1], x[3]])).toEqual(REGLES_FEC.map((r) => [r.id, r.libelle, r.gravite]));
    expect(lignes.map((x) => x[2])).toEqual(REGLES_FEC.map((r) => r.source));
    expect(lignes.map((x) => x[4])).toEqual(REGLES_FEC.map((r) => r.testId));
    expect(nombreReglesFec()).toBe(lignes.length);
  });
  it('ids-uniques', () => {
    const ids = REGLES_FEC.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...ids].sort());
    expect(ids.length).toBeGreaterThan(0);
  });
  it('chaque-test-id-existe', () => {
    const sources = readdirSync(dossier).filter((f) => f.endsWith('.test.ts')).map((f) => readFileSync(dossier + f, 'utf8'));
    const titres = sources.flatMap((s) => [...s.matchAll(/\b(?:it|test)\(\s*(['"`])(.*?)\1/g)].map((m) => m[2] ?? ''));
    for (const r of REGLES_FEC) expect(titres.some((t) => t.includes(r.testId)), r.testId).toBe(true);
  });
  it('source-jamais-vide', () => {
    for (const r of REGLES_FEC) expect(r.source.trim(), r.id).not.toBe('');
    for (const x of lignes) expect((x[2] ?? '').trim(), x[0]).not.toBe('');
  });
  it('aucune-virgule-dans-un-libelle', () => {
    for (const r of REGLES_FEC) expect(r.libelle).not.toContain(',');
    for (const x of lignes) expect(x).toHaveLength(5);
  });
  it('lecteur : CRLF et ligne vide finale acceptés, BOM refusé', () => {
    const texte = readFileSync(chemin, 'utf8');
    expect(lireCsv(texte.replace(/\n/g, '\r\n') + '\r\n')).toEqual(lignes);
    expect(lireCsv(texte + '\n\n')).toEqual(lignes);
    expect(() => lireCsv('﻿' + texte)).toThrow('BOM');
  });
});
