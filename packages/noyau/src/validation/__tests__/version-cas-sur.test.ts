import { describe, expect, it } from 'vitest';
import type { ContexteCasSur, Proposition } from '../cas-sur.js';
import { ErreurVersionCasSur, VERSION_REGLE_CAS_SUR, evaluerLot, nouvelleVersion, relireLot, type VersionParametres } from '../version-cas-sur.js';

const v1 = { montantMaxCentimes: 50000, validationsMinFournisseur: 3 };
const v2 = { montantMaxCentimes: 40000, validationsMinFournisseur: 3 };
const ctx: ContexteCasSur = {
  validationsParFournisseurEtCompte: new Map([['f1|606', 5]]),
  anomaliesOuvertes: new Set<string>(),
  fournisseurHorsUnion: new Set<string>(),
};
const prop = (id: string, montant: number): Proposition => ({ id, nature: 'piece', confiance: 'sur', champsDouteux: 0,
  fournisseurId: 'f1', compteCharge: '606', montantTtcCentimes: montant, tvaEnDoute: false });
const histo1 = (): readonly VersionParametres[] => nouvelleVersion([], v1, '2026-01-01');
const histo2 = (): readonly VersionParametres[] => nouvelleVersion(histo1(), v2, '2026-06-01');
const code = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return e instanceof ErreurVersionCasSur ? e.code : 'autre'; }
  return undefined;
};

describe('version de la règle du cas sûr', () => {
  it('c3-nouveau-seuil-nouvelle-version', () => {
    const h = histo2();
    expect(h.map((x) => x.numero)).toEqual([1, 2]);
    expect(h[1]?.parametres.montantMaxCentimes).toBe(40000);
    const lot = evaluerLot([prop('a', 45000)], ctx, h, '2026-06-01');
    expect(lot.versionParametres).toBe(2);
    expect(lot.regle).toBe(VERSION_REGLE_CAS_SUR);
    expect(lot.lignes[0]?.sur).toBe(false);
  });

  it('c3-lot-ancien-garde-l-ancienne-version', () => {
    const h = histo2();
    const lot = evaluerLot([prop('a', 45000)], ctx, h, '2026-05-31');
    expect(lot.versionParametres).toBe(1);
    expect(lot.parametres).toEqual(v1);
    expect(lot.lignes[0]?.sur).toBe(true);
    const relu = relireLot(lot, h);
    expect(relu.versionParametres).toBe(1);
    expect(relu.parametres).toEqual(v1);
    expect(code(() => relireLot({ ...lot, versionParametres: 3 }, h))).toBe('version_inconnue');
    expect(code(() => relireLot({ ...lot, parametres: v2 }, h))).toBe('lot_incoherent');
  });

  it('entree-non-modifiee', () => {
    const h1 = histo1();
    const copie = JSON.parse(JSON.stringify(h1)) as unknown;
    const h2 = nouvelleVersion(h1, v2, '2026-06-01');
    expect(h1).toEqual(copie);
    expect(h2).not.toBe(h1);
    expect(h2).toHaveLength(2);
    expect(h2[0]).toEqual(h1[0]);
    const source = { ...v1 };
    const h3 = nouvelleVersion([], source, '2026-01-01');
    source.montantMaxCentimes = 1;
    expect(h3[0]?.parametres.montantMaxCentimes).toBe(50000);
  });

  it('parametres-identiques-refuses', () => {
    expect(code(() => nouvelleVersion(histo2(), { ...v2 }, '2026-07-01'))).toBe('version_identique');
    expect(code(() => nouvelleVersion(histo2(), v1, '2026-07-01'))).toBeUndefined();
    expect(code(() => nouvelleVersion(histo2(), v1, '2026-05-01'))).toBe('date_anterieure');
    for (const mauvais of [{ ...v1, montantMaxCentimes: Number.NaN }, { ...v1, validationsMinFournisseur: Infinity }, { ...v1, montantMaxCentimes: 1.5 }]) {
      expect(code(() => nouvelleVersion(histo2(), mauvais, '2026-07-01'))).toBe('parametres_invalides');
    }
  });

  it('lot-du-jour-de-bascule-nouvelle-version', () => {
    const h = histo2();
    expect(evaluerLot([], ctx, h, '2026-06-01').versionParametres).toBe(2);
    expect(evaluerLot([], ctx, h, '2026-05-31').versionParametres).toBe(1);
    expect(evaluerLot([], ctx, h, '2027-01-01').versionParametres).toBe(2);
    expect(code(() => evaluerLot([], ctx, h, '2025-12-31'))).toBe('date_anterieure');
    expect(code(() => evaluerLot([], ctx, [], '2026-06-01'))).toBe('aucune_version');
    expect(code(() => evaluerLot([], ctx, h, '01/06/2026'))).toBe('date_invalide');
    expect(code(() => nouvelleVersion(histo1(), v2, '2026-01-01'))).toBe('date_anterieure');
    const e = (numero: number, depuis: string): VersionParametres => ({ numero, parametres: v1, depuis });
    for (const h of [[e(1, '2026-01-01'), e(2, '2026-01-01')], [e(1.5, '2026-01-01')]]) {
      expect(code(() => evaluerLot([], ctx, h, '2026-03-01'))).toBe('historique_invalide');
    }
    expect(code(() => nouvelleVersion([e(1.5, '2026-01-01')], v2, '2026-03-01'))).toBe('historique_invalide');
  });

  it('chaque-ligne-a-ses-raisons', () => {
    const lot = evaluerLot([prop('a', 1200), prop('b', 45000), prop('c', 90000)], ctx, histo2(), '2026-07-01');
    expect(lot.lignes.map((l) => l.id)).toEqual(['a', 'b', 'c']);
    expect(lot.lignes.map((l) => l.sur)).toEqual([true, false, false]);
    expect(lot.lignes[0]?.raisons).toEqual([]);
    expect(lot.lignes[1]?.raisons).toEqual(['montant_au_seuil_ou_plus']);
    expect(lot.lignes[2]?.raisons).toEqual(['montant_au_seuil_ou_plus']);
  });
});
