import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../argent/index.js';
import { verifierEquilibre } from '../../ecritures/modele.js';
import {
  choisirCompteCourant,
  compteDeLaPersonne,
  preparerRemboursement,
  proposerEcritureRemboursement,
  type Personne,
} from '../remboursement.js';
import { ErreurFrais, type CodeErreurFrais, type Frais } from '../types.js';

const c = (n: number): Centimes => centimes(n);
const associee: Personne = { id: 'p1', qualite: 'associe' };
const dirigeant: Personne = { id: 'p2', qualite: 'dirigeant_non_associe' };
const salarie: Personne = { id: 'p3', qualite: 'salarie' };

function frais(id: string, montant: number, extra: Partial<Frais> = {}): Frais {
  return {
    id,
    personneId: 'p1',
    nature: 'depense',
    dateDepense: '2026-03-10',
    libelle: 'Fournitures fictives',
    montantTtc: c(montant),
    tva: c(0),
    payeur: 'personne',
    statut: 'valide',
    justificatifPerdu: false,
    partPersoTtc: c(0),
    version: 1,
    ...extra,
  };
}

function code(f: () => unknown): CodeErreurFrais | 'aucune' {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurFrais) return e.code;
    throw e;
  }
  return 'aucune';
}

const lot = [frais('f1', 4000), frais('f2', 2550), frais('f3', 1000)];
const ids = ['f1', 'f2', 'f3'];
const comptes = { associe: 'CA', nonAssocie: 'CN' };
const e3 = { comptePersonne: 'CP', banque: 'CB' };
const ligne = (montant: number) => ({ id: 'b1', montant: montant as Centimes, date: '2026-04-02' });
const ctx = { id: 'e1', journal: 'BQ' };

describe('remboursement de frais', () => {
  it('nf16-remboursement-somme-des-valides', () => {
    const r = preparerRemboursement(associee, lot, ids);
    expect(r.montant).toBe(7550);
    expect(r.fraisIds).toEqual(ids);
    expect(preparerRemboursement(associee, lot, ['f2']).montant).toBe(2550);
    expect(preparerRemboursement(associee, lot, ids, c(7550)).montant).toBe(7550);
    expect(preparerRemboursement(associee, lot, ids, c(5000)).montant).toBe(5000);
  });

  it('nf16-demande-superieure-refusee', () => {
    expect(code(() => preparerRemboursement(associee, lot, ids, c(7551)))).toBe('remboursement_superieur');
    expect(code(() => preparerRemboursement(associee, lot, ['f2'], c(2551)))).toBe('remboursement_superieur');
  });

  it('nf17-compte-courant-associe', () => {
    expect(() => choisirCompteCourant(associee)).not.toThrow();
    expect(compteDeLaPersonne(associee, comptes)).toBe('CA');
    expect(compteDeLaPersonne(dirigeant, comptes)).toBe('CN');
  });

  it('compte-courant-non-associe-refuse', () => {
    expect(code(() => choisirCompteCourant(dirigeant))).toBe('compte_courant_reserve_associes');
    expect(code(() => choisirCompteCourant(salarie))).toBe('compte_courant_reserve_associes');
  });

  it('salarie-hors-mvp', () => {
    const f = [frais('f1', 1000, { personneId: 'p3' })];
    expect(code(() => preparerRemboursement(salarie, f, ['f1']))).toBe('entree_invalide');
    expect(code(() => compteDeLaPersonne(salarie, comptes))).toBe('entree_invalide');
    expect(preparerRemboursement(dirigeant, [frais('f1', 1000, { personneId: 'p2' })], ['f1']).montant).toBe(1000);
  });

  it('deja-rembourse-exclu', () => {
    const f = [frais('f1', 4000, { remboursementId: 'r0' }), frais('f2', 2550), frais('f4', 900, { statut: 'propose' })];
    expect(code(() => preparerRemboursement(associee, f, ['f1']))).toBe('entree_invalide');
    expect(code(() => preparerRemboursement(associee, f, ['f4']))).toBe('entree_invalide');
    expect(preparerRemboursement(associee, f, ['f2']).montant).toBe(2550);
  });

  it('paye-societe-exclu', () => {
    const f = [frais('f1', 4000, { payeur: 'societe' }), frais('f2', 800, { payeur: 'a_confirmer' }), frais('f5', 700, { personneId: 'p9' })];
    expect(code(() => preparerRemboursement(associee, f, ['f1']))).toBe('entree_invalide');
    expect(code(() => preparerRemboursement(associee, f, ['f2']))).toBe('entree_invalide');
    expect(code(() => preparerRemboursement(associee, f, ['f5']))).toBe('entree_invalide');
  });

  it('id-en-double-refuse', () => {
    expect(code(() => preparerRemboursement(associee, lot, ['f1', 'f1']))).toBe('entree_invalide');
    expect(code(() => preparerRemboursement(associee, lot, ['inconnu']))).toBe('entree_invalide');
    expect(code(() => preparerRemboursement(associee, [lot[0]!, lot[0]!], ['f1']))).toBe('entree_invalide');
  });

  it('e3-montant-egal-au-centime', () => {
    const e = proposerEcritureRemboursement(c(7550), ligne(7550), e3, ctx);
    expect(e.statut).toBe('propose');
    expect(e.id).toBe('e1');
    expect(e.journal).toBe('BQ');
    expect(e.date).toBe('2026-04-02');
    const [d, k] = e.lignes;
    expect([d!.compte, d!.debit, d!.credit]).toEqual(['CP', 7550, 0]);
    expect([k!.compte, k!.debit, k!.credit]).toEqual(['CB', 0, 7550]);
    expect(verifierEquilibre(e).equilibree).toBe(true);
    expect(code(() => proposerEcritureRemboursement(c(7550), ligne(7549), e3, ctx))).toBe('entree_invalide');
    expect(code(() => proposerEcritureRemboursement(c(7550), ligne(7551), e3, ctx))).toBe('entree_invalide');
  });

  it('entrees-invalides', () => {
    expect(code(() => preparerRemboursement(associee, lot, []))).toBe('entree_invalide');
    for (const m of [Number.NaN, Infinity, 1.5, 0, -100]) {
      expect(code(() => preparerRemboursement(associee, lot, ids, m as Centimes))).toBe('entree_invalide');
      expect(code(() => proposerEcritureRemboursement(m as Centimes, ligne(7550), e3, ctx))).toBe('entree_invalide');
      expect(code(() => proposerEcritureRemboursement(c(7550), ligne(m), e3, ctx))).toBe('entree_invalide');
    }
    expect(code(() => proposerEcritureRemboursement(c(7550), { ...ligne(7550), date: '' }, e3, ctx))).toBe('entree_invalide');
  });
});
