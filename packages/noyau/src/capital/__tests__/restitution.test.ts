import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { verifierEcriture } from '../../ecritures/modele.js';
import { ErreurCapital, qualifierVersementAssocie } from '../restitution.js';

const COMPTES = { capitalAppeleVerse: '101300', banque: '512000', courantAssocie: '455100' };
const c = centimes;

function versement(
  montant: number,
  extra: { decisionId?: string; soldeCourantAvant?: number } = {},
): Parameters<typeof qualifierVersementAssocie>[0] {
  const { decisionId, soldeCourantAvant = 0 } = extra;
  return {
    id: 'v1',
    date: '2026-06-30',
    journal: 'BQ',
    montant: c(montant),
    soldeCourantAvant: c(soldeCourantAvant),
    ...(decisionId === undefined ? {} : { decisionId }),
  };
}

describe('versement à un associé', () => {
  it('restitution-decidee', () => {
    const r = qualifierVersementAssocie(versement(50000, { decisionId: 'dec-1' }), COMPTES);
    expect(r.nature).toBe('restitution');
    expect(r.ecriture.statut).toBe('brouillon');
    expect(r.ecriture.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([
      ['101300', 50000, 0],
      ['512000', 0, 50000],
    ]);
    expect(verifierEcriture(r.ecriture).equilibree).toBe(true);
    expect(r.gesteRequis).toBeUndefined();
    expect(r.soldeCourantApres).toBeUndefined();
  });

  it('aucune-ligne-en-classe-7', () => {
    for (const decisionId of ['dec-1', undefined]) {
      const r = qualifierVersementAssocie(versement(50000, decisionId === undefined ? {} : { decisionId }), COMPTES);
      expect(r.ecriture.lignes.length).toBeGreaterThan(0);
      for (const l of r.ecriture.lignes) expect(l.compte.startsWith('7')).toBe(false);
    }
  });

  it('sans-decision-compte-courant', () => {
    const r = qualifierVersementAssocie(versement(50000, { soldeCourantAvant: -100000 }), COMPTES);
    expect(r.nature).toBe('compte_courant');
    expect(r.ecriture.statut).toBe('brouillon');
    expect(r.ecriture.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([
      ['455100', 50000, 0],
      ['512000', 0, 50000],
    ]);
    expect(r.ecriture.id).toBe('v1');
    expect(r.ecriture.journal).toBe('BQ');
    expect(r.ecriture.date).toBe('2026-06-30');
    expect(r.soldeCourantApres).toBe(-50000);
  });

  it('courant-debiteur-demande-g07', () => {
    const r = qualifierVersementAssocie(versement(50000, { soldeCourantAvant: 0 }), COMPTES);
    expect(r.soldeCourantApres).toBe(50000);
    expect(r.gesteRequis).toBe('G07');
    expect(r.nature).toBe('compte_courant');
  });

  it('courant-reste-crediteur-sans-g07', () => {
    const r = qualifierVersementAssocie(versement(50000, { soldeCourantAvant: -100000 }), COMPTES);
    expect(r.soldeCourantApres).toBe(-50000);
    expect(r.gesteRequis).toBeUndefined();
    // solde nul après : ni débiteur ni créditeur, pas de geste
    const nul = qualifierVersementAssocie(versement(100000, { soldeCourantAvant: -100000 }), COMPTES);
    expect(nul.soldeCourantApres).toBe(0);
    expect(nul.gesteRequis).toBeUndefined();
    // un centime au-dessus de zéro : débiteur
    const un = qualifierVersementAssocie(versement(100001, { soldeCourantAvant: -100000 }), COMPTES);
    expect(un.gesteRequis).toBe('G07');
  });

  it('decision-vide-traitee-comme-absente', () => {
    for (const decisionId of ['', '   ', '\t\n ']) {
      const r = qualifierVersementAssocie(versement(50000, { decisionId }), COMPTES);
      expect(r.nature).toBe('compte_courant');
      expect(r.ecriture.lignes[0]?.compte).toBe('455100');
    }
    const avecBlancs = qualifierVersementAssocie(versement(50000, { decisionId: ' dec-2 ' }), COMPTES);
    expect(avecBlancs.nature).toBe('restitution');
  });

  it('montant-invalide-refuse', () => {
    for (const m of [0, -1, Number.NaN, 1.5, Number.POSITIVE_INFINITY]) {
      let code: string | undefined;
      try {
        qualifierVersementAssocie({ ...versement(1), montant: m as never }, COMPTES);
      } catch (e) {
        code = e instanceof ErreurCapital ? e.code : 'autre';
      }
      expect(code).toBe('montant_invalide');
    }
  });
});
