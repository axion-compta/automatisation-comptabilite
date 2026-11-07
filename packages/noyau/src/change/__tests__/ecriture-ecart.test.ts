import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { verifierEcriture, type Ecriture } from '../../ecritures/modele.js';
import { ecritureReglementFournisseur, soldeTiers } from '../ecriture-ecart.js';
import { paiementPartiel } from '../paiement-partiel.js';

// Comptes, devise et montants INVENTÉS pour les tests.
const COMPTES = { fournisseur: 'FO', banque: 'BQ', perte: 'PE', gain: 'GA', frais: 'FR' };
const CTX = { id: 'r1', date: '2026-03-15', journal: 'BQ' };
const PIECE = { montantDevise: 100000, tauxE8: 92000000, montantEuros: 92000 };
const FACTURE: Ecriture = {
  id: 'f1',
  journal: 'AC',
  date: '2026-03-01',
  statut: 'valide',
  lignes: [
    { compte: 'CH', libelle: 'Achat', debit: centimes(92000), credit: centimes(0) },
    { compte: 'FO', libelle: 'Facture', debit: centimes(0), credit: centimes(92000) },
  ],
};
const p1 = () => paiementPartiel(PIECE, { devise: 0, euros: 0 }, { montantDevise: 40000, eurosPayes: 36000, frais: 0 }, 'demi-superieur');
const p2 = () =>
  paiementPartiel(PIECE, { devise: 40000, euros: 36800 }, { montantDevise: 60000, eurosPayes: 57000, frais: 0 }, 'demi-superieur');
const rows = (e: Ecriture) => e.lignes.map((l) => [l.compte, l.debit, l.credit]);

describe('écriture de règlement fournisseur en devise', () => {
  it('premier-paiement-gain', () => {
    const e = ecritureReglementFournisseur(p1(), 0, COMPTES, CTX);
    expect(rows(e)).toEqual([
      ['FO', 36800, 0],
      ['BQ', 0, 36000],
      ['GA', 0, 800],
    ]);
  });

  it('dernier-paiement-perte', () => {
    const e = ecritureReglementFournisseur(p2(), 0, COMPTES, CTX);
    expect(rows(e)).toEqual([
      ['FO', 55200, 0],
      ['PE', 1800, 0],
      ['BQ', 0, 57000],
    ]);
  });

  it('fournisseur-solde-apres-deux-paiements', () => {
    const ecritures = [FACTURE, ecritureReglementFournisseur(p1(), 0, COMPTES, CTX), ecritureReglementFournisseur(p2(), 0, COMPTES, CTX)];
    expect(soldeTiers(ecritures, 'FO')).toBe(0);
    expect(soldeTiers([FACTURE], 'FO')).toBe(-92000);
    expect(soldeTiers(ecritures.slice(0, 2), 'FO')).toBe(-55200);
    expect(soldeTiers([], 'FO')).toBe(0);
    expect(soldeTiers(ecritures, 'ABSENT')).toBe(0);
    expect(soldeTiers([...ecritures].reverse(), 'FO')).toBe(0);
  });

  it('avec-frais-ligne-separee', () => {
    const r = paiementPartiel(PIECE, { devise: 0, euros: 0 }, { montantDevise: 40000, eurosPayes: 36000, frais: 500 }, 'demi-superieur');
    const e = ecritureReglementFournisseur(r, 500, COMPTES, CTX);
    expect(rows(e)).toEqual([
      ['FO', 36800, 0],
      ['FR', 500, 0],
      ['BQ', 0, 36000],
      ['GA', 0, 1300],
    ]);
    expect(verifierEcriture(e).equilibree).toBe(true);
    // Frais non concordants, négatifs, NaN, infinis ou non entiers : erreur.
    for (const f of [0, 400, 501, -500, Number.NaN, Infinity, 500.5]) {
      expect(() => ecritureReglementFournisseur(r, f, COMPTES, CTX)).toThrow();
    }
  });

  it('ecart-nul-pas-de-ligne', () => {
    const r = paiementPartiel(PIECE, { devise: 0, euros: 0 }, { montantDevise: 40000, eurosPayes: 36800, frais: 0 }, 'demi-superieur');
    const e = ecritureReglementFournisseur(r, 0, COMPTES, CTX);
    expect(rows(e)).toEqual([
      ['FO', 36800, 0],
      ['BQ', 0, 36800],
    ]);
  });

  it('toujours-brouillon', () => {
    for (const r of [p1(), p2()]) {
      expect(ecritureReglementFournisseur(r, 0, COMPTES, CTX).statut).toBe('brouillon');
    }
  });

  it('equilibre-verifie', () => {
    const avecFrais = paiementPartiel(PIECE, { devise: 40000, euros: 36800 }, { montantDevise: 60000, eurosPayes: 57000, frais: 300 }, 'demi-superieur');
    for (const [r, f] of [[p1(), 0], [p2(), 0], [avecFrais, 300]] as const) {
      expect(verifierEcriture(ecritureReglementFournisseur(r, f, COMPTES, CTX)).equilibree).toBe(true);
    }
  });
});
