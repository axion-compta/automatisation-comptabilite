import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../argent/index.js';
import type { LigneALettrer } from '../lettrage.js';
import { delettrer, proposerLettrages, type LigneProposable } from '../proposition-lettrage.js';

const brut = (n: number): Centimes => n as Centimes; // montants invalides volontaires
function l(id: string, debit: number, credit: number, extra: Partial<LigneProposable> = {}): LigneProposable {
  return { id, compte: '411', auxiliaire: 'CLIENT-FICTIF', debit: centimes(debit), credit: centimes(credit), ...extra };
}
function lb(id: string, debit: number, credit: number): LigneProposable {
  return { id, compte: '411', auxiliaire: 'CLIENT-FICTIF', debit: brut(debit), credit: brut(credit) };
}
const ids = (r: ReturnType<typeof proposerLettrages>) => r.map((p) => [...p.ligneIds].sort());

describe('proposition de lettrage', () => {
  it('reference-commune-proposee', () => {
    const r = proposerLettrages([
      l('a', 10000, 0, { reference: 'FA-1' }),
      l('b', 0, 6000, { reference: 'FA-1' }),
      l('c', 0, 4000, { reference: 'FA-1' }),
      l('d', 500, 0, { reference: 'FA-2' }),
    ]);
    expect(ids(r)).toEqual([['a', 'b', 'c']]);
    expect(r[0]?.motif).toBe('reference');
    expect(r[0]?.compte).toBe('411');
  });

  it('montant-egal-unique-propose', () => {
    const r = proposerLettrages([l('a', 2500, 0), l('b', 0, 2500), l('c', 0, 900)]);
    expect(ids(r)).toEqual([['a', 'b']]);
    expect(r[0]?.motif).toBe('montant');
  });

  it('montant-ambigu-non-propose', () => {
    expect(proposerLettrages([l('a', 2500, 0), l('b', 0, 2500), l('c', 0, 2500)])).toEqual([]);
    expect(proposerLettrages([l('a', 2500, 0), l('a2', 2500, 0), l('b', 0, 2500)])).toEqual([]);
  });

  it('solde-nul-au-centime', () => {
    expect(proposerLettrages([l('a', 10001, 0, { reference: 'R' }), l('b', 0, 10000, { reference: 'R' })])).toEqual([]);
    expect(proposerLettrages([l('a', 10000, 0, { reference: 'R' }), l('b', 0, 10001, { reference: 'R' })])).toEqual([]);
    expect(proposerLettrages([l('a', 10001, 0), l('b', 0, 10000)])).toEqual([]);
    expect(ids(proposerLettrages([l('a', 10000, 0, { reference: 'R' }), l('b', 0, 10000, { reference: 'R' })]))).toEqual([['a', 'b']]);
  });

  it('comptes-401-411-455-seulement', () => {
    for (const compte of ['401', '411', '455']) {
      expect(proposerLettrages([l('a', 100, 0, { compte }), l('b', 0, 100, { compte })])).toHaveLength(1);
    }
    for (const compte of ['512', '706', '400', '41', '6411', '5401']) {
      expect(proposerLettrages([l('a', 100, 0, { compte }), l('b', 0, 100, { compte })])).toEqual([]);
    }
  });

  it('ligne-deja-lettree-ignoree', () => {
    expect(proposerLettrages([l('a', 100, 0, { lettre: 'A' }), l('b', 0, 100)])).toEqual([]);
    expect(proposerLettrages([l('a', 100, 0, { lettre: 'A', reference: 'R' }), l('b', 0, 100, { reference: 'R' })])).toEqual([]);
  });

  it('delettrage-trace', () => {
    const lignes: LigneALettrer[] = [l('a', 100, 0, { lettre: 'A' }), l('b', 0, 100, { lettre: 'A' })];
    const r = delettrer({ code: 'A', lignes }, '  Erreur de rapprochement  ', 'Camille Fictif', '2026-11-12');
    expect(r.lignes.map((x) => x.lettre)).toEqual([undefined, undefined]);
    expect(r.lignes.map((x) => x.id)).toEqual(['a', 'b']);
    expect(r.trace).toEqual({ code: 'A', ligneIds: ['a', 'b'], motif: 'Erreur de rapprochement', auteur: 'Camille Fictif', date: '2026-11-12' });
    expect(lignes[0]?.lettre).toBe('A'); // entrée non modifiée
  });

  it('delettrage-sans-motif-refuse', () => {
    const g = { code: 'A', lignes: [l('a', 100, 0, { lettre: 'A' }), l('b', 0, 100, { lettre: 'A' })] };
    for (const motif of ['', '   ', '\n\t']) {
      expect(() => delettrer(g, motif, 'Camille Fictif', '2026-11-12')).toThrow(/motif/i);
    }
    expect(() => delettrer(g, 'ok', ' ', '2026-11-12')).toThrow(/auteur/i);
    expect(() => delettrer(g, 'ok', 'Camille Fictif', '12/11/2026')).toThrow(/date/i);
    expect(() => delettrer(g, 'ok', 'Camille Fictif', '2026-02-30')).toThrow(/date/i);
    expect(() => delettrer({ code: 'A', lignes: [l('a', 100, 0, { lettre: 'B' })] }, 'ok', 'Camille Fictif', '2026-11-12')).toThrow(/lettr/i);
    expect(() => delettrer({ code: 'A', lignes: [] }, 'ok', 'Camille Fictif', '2026-11-12')).toThrow();
  });

  it('cas-limites-montants', () => {
    expect(proposerLettrages([])).toEqual([]);
    expect(proposerLettrages([l('a', 0, 0), l('b', 0, 0)])).toEqual([]);
    expect(proposerLettrages([lb('a', Number.NaN, 0), lb('b', 0, Number.NaN)])).toEqual([]);
    expect(proposerLettrages([lb('a', 10.5, 0), lb('b', 0, 10.5)])).toEqual([]);
    expect(proposerLettrages([lb('a', -100, 0), lb('b', 0, -100)])).toEqual([]);
    expect(proposerLettrages([lb('a', -1, 0), lb('b', 0, -1)])).toEqual([]);
    expect(proposerLettrages([lb('a', 1, 0), lb('b', 0, 1)])).toHaveLength(1);
  });

  it('comptes-et-auxiliaires-separes', () => {
    expect(proposerLettrages([l('a', 100, 0), l('b', 0, 100, { auxiliaire: 'AUTRE-FICTIF' })])).toEqual([]);
    expect(proposerLettrages([l('a', 100, 0, { reference: 'R' }), l('b', 0, 100, { reference: 'R', compte: '401' })])).toEqual([]);
  });

  it('une-ligne-dans-une-seule-proposition', () => {
    const r = proposerLettrages([
      l('a', 100, 0, { reference: 'R' }),
      l('b', 0, 100, { reference: 'R' }),
      l('c', 100, 0),
      l('d', 0, 100),
    ]);
    const tous = r.flatMap((p) => p.ligneIds);
    expect(new Set(tous).size).toBe(tous.length);
  });
});
