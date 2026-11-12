import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { verifierEcriture } from '../../ecritures/modele.js';
import { ErreurEmprunt, type Echeance } from '../echeance.js';
import { ventiler } from '../ventilation.js';

const c = centimes;
const ech: Echeance = { date: '2027-01-05', capital: c(80000), interets: c(15000), assurance: c(5000) };
const ligne = (montant: number) => ({ id: 'ligne-1', dateOperation: '2027-01-05', montant: c(montant), libelle: 'ECHEANCE PRET FICTIF' });
const code = (fn: () => unknown): string => {
  try { fn(); } catch (e) { if (e instanceof ErreurEmprunt) return e.code; throw e; }
  return 'aucune';
};

describe('ventilation capital / intérêts / assurance', () => {
  it('ventilation-164-6611-616', () => {
    const r = ventiler(ligne(-100000), ech);
    if (r.etat !== 'brouillon') throw new Error('brouillon attendu');
    expect(r.ecriture.statut).toBe('brouillon');
    expect(r.ecriture.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([
      ['164', 80000, 0],
      ['6611', 15000, 0],
      ['616', 5000, 0],
      ['512', 0, 100000],
    ]);
    // Sans assurance ni intérêts : la ligne à zéro n'existe pas.
    const sans = ventiler(ligne(-80000), { ...ech, interets: c(0), assurance: c(0) });
    if (sans.etat !== 'brouillon') throw new Error('brouillon attendu');
    expect(sans.ecriture.lignes.map((l) => l.compte)).toEqual(['164', '512']);
  });

  it('somme-egale-au-debit', () => {
    const r = ventiler(ligne(-100000), ech);
    if (r.etat !== 'brouillon') throw new Error('brouillon attendu');
    expect(verifierEcriture(r.ecriture).equilibree).toBe(true);
    expect(code(() => ventiler(ligne(-100001), ech))).toBe('somme_differente');
    expect(code(() => ventiler(ligne(-99999), ech))).toBe('somme_differente');
    expect(code(() => ventiler(ligne(100000), ech))).toBe('pas_un_debit');
    expect(code(() => ventiler(ligne(0), ech))).toBe('pas_un_debit');
    for (const m of [Number.NaN, -1.5, -Infinity]) expect(code(() => ventiler({ ...ligne(-1), montant: m as never }, ech))).toBe('pas_un_debit');
  });

  it('tableau-incoherent-refuse', () => {
    expect(code(() => ventiler(ligne(-100000), { ...ech, capital: c(105000), interets: c(-5000) }))).toBe('tableau_incoherent');
    expect(code(() => ventiler(ligne(-100000), { ...ech, assurance: c(-1) }))).toBe('tableau_incoherent');
    expect(code(() => ventiler(ligne(-100000), { ...ech, capital: c(-1) }))).toBe('tableau_incoherent');
    expect(code(() => ventiler(ligne(-100000), { ...ech, capital: Number.NaN as never }))).toBe('tableau_incoherent');
    expect(code(() => ventiler(ligne(-100000), { ...ech, capital: 1.5 as never }))).toBe('tableau_incoherent');
    expect(code(() => ventiler(ligne(-100000), { ...ech, interets: Infinity as never }))).toBe('tableau_incoherent');
    expect(code(() => ventiler(ligne(-100000), { ...ech, capital: c(0), interets: c(0), assurance: c(0) }))).toBe('tableau_incoherent');
  });

  it('sans-tableau-carte-ventiler', () => {
    const r = ventiler(ligne(-100000), undefined);
    expect(r).toEqual({ etat: 'carte', carte: 'ventiler', ligneId: 'ligne-1', montant: 100000 });
    expect('ecriture' in r).toBe(false); // aucun montant deviné
  });
});
