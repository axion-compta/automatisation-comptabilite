import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../argent/index.js';
import { verifierEquilibre } from '../../ecritures/modele.js';
import { delettrer, type EntreeDelettrage } from '../delettrage.js';
import { ErreurVente, type ComptesVente, type LigneTvaVente } from '../types.js';

const c = (n: number): Centimes => n as Centimes;
const comptes: ComptesVente = { client: 'CLI', tvaCollectee: 'COL', tvaEnAttente: 'ATT', avancesClients: 'AVA', banque: 'BQ' };
const tva = (tauxPdb: number, base: number, montant: number): LigneTvaVente => ({
  compte: 'COL', tauxPdb, baseCentimes: c(base), tvaCentimes: c(montant), codeTva: 'COLLECTEE', cas: 'B', sens: 'vente', dateExigibilite: '2026-10-05', pieceId: 'f1',
});
const entree = (extra: Partial<EntreeDelettrage> = {}): EntreeDelettrage => ({
  lettrageId: 'LET-A', idAnnulation: 'ann1', idEcriture: 'e9', journal: 'OD', dateCorrection: '2026-11-20', motif: 'Paiement erroné',
  lignesTvaEncaissement: [tva(1900, 200000, 20000)], comptes, ...extra,
});
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurVente ? e.code : 'autre';
  }
  return undefined;
};

describe('delettrage', () => {
  it('delettrage-cas-b-inverse-la-tva', () => {
    const r = delettrer(entree());
    expect(r.ecriture).toMatchObject({ id: 'e9', journal: 'OD', date: '2026-11-20', statut: 'brouillon', type: 'correction', motif: 'Paiement erroné' });
    expect(r.ecriture?.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([['COL', 20000, 0], ['ATT', 0, 20000]]);
    expect(r.ecriture?.lignes.some((l) => l.compte === 'BQ' || l.compte === 'CLI')).toBe(false);
    expect(r.lignesTva).toEqual([{ ...tva(1900, -200000, -20000), dateExigibilite: '2026-11-20' }]);
    expect(r.annulation).toEqual({ id: 'ann1', annuleLettrageId: 'LET-A', motif: 'Paiement erroné', date: '2026-11-20' });
  });

  it('delettrage-cas-a-sans-ecriture', () => {
    const r = delettrer(entree({ lignesTvaEncaissement: [] }));
    expect(r.ecriture).toBeNull();
    expect(r.lignesTva).toEqual([]);
    expect(r.annulation.annuleLettrageId).toBe('LET-A');
  });

  it('tva-nulle-sans-ecriture', () => {
    const r = delettrer(entree({ lignesTvaEncaissement: [tva(600, 100000, 0)] }));
    expect(r.ecriture).toBeNull();
    expect(r.lignesTva).toHaveLength(1);
    expect(r.lignesTva[0]?.tvaCentimes).toBe(0);
    expect(Object.is(r.lignesTva[0]?.baseCentimes, -100000)).toBe(true);
    expect(Object.is(r.lignesTva[0]?.tvaCentimes, 0)).toBe(true);
  });

  it('lettrage-d-origine-intact', () => {
    const lignes = Object.freeze([Object.freeze(tva(1900, 200000, 20000))]);
    const copie = JSON.stringify(lignes);
    const r = delettrer(entree({ lignesTvaEncaissement: lignes }));
    expect(JSON.stringify(lignes)).toBe(copie);
    expect(r.lignesTva[0]).not.toBe(lignes[0]);
    expect(r.annulation).toHaveProperty('annuleLettrageId', 'LET-A');
  });

  it('motif-obligatoire', () => {
    for (const motif of ['', '   ', '\t\n']) expect(code(() => delettrer(entree({ motif })))).toBe('motif_obligatoire');
    expect(code(() => delettrer(entree({ motif: undefined as unknown as string })))).toBe('motif_obligatoire');
    expect(code(() => delettrer(entree({ motif: 'x' })))).toBeUndefined();
  });

  it('date-de-correction-pas-la-date-d-origine', () => {
    const r = delettrer(entree({ dateCorrection: '2026-12-02' }));
    expect(r.ecriture?.date).toBe('2026-12-02');
    expect(r.annulation.date).toBe('2026-12-02');
    expect(r.lignesTva.every((l) => l.dateExigibilite === '2026-12-02')).toBe(true);
    for (const dateCorrection of ['', '2026-02-30', '20/11/2026', 'x']) expect(code(() => delettrer(entree({ dateCorrection })))).toBe('date_invalide');
    expect(code(() => delettrer(entree({ dateCorrection: undefined as unknown as string })))).toBe('date_invalide');
  });

  it('deux-taux-deux-lignes', () => {
    const lignes = [tva(1900, 200000, 20000), tva(900, 100000, 10000)];
    const r = delettrer(entree({ lignesTvaEncaissement: lignes }));
    expect(r.ecriture?.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([['COL', 20000, 0], ['ATT', 0, 20000], ['COL', 10000, 0], ['ATT', 0, 10000]]);
    expect(r.lignesTva.map((l) => [l.tauxPdb, l.baseCentimes, l.tvaCentimes])).toEqual([[1900, -200000, -20000], [900, -100000, -10000]]);
    const inverse = delettrer(entree({ lignesTvaEncaissement: [...lignes].reverse() }));
    expect(inverse.lignesTva.map((l) => l.tauxPdb)).toEqual([900, 1900]);
    expect(inverse.ecriture?.lignes).toHaveLength(4);
  });

  it('ecriture-equilibree', () => {
    for (let n = 1; n <= 40; n++) {
      const lignes = Array.from({ length: n % 4 + 1 }, (_, i) => tva(600 + i, (n + i) * 1000, (n * 7 + i) * 13));
      const e = delettrer(entree({ lignesTvaEncaissement: lignes })).ecriture;
      expect(e).not.toBeNull();
      expect(verifierEquilibre(e!).equilibree).toBe(true);
    }
  });

  it('montants-invalides-refuses', () => {
    for (const v of [Number.NaN, Number.POSITIVE_INFINITY, 1.5, -100]) {
      expect(code(() => delettrer(entree({ lignesTvaEncaissement: [tva(1900, 200000, v)] })))).toBeDefined();
    }
    expect(() => delettrer(entree({ lignesTvaEncaissement: [tva(1900, 200000, centimes(5))] }))).not.toThrow();
  });

  it('identifiants-obligatoires', () => {
    for (const k of ['lettrageId', 'idAnnulation', 'idEcriture'] as const) {
      expect(code(() => delettrer(entree({ [k]: '  ' })))).toBe('identifiant_obligatoire');
    }
  });
});
