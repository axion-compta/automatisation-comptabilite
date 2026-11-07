import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import {
  ErreurEcriture,
  verifierEcriture,
  verifierEquilibre,
  verifierLigne,
  type Ecriture,
  type LigneEcriture,
} from '../modele.js';

function ligne(compte: string, debit: number, credit: number): LigneEcriture {
  return { compte, libelle: 'Achat fictif', debit: centimes(debit), credit: centimes(credit) };
}
function ecriture(lignes: LigneEcriture[]): Ecriture {
  return { id: 'e1', journal: 'AC', date: '2026-01-15', statut: 'brouillon', lignes };
}
function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurEcriture) return e.code;
    throw e;
  }
  return undefined;
}

describe('modèle d\'écriture', () => {
  it('equilibre-achat-fictif', () => {
    const e = ecriture([ligne('607', 10000, 0), ligne('4456', 1250, 0), ligne('401', 0, 11250)]);
    const r = verifierEquilibre(e);
    expect(r).toEqual({ equilibree: true, totalDebit: 11250, totalCredit: 11250, ecart: 0 });
    expect(verifierEcriture(e).equilibree).toBe(true);
  });

  it('desequilibre-un-centime', () => {
    const e = ecriture([ligne('607', 10000, 0), ligne('401', 0, 9999)]);
    expect(verifierEquilibre(e)).toMatchObject({ equilibree: false, ecart: 1 });
    expect(code(() => verifierEcriture(e))).toBe('desequilibre');
    const inverse = ecriture([ligne('607', 9999, 0), ligne('401', 0, 10000)]);
    expect(verifierEquilibre(inverse).ecart).toBe(-1);
  });

  it('une-seule-ligne-refusee', () => {
    expect(code(() => verifierEcriture(ecriture([ligne('607', 100, 0)])))).toBe('une_seule_ligne');
    expect(code(() => verifierEcriture(ecriture([])))).toBe('une_seule_ligne');
  });

  it('montant-nul-refuse', () => {
    expect(code(() => verifierEcriture(ecriture([ligne('607', 0, 0), ligne('401', 0, 0)])))).toBe(
      'montant_nul',
    );
    expect(code(() => verifierLigne(ligne('607', 0, 0)))).toBe('ligne_nulle');
    // Une ligne nulle parmi des lignes non nulles est refusée par la ligne.
    const e = ecriture([ligne('607', 100, 0), ligne('401', 0, 0), ligne('4456', 0, 100)]);
    expect(code(() => verifierEcriture(e))).toBe('ligne_nulle');
  });

  it('ligne-double-sens-refusee', () => {
    expect(code(() => verifierLigne(ligne('607', 100, 100)))).toBe('ligne_double_sens');
    const e = ecriture([ligne('607', 100, 100), ligne('401', 0, 0)]);
    expect(code(() => verifierEcriture(e))).toBe('ligne_double_sens');
    expect(code(() => verifierLigne(ligne('607', 100, 0)))).toBeUndefined();
    expect(code(() => verifierLigne(ligne('401', 0, 100)))).toBeUndefined();
  });

  it('montant-negatif-refuse', () => {
    expect(code(() => verifierLigne(ligne('607', -100, 0)))).toBe('montant_negatif');
    expect(code(() => verifierLigne(ligne('401', 0, -100)))).toBe('montant_negatif');
    const e = ecriture([ligne('607', 100, 0), ligne('401', 0, -100)]);
    expect(code(() => verifierEcriture(e))).toBe('montant_negatif');
  });

  it('code-rang-trop-grand-porte', () => {
    const e = new ErreurEcriture('rang_trop_grand', 'Rang fictif trop grand.');
    expect(e.code).toBe('rang_trop_grand');
    expect(e.name).toBe('ErreurEcriture');
  });

  it('ordre-des-lignes-sans-effet', () => {
    const l = [ligne('607', 10000, 0), ligne('4456', 1250, 0), ligne('401', 0, 11250)];
    const a = verifierEquilibre(ecriture(l));
    const b = verifierEquilibre(ecriture([...l].reverse()));
    const c = verifierEquilibre(ecriture([l[1]!, l[2]!, l[0]!]));
    expect(b).toEqual(a);
    expect(c).toEqual(a);
  });
});
