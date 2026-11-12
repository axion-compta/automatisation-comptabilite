import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { verifierEquilibre } from '../../ecritures/modele.js';
import { effetTraitement } from '../traitement.js';
import { ErreurPartNonDeductible, lignesAvecPartPerdue, type ComptesPartPerdue, type FacturePartPerdue } from '../part-non-deductible.js';

const c = centimes;
const COMPTES: ComptesPartPerdue = { tvaDeductible: '445660', fournisseur: '401000' };
// Factures fictives : taux inventé de 20 % sur le hors taxe.
const CARBURANT: FacturePartPerdue = { libelle: 'Carburant fictif', htCentimes: c(10000), ttcCentimes: c(12000), compteCharge: '606100' };
const VEHICULE: FacturePartPerdue = { libelle: 'Véhicule de tourisme fictif', htCentimes: c(2000000), ttcCentimes: c(2400000), compteCharge: '218200' };

function effet(f: FacturePartPerdue, partPointsDeBase?: number) {
  return effetTraitement({ code: 'DEDUCTIBLE', sens: 'achat', base: f.htCentimes, tvaLue: c(f.ttcCentimes - f.htCentimes), franchise: false, ...(partPointsDeBase === undefined ? {} : { partPointsDeBase }) });
}
function solde(lignes: ReturnType<typeof lignesAvecPartPerdue>, compte: string) {
  const l = lignes.filter((x) => x.compte === compte);
  return { debit: l.reduce((s, x) => s + x.debit, 0), credit: l.reduce((s, x) => s + x.credit, 0) };
}
function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    if (e instanceof ErreurPartNonDeductible) return e.code;
    throw e;
  }
  return undefined;
}

describe('part non déductible passée en charge', () => {
  it('carburant-part-perdue-en-charge', () => {
    // 80 % déductible : 1 600 déductibles, 400 perdus, ajoutés à la charge.
    const e = effet(CARBURANT, 8000);
    expect([e.deductible, e.perdue]).toEqual([1600, 400]);
    const l = lignesAvecPartPerdue(CARBURANT, e, COMPTES);
    expect(solde(l, '606100')).toEqual({ debit: 10400, credit: 0 });
    expect(solde(l, '445660')).toEqual({ debit: 1600, credit: 0 });
    expect(solde(l, '401000')).toEqual({ debit: 0, credit: 12000 });
  });

  it('vehicule-tourisme-tout-en-charge', () => {
    const e = effet(VEHICULE, 0);
    const l = lignesAvecPartPerdue(VEHICULE, e, COMPTES);
    expect(solde(l, '218200')).toEqual({ debit: 2400000, credit: 0 });
    expect(l.some((x) => x.compte === '445660')).toBe(false);
    expect(l).toHaveLength(2);
  });

  it('aucune-part-perdue-aucune-ligne-en-plus', () => {
    const l = lignesAvecPartPerdue(CARBURANT, effet(CARBURANT), COMPTES);
    expect(l).toHaveLength(3);
    expect(solde(l, '606100')).toEqual({ debit: 10000, credit: 0 });
    expect(solde(l, '445660')).toEqual({ debit: 2000, credit: 0 });
    // Facture sans TVA : ni ligne de TVA, ni part perdue.
    const sans: FacturePartPerdue = { ...CARBURANT, ttcCentimes: CARBURANT.htCentimes };
    const e0 = effetTraitement({ code: 'DEDUCTIBLE', sens: 'achat', base: sans.htCentimes, tvaLue: c(0), franchise: false });
    expect(lignesAvecPartPerdue(sans, e0, COMPTES)).toHaveLength(2);
  });

  it('ecriture-equilibree-au-centime', () => {
    // Parts impaires : 3333 points de base d'une TVA de 2 001 centimes.
    const f: FacturePartPerdue = { libelle: 'Achat fictif', htCentimes: c(10005), ttcCentimes: c(12006), compteCharge: '606100' };
    for (const part of [0, 1, 3333, 5000, 9999, 10000]) {
      const l = lignesAvecPartPerdue(f, effet(f, part), COMPTES);
      const r = verifierEquilibre({ id: 'e', journal: 'HA', date: '2026-01-15', statut: 'propose', lignes: l });
      expect(r.equilibree, String(part)).toBe(true);
      expect(l.reduce((s, x) => s + x.debit, 0)).toBe(12006);
    }
    // Un effet qui ne rend pas la TVA de la facture est refusé.
    expect(code(() => lignesAvecPartPerdue(CARBURANT, { ...effet(CARBURANT), perdue: c(1) }, COMPTES))).toBe('effet_incoherent');
    expect(code(() => lignesAvecPartPerdue({ ...CARBURANT, ttcCentimes: c(9999) }, effet(CARBURANT), COMPTES))).toBe('montant_invalide');
    expect(code(() => lignesAvecPartPerdue({ ...CARBURANT, htCentimes: c(-1) }, effet(CARBURANT), COMPTES))).toBe('montant_invalide');
  });

  it('comptes-en-argument', () => {
    const autres: ComptesPartPerdue = { tvaDeductible: '445000', fournisseur: '402000' };
    const l = lignesAvecPartPerdue(CARBURANT, effet(CARBURANT, 5000), autres);
    expect(l.map((x) => x.compte).sort()).toEqual(['402000', '445000', '606100']);
    expect(solde(l, '445000').debit).toBe(1000);
    expect(code(() => lignesAvecPartPerdue(CARBURANT, effet(CARBURANT), { ...COMPTES, fournisseur: '' }))).toBe('compte_manquant');
    expect(code(() => lignesAvecPartPerdue({ ...CARBURANT, compteCharge: ' ' }, effet(CARBURANT), COMPTES))).toBe('compte_manquant');
    expect(code(() => lignesAvecPartPerdue(CARBURANT, effet(CARBURANT), { ...COMPTES, tvaDeductible: '' }))).toBe('compte_manquant');
  });
});
