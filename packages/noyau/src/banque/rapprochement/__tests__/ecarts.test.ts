import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../../argent/index.js';
import { ErreurEcart, qualifierEcart } from '../ecarts.js';

const reglage = {
  seuilCentimes: 100,
  seuilPb: 50,
  seuilArrondi: 5,
  comptes: { arrondi: 'cpt-arrondi', frais_bancaires: 'cpt-frais', escompte: 'cpt-escompte' },
};
const base = { enDevise: false, libelleFrais: false, escompteMentionne: false };
const q = (piece: number, paye: number, extra: Partial<typeof base> = {}, r = reglage) =>
  qualifierEcart({ montantPiece: piece as Centimes, montantPaye: paye as Centimes, ...base, ...extra }, r);
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurEcart ? e.code : 'autre';
  }
  return undefined;
};

describe('ecarts', () => {
  it('t06-3-cinquante-centimes', () => {
    const r = q(120000, 119950, { escompteMentionne: true });
    expect(r).toEqual({ type: 'petit_ecart', ecart: -50, nature: 'escompte', comptePropose: 'cpt-escompte' });
  });
  it('arrondi-sous-seuil', () => {
    expect(q(120000, 119995)).toEqual({ type: 'petit_ecart', ecart: -5, nature: 'arrondi', comptePropose: 'cpt-arrondi' });
    expect(q(120000, 120005, { enDevise: true })).toMatchObject({ nature: 'arrondi' });
    expect(q(120000, 119994, {})).toMatchObject({ nature: 'inconnu' });
  });
  it('frais-en-devise', () => {
    expect(q(120000, 119900, { enDevise: true })).toMatchObject({ nature: 'frais_bancaires', comptePropose: 'cpt-frais' });
    expect(q(120000, 119900, { libelleFrais: true, escompteMentionne: true })).toMatchObject({ nature: 'frais_bancaires' });
  });
  it('escompte-mentionne', () => {
    expect(q(120000, 119900, { escompteMentionne: true })).toMatchObject({ nature: 'escompte', comptePropose: 'cpt-escompte' });
  });
  it('nature-inconnue-sans-compte', () => {
    const r = q(120000, 119900);
    expect(r).toEqual({ type: 'petit_ecart', ecart: -100, nature: 'inconnu' });
    expect('comptePropose' in r).toBe(false);
  });
  it('deux-conditions-du-seuil', () => {
    expect(q(10000, 9950)).toEqual({ type: 'petit_ecart', ecart: -50, nature: 'inconnu' });
    expect(q(10000, 9949)).toEqual({ type: 'partiel', reste: 51 });
    expect(q(120000, 119899)).toEqual({ type: 'partiel', reste: 101 });
    expect(q(120000, 119900)).toMatchObject({ type: 'petit_ecart' });
    expect(q(10000, 10100, {}, { ...reglage, seuilPb: 100 })).toMatchObject({ type: 'petit_ecart', ecart: 100 });
    expect(q(10000, 10100, {}, { ...reglage, seuilPb: 99 })).toEqual({ type: 'trop_percu', ecart: 100 });
  });
  it('trop-percu-jamais-produit', () => {
    const r = q(120000, 121000, { escompteMentionne: true, enDevise: true });
    expect(r).toEqual({ type: 'trop_percu', ecart: 1000 });
    expect(JSON.stringify(r)).not.toContain('cpt-');
    expect(q(120000, 120000)).toEqual({ type: 'aucun' });
    const src = readFileSync(new URL('../ecarts.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/ecritures\//);
  });
  it('aucun-ecart', () => {
    expect(q(120000, 120000)).toEqual({ type: 'aucun' });
    expect(q(0, 0)).toEqual({ type: 'aucun' });
    expect(q(0, 1)).toEqual({ type: 'trop_percu', ecart: 1 });
  });
  it('montants-et-reglages-invalides', () => {
    const mauvais = [Number.NaN, Infinity, -Infinity, 1.5, -1];
    for (const m of mauvais) {
      expect(code(() => q(m, 100))).toBe('montant_invalide');
      expect(code(() => q(100, m))).toBe('montant_invalide');
    }
    for (const k of ['seuilCentimes', 'seuilPb', 'seuilArrondi'] as const) {
      for (const m of [Number.NaN, -1, Infinity, 1.5]) {
        expect(code(() => q(100, 100, {}, { ...reglage, [k]: m }))).toBe('reglage_invalide');
      }
    }
    expect(q(100, 100, {}, { ...reglage, seuilCentimes: 0, seuilPb: 0, seuilArrondi: 0 })).toEqual({ type: 'aucun' });
  });
});
