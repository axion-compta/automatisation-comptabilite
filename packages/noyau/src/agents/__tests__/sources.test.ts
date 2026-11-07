import { describe, expect, it } from 'vitest';
import { lireCitation, statutAffiche, verifierCitations, type EntreeRegistre } from '../sources.js';

const e = (o: Partial<EntreeRegistre> = {}): EntreeRegistre => ({
  id: 'TEST-1', version: '2', source: 'source-fictive', dateReleve: '2026-01-31', lectures: 2, ...o,
});
const reg = [e(), e({ id: 'TEST-2', version: 'v1' })];

describe('citations', () => {
  it('citation-lue', () => {
    expect(lireCitation('DEC-001:TEST-1@2')).toEqual({ registre: 'DEC-001', id: 'TEST-1', version: '2' });
    expect(lireCitation('DEC-001:A@1.2-b')?.version).toBe('1.2-b');
  });
  it('citation-mal-formee', () => {
    for (const t of ['DEC-001:', 'DEC-001:X', 'X:Y@1', '', ' ', ' DEC-001:A@1', 'DEC-001:A@1 ', 'DEC-001:a@1',
      'DEC-001:A@', 'DEC-001:A@1 2', 'DEC-001:A@1\n', 'DEC-002:A@1']) {
      expect(lireCitation(t)).toBeNull();
      expect(verifierCitations([t], reg)).toEqual({ valide: false, inconnues: [], malFormees: [t] });
    }
    expect(lireCitation(undefined as unknown as string)).toBeNull();
  });
  it('citation-inconnue-rejetee', () => {
    expect(verifierCitations(['DEC-001:FAUX-9@1'], reg)).toEqual({
      valide: false, inconnues: ['DEC-001:FAUX-9@1'], malFormees: [],
    });
  });
  it('version-inconnue-rejetee', () => {
    expect(verifierCitations(['DEC-001:TEST-1@3'], reg)).toMatchObject({ valide: false, inconnues: ['DEC-001:TEST-1@3'] });
    expect(verifierCitations(['DEC-001:TEST-2@2'], reg)).toMatchObject({ valide: false });
  });
  it('toutes-valides', () => {
    expect(verifierCitations(['DEC-001:TEST-1@2', 'DEC-001:TEST-2@v1'], reg)).toEqual({ valide: true });
    expect(verifierCitations([], reg)).toEqual({ valide: true });
    expect(verifierCitations(['DEC-001:TEST-1@2', 'DEC-001:FAUX@1', 'X'], reg)).toEqual({
      valide: false, inconnues: ['DEC-001:FAUX@1'], malFormees: ['X'],
    });
  });
});

describe('statut affiché', () => {
  it('sourcee-avec-deux-lectures', () => {
    expect(statutAffiche(e())).toBe('sourcee');
    expect(statutAffiche(e({ lectures: 3 }))).toBe('sourcee');
  });
  it('une-seule-lecture-a-verifier', () => {
    expect(statutAffiche(e({ lectures: 1 }))).toBe('a_verifier');
    expect(statutAffiche(e({ lectures: 0 }))).toBe('a_verifier');
    expect(statutAffiche(e({ source: '' }))).toBe('a_verifier');
    expect(statutAffiche(e({ source: '  ' }))).toBe('a_verifier');
    expect(statutAffiche({ id: 'T', version: '1', dateReleve: '2026-01-31', lectures: 2 })).toBe('a_verifier');
  });
  it('date-de-releve-invalide-a-verifier', () => {
    for (const d of ['2026-13-01', '01/01/2026', '', '2026-02-30', '2026-1-1']) {
      expect(statutAffiche(e({ dateReleve: d }))).toBe('a_verifier');
    }
    expect(statutAffiche({ id: 'T', version: '1', source: 's', lectures: 2 })).toBe('a_verifier');
  });
  it('lectures-invalides', () => {
    for (const n of [Number.NaN, -1, 1.5, Infinity, 2.5]) expect(statutAffiche(e({ lectures: n }))).toBe('a_verifier');
  });
});
