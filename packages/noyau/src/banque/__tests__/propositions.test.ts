import { describe, expect, it } from 'vitest';
import { verifierEcriture } from '../../ecritures/modele.js';
import { ErreurBanque, proposerFrais, proposerVirementInterne, soldeAttente } from '../propositions.js';

// Comptes passés en argument (données de test).
const cFrais = { frais: '627000', banque: '512000' };
const cVir = { attente: '580000', banqueSource: '512001', banqueCible: '512002' };
const frais = (montant: number) =>
  proposerFrais(
    {
      id: 'E1',
      date: '2026-01-31',
      journal: 'BQ',
      libelle: 'FRAIS TENUE DE COMPTE',
      montant,
      ligneBancaireId: 'LB1',
    },
    cFrais,
  );
const virement = (montant = 50000, comptes = cVir) =>
  proposerVirementInterne(
    { idSortie: 'E2', idEntree: 'E3', date: '2026-02-01', journal: 'BQ', montant },
    comptes,
  );

describe('propositions bancaires', () => {
  it('frais-tenue-de-compte', () => {
    const e = frais(1250);
    expect(e.statut).toBe('brouillon');
    expect(e.source).toEqual({ ligneBancaireId: 'LB1' });
    expect(e.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([
      ['627000', 1250, 0],
      ['512000', 0, 1250],
    ]);
  });

  it('virement-interne-deux-ecritures', () => {
    const [sortie, entree] = virement();
    expect(sortie?.id).toBe('E2');
    expect(entree?.id).toBe('E3');
    expect(sortie?.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([
      ['580000', 50000, 0],
      ['512001', 0, 50000],
    ]);
    expect(entree?.lignes.map((l) => [l.compte, l.debit, l.credit])).toEqual([
      ['512002', 50000, 0],
      ['580000', 0, 50000],
    ]);
    expect([sortie?.statut, entree?.statut]).toEqual(['brouillon', 'brouillon']);
  });

  it('attente-soldee-a-zero', () => {
    expect(soldeAttente(virement(), '580000')).toBe(0);
    expect(soldeAttente([], '580000')).toBe(0);
  });

  it('jambe-manquante-attente-non-soldee', () => {
    const [sortie, entree] = virement();
    expect(soldeAttente([sortie!], '580000')).toBe(50000);
    expect(soldeAttente([entree!], '580000')).toBe(-50000);
  });

  it('montant-nul-ou-negatif-refuse', () => {
    for (const m of [0, -1, Number.NaN, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => frais(m)).toThrow(ErreurBanque);
      expect(() => virement(m)).toThrow(ErreurBanque);
    }
    try {
      frais(0);
    } catch (e) {
      expect((e as ErreurBanque).code).toBe('montant_invalide');
    }
  });

  it('meme-compte-refuse', () => {
    expect(() => virement(50000, { ...cVir, banqueCible: '512001' })).toThrow(ErreurBanque);
    try {
      virement(50000, { ...cVir, banqueCible: '512001' });
    } catch (e) {
      expect((e as ErreurBanque).code).toBe('meme_compte');
    }
  });

  it('ecritures-equilibrees', () => {
    for (const e of [frais(1250), ...virement()]) {
      expect(verifierEcriture(e).equilibree).toBe(true);
      expect(e.statut).not.toBe('valide');
    }
  });
});
