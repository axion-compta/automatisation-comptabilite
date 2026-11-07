import { describe, expect, it } from 'vitest';
import {
  ErreurParametre,
  ajouterVersion,
  parametreAuJour,
  utilisablePourOfficiel,
  type ParametreLegal,
} from '../au-jour.js';

function ligne(sur: Partial<ParametreLegal> = {}): ParametreLegal {
  return {
    cle: 'fictif.taux_a',
    pays: 'XX',
    valeur: 'valeur-1',
    effet_debut: '2025-01-01',
    effet_fin: '2026-01-01',
    statut: 'valide',
    source: 'source fictive',
    date_releve: '2025-01-01',
    ...sur,
  };
}

function codeErreur(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurParametre ? e.code : 'autre';
  }
  return undefined;
}

describe('paramètres au jour D', () => {
  it('ligne-en-vigueur', () => {
    const l = [ligne(), ligne({ valeur: 'valeur-2', effet_debut: '2026-01-01', effet_fin: null })];
    expect(parametreAuJour(l, 'fictif.taux_a', 'XX', '2025-06-15').valeur).toBe('valeur-1');
    expect(parametreAuJour(l, 'fictif.taux_a', 'XX', '2026-03-01').valeur).toBe('valeur-2');
  });

  it('fin-exclue', () => {
    const l = [ligne()];
    expect(parametreAuJour(l, 'fictif.taux_a', 'XX', '2025-12-31').valeur).toBe('valeur-1');
    expect(codeErreur(() => parametreAuJour(l, 'fictif.taux_a', 'XX', '2026-01-01'))).toBe('parametre_absent');
  });

  it('absent-leve-erreur', () => {
    expect(codeErreur(() => parametreAuJour([], 'fictif.taux_a', 'XX', '2025-06-15'))).toBe('parametre_absent');
    expect(codeErreur(() => parametreAuJour([ligne()], 'fictif.taux_a', 'XY', '2025-06-15'))).toBe('parametre_absent');
    expect(codeErreur(() => parametreAuJour([ligne()], 'fictif.autre', 'XX', '2025-06-15'))).toBe('parametre_absent');
  });

  it('ambigu-leve-erreur', () => {
    const l = [ligne(), ligne({ valeur: 'valeur-2' })];
    expect(codeErreur(() => parametreAuJour(l, 'fictif.taux_a', 'XX', '2025-06-15'))).toBe('parametre_ambigu');
  });

  it('retire-ignore', () => {
    const l = [ligne({ statut: 'retire', valeur: 'ancienne' }), ligne({ valeur: 'courante' })];
    expect(parametreAuJour(l, 'fictif.taux_a', 'XX', '2025-06-15').valeur).toBe('courante');
    expect(codeErreur(() => parametreAuJour([ligne({ statut: 'retire' })], 'fictif.taux_a', 'XX', '2025-06-15'))).toBe(
      'parametre_absent',
    );
  });

  it('a-verifier-non-officiel', () => {
    expect(utilisablePourOfficiel(ligne({ statut: 'valide' }))).toBe(true);
    expect(utilisablePourOfficiel(ligne({ statut: 'a_verifier' }))).toBe(false);
    expect(utilisablePourOfficiel(ligne({ statut: 'non_verifie' }))).toBe(false);
    expect(utilisablePourOfficiel(ligne({ statut: 'retire' }))).toBe(false);
  });

  it('ajout-version-sans-modifier', () => {
    const l = [ligne({ effet_fin: null })];
    const copie = JSON.parse(JSON.stringify(l)) as ParametreLegal[];
    const nouvelle = ligne({ valeur: 'valeur-2', effet_debut: '2026-01-01', effet_fin: null });
    const res = ajouterVersion(l, nouvelle);
    expect(l).toEqual(copie);
    expect(res).toHaveLength(2);
    expect(res[0]?.effet_fin).toBe('2026-01-01');
    expect(parametreAuJour(res, 'fictif.taux_a', 'XX', '2025-12-31').valeur).toBe('valeur-1');
    expect(parametreAuJour(res, 'fictif.taux_a', 'XX', '2026-01-01').valeur).toBe('valeur-2');
  });
});
