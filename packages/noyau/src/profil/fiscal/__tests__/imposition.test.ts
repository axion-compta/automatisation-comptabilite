import { describe, expect, it } from 'vitest';
import type { LigneRegleForme } from '../../forme.js';
import { ErreurProfil } from '../../types.js';
import { ajouterLigneImposition, impositionAuJour, impotParDefaut, verifierOptionMvp, type LigneImposition } from '../imposition.js';

const S = 'societe-fictive-1';
const r = (forme: string, valeur: string): LigneRegleForme => ({ forme, comportement: 'impot_par_defaut', valeur, source: 'source inventee, a verifier' });
const MATRICE = [r('SARL', 'IS'), r('SAS', 'IS'), r('SASU', 'IS'), r('EI', 'IR'), r('EURL_PP', 'IR'), r('EURL_PM', 'IS'), r('SCI', 'IR')];
const ligne = (effetDebut: string, effetFin: string | null = null, regime: LigneImposition['regime'] = 'micro'): LigneImposition => ({
  societeId: S, effetDebut, effetFin, impot: 'IR', categorie: 'BIC', regime, motif: 'creation', statut: 'propose',
});
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};

describe('imposition', () => {
  it('eurl-personne-physique-ir-p07', () => {
    expect(impotParDefaut(MATRICE, 'EURL', true)).toEqual({ impot: 'IR', statut: 'a_confirmer' });
    expect(impotParDefaut(MATRICE, 'EURL', false)).toEqual({ impot: 'IS', statut: 'a_confirmer' });
  });

  it('sarl-is-p07', () => {
    expect(impotParDefaut(MATRICE, 'SARL', null)).toEqual({ impot: 'IS', statut: 'a_confirmer' });
    expect(impotParDefaut(MATRICE, 'EI', null)).toEqual({ impot: 'IR', statut: 'a_confirmer' });
  });

  it('jamais-confirme-seul', () => {
    for (const forme of ['SARL', 'SAS', 'SASU', 'EI', 'SCI']) expect(impotParDefaut(MATRICE, forme, null).statut).toBe('a_confirmer');
    expect(impotParDefaut(MATRICE, 'EURL', true).statut).toBe('a_confirmer');
    expect(impotParDefaut(MATRICE, 'SCI', true)).not.toHaveProperty('motif');
  });

  it('associe-unique-inconnu', () => {
    expect(impotParDefaut(MATRICE, 'EURL', null)).toEqual({ impot: null, statut: 'a_confirmer', motif: 'associe_unique_inconnu' });
    expect(impotParDefaut([r('SARL', 'XYZ')], 'SARL', null)).toEqual({ impot: null, statut: 'a_confirmer', motif: 'valeur_matrice_invalide' });
    expect(impotParDefaut([], 'SARL', null)).toEqual({ impot: null, statut: 'a_confirmer', motif: 'forme_sans_regle' });
  });

  it('ajout-ferme-la-ligne-ouverte', () => {
    const avant = [ligne('2025-01-01')];
    const apres = ajouterLigneImposition(avant, ligne('2026-01-01', null, 'reel_simplifie'));
    expect(apres).toHaveLength(2);
    expect(apres[0]?.effetFin).toBe('2026-01-01');
    expect(apres[1]?.effetFin).toBeNull();
    expect(avant[0]?.effetFin).toBeNull();
    const autre = { ...ligne('2024-01-01'), societeId: 'societe-fictive-2' };
    expect(ajouterLigneImposition([autre], ligne('2025-01-01'))[0]?.effetFin).toBeNull();
  });

  it('chevauchement-refuse', () => {
    const h = [ligne('2025-01-01')];
    expect(code(() => ajouterLigneImposition(h, ligne('2025-01-01')))).toBe('chevauchement');
    expect(code(() => ajouterLigneImposition(h, ligne('2024-06-01')))).toBe('chevauchement');
    const ferme = [ligne('2025-01-01', '2026-01-01')];
    expect(code(() => ajouterLigneImposition(ferme, ligne('2025-06-01')))).toBe('chevauchement');
    expect(ajouterLigneImposition(ferme, ligne('2026-01-01'))).toHaveLength(2);
    expect(code(() => ajouterLigneImposition(h, ligne('2025-02-30')))).toBe('date_invalide');
    expect(code(() => ajouterLigneImposition([], ligne('2026-01-01', '2025-01-01')))).toBe('ordre_inverse');
    expect(code(() => ajouterLigneImposition([], ligne('2026-01-01', '2026-01-01')))).toBe('ordre_inverse');
  });

  it('lecture-a-la-date', () => {
    const h = [ligne('2025-01-01', '2026-01-01'), ligne('2026-01-01', null, 'reel_normal')];
    expect(impositionAuJour(h, S, '2025-12-31')?.regime).toBe('micro');
    expect(impositionAuJour(h, S, '2026-01-01')?.regime).toBe('reel_normal');
    expect(impositionAuJour(h, S, '2026-01-02')?.regime).toBe('reel_normal');
    expect(impositionAuJour(h, S, '2024-12-31')).toBeNull();
    expect(impositionAuJour(h, 'autre', '2026-01-01')).toBeNull();
  });

  it('option-is-refusee-mvp', () => {
    for (const forme of ['EI', 'EURL', 'SCI']) expect(code(() => verifierOptionMvp(forme, 'IS', 'IR'))).toBe('option_pas_encore_prise_en_charge');
    expect(code(() => verifierOptionMvp('EURL', 'IS', null))).toBe('option_pas_encore_prise_en_charge');
    expect(code(() => verifierOptionMvp('EI', 'IR', 'IR'))).toBeUndefined();
    expect(code(() => verifierOptionMvp('SARL', 'IS', 'IS'))).toBeUndefined();
    expect(code(() => verifierOptionMvp('EURL', 'IS', 'IS'))).toBeUndefined();
  });

  it('historique-donne-dans-le-desordre', () => {
    const h = [ligne('2026-01-01', null, 'reel_normal'), ligne('2025-01-01', '2026-01-01')];
    expect(impositionAuJour(h, S, '2025-06-01')?.regime).toBe('micro');
    expect(impositionAuJour(h, S, '2026-06-01')?.regime).toBe('reel_normal');
    expect(code(() => ajouterLigneImposition(h, ligne('2025-09-01')))).toBe('chevauchement');
    const ouvert = ajouterLigneImposition(h, ligne('2027-01-01'));
    expect(ouvert.find((l) => l.effetDebut === '2026-01-01')?.effetFin).toBe('2027-01-01');
  });
});
