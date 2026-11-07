import { describe, expect, it } from 'vitest';
import type { ParametreLegal } from '../au-jour.js';
import type { PaquetParametres, UtilisationParametre } from '../paquet.js';
import { ErreurPays, paysDeLUnion, statutFournisseur, verifierPaysSociete, verifierUtilisations } from '../pays.js';

const liste = (valeur: string, sur: Partial<ParametreLegal> = {}): ParametreLegal => ({
  cle: 'pays_ue', pays: 'UE', valeur, effet_debut: '2025-01-01', effet_fin: null,
  statut: 'valide', source: 'source fictive', date_releve: '2025-01-01', ...sur,
});
const paquetDe = (...lignes: ParametreLegal[]): PaquetParametres => ({ version: 'v-fictive', lignes });
const P = paquetDe(liste('AA,BB,CC'));
const J = '2025-06-01';
const codeErreur = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return e instanceof ErreurPays ? e.code : 'autre'; }
  return undefined;
};
const ecr = (sur: Partial<{ id: string; appliqueRegleLegale: boolean; versionPaquet: string | null }> = {}) =>
  ({ id: 'e1', appliqueRegleLegale: true, versionPaquet: 'v-fictive', ...sur });
const util = (sur: Partial<UtilisationParametre> = {}): UtilisationParametre =>
  ({ ecritureId: 'e1', parametreId: 'p1', versionPaquet: 'v-fictive', dateReference: J, ...sur });

describe('pays fiscal et utilisation des paramètres', () => {
  it('r3-societe-hors-union-refusee', () => {
    for (const p of ['ZZ', 'aa', '', 'AAA', 'A', ' AA'])
      expect(verifierPaysSociete(p, P, J)).toEqual({ ok: false, code: 'pays_hors_union' });
    expect(verifierPaysSociete('AA', paquetDe(liste('')), J)).toEqual({ ok: false, code: 'pays_hors_union' });
  });

  it('societe-dans-l-union-acceptee', () => {
    expect(verifierPaysSociete('BB', P, J)).toEqual({ ok: true, aVerifier: false });
    expect(paysDeLUnion(P, J)).toEqual(['AA', 'BB', 'CC']);
    const brouillon = paquetDe(liste('AA', { statut: 'a_verifier' }));
    expect(verifierPaysSociete('AA', brouillon, J)).toEqual({ ok: true, aVerifier: true });
  });

  it('r3-fournisseur-hors-union-a-verifier', () => {
    expect(statutFournisseur('CC', P, J)).toBe('union');
    expect(statutFournisseur('ZZ', P, J)).toBe('hors_union_a_verifier');
    expect(statutFournisseur('', P, J)).toBe('hors_union_a_verifier');
    expect(statutFournisseur('bb', P, J)).toBe('hors_union_a_verifier');
  });

  it('liste-datee-change-au-jour-d', () => {
    const p = paquetDe(
      liste('AA,BB', { effet_fin: '2026-01-01' }),
      liste('AA,BB,DD', { effet_debut: '2026-01-01' }),
    );
    expect(verifierPaysSociete('DD', p, '2025-12-31').ok).toBe(false);
    expect(verifierPaysSociete('DD', p, '2026-01-01').ok).toBe(true);
    expect(verifierPaysSociete('AA', p, '2026-01-01').ok).toBe(true);
  });

  it('liste-mal-formee-refusee', () => {
    for (const v of ['AA, BB', 'AA,AA', 'AA,,BB', 'aa,BB', 'AAA', 'AA,', ',AA', ' AA'])
      expect(codeErreur(() => paysDeLUnion(paquetDe(liste(v)), J))).toBe('liste_pays_invalide');
  });

  it('ecriture-sans-version-refusee', () => {
    for (const v of [null, ''])
      expect(verifierUtilisations(ecr({ versionPaquet: v }), [util()])).toEqual({ ok: false, code: 'version_paquet_absente' });
  });

  it('ecriture-sans-utilisation-refusee', () => {
    const r = { ok: false, code: 'utilisation_parametre_absente' };
    expect(verifierUtilisations(ecr(), [])).toEqual(r);
    expect(verifierUtilisations(ecr(), [util({ ecritureId: 'e2' })])).toEqual(r);
    expect(verifierUtilisations(ecr(), [util()])).toEqual({ ok: true });
  });

  it('ecriture-sans-regle-legale-acceptee-sans-ligne', () => {
    expect(verifierUtilisations(ecr({ appliqueRegleLegale: false, versionPaquet: null }), [])).toEqual({ ok: true });
  });
});
