import { describe, expect, it } from 'vitest';
import { ErreurProfil } from '../types.js';
import type { ChampProfil } from '../types.js';
import { ajouterValeur } from '../champs.js';
import type { NouvelleValeur } from '../champs.js';
import type { LigneImposition } from '../fiscal/imposition.js';
import { profilAu } from '../profil-au.js';

const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};
const S = 'societe-test';
const V = 'societe-voisine';
const val = (cle: string, valeur: unknown, effetDebut: string, societeId = S): NouvelleValeur => ({
  societeId,
  cle,
  valeur,
  origine: 'document',
  confiance: 'sur',
  effetDebut,
});
const historique = (...l: NouvelleValeur[]): readonly ChampProfil[] => l.reduce<readonly ChampProfil[]>((h, n) => ajouterValeur(h, n, '2026-01-01'), []);
const imp = (effetDebut: string, effetFin: string | null, impot: 'IS' | 'IR', societeId = S): LigneImposition => ({
  societeId,
  effetDebut,
  effetFin,
  impot,
  categorie: 'BIC',
  regime: 'reel_simplifie',
  motif: 'essai',
  statut: 'confirme',
});
const champs = historique(val('forme', 'SARL', '2020-01-01'), val('forme', 'SAS', '2026-06-15'), val('nom', 'Atelier Fictif', '2021-03-01'), val('tard', 'x', '2030-01-01'));
const imposition = [imp('2020-01-01', '2026-06-15', 'IR'), imp('2026-06-15', null, 'IS')];
const gele = <T>(t: readonly T[]): readonly T[] => Object.freeze(t.map((x) => Object.freeze({ ...x })));
const forme = (date: string, entrees = { champs, imposition }): unknown => profilAu(entrees, S, date).champs['forme']?.valeur;

describe('profil à une date', () => {
  it('forme-changee-p24', () => {
    expect(forme('2026-06-14')).toBe('SARL');
    expect(forme('2026-06-15')).toBe('SAS');
    expect(forme('2026-06-16')).toBe('SAS');
  });

  it('cle-absente-avant-premier-effet', () => {
    const p = profilAu({ champs, imposition }, S, '2019-12-31');
    expect(Object.keys(p.champs)).toEqual([]);
    const q = profilAu({ champs, imposition }, S, '2021-03-01');
    expect(Object.keys(q.champs)).toEqual(['forme', 'nom']);
    expect('tard' in q.champs).toBe(false);
    expect(Object.values(q.champs).every((c) => c !== undefined)).toBe(true);
    expect(q.champs['nom']).toMatchObject({ valeur: 'Atelier Fictif', statut: 'a_confirmer', origine: 'document', confiance: 'sur', effetDebut: '2021-03-01' });
  });

  it('imposition-a-la-date', () => {
    expect(profilAu({ champs, imposition }, S, '2026-06-14').imposition?.impot).toBe('IR');
    expect(profilAu({ champs, imposition }, S, '2026-06-15').imposition?.impot).toBe('IS');
    expect(profilAu({ champs, imposition }, S, '2019-12-31').imposition).toBeNull();
  });

  it('entrees-non-modifiees', () => {
    const e = { champs: gele(champs), imposition: gele(imposition) };
    const avant = JSON.stringify(e);
    profilAu(e, S, '2026-06-15');
    expect(JSON.stringify(e)).toBe(avant);
    expect(e.champs).toHaveLength(champs.length);
  });

  it('resultat-gele', () => {
    const p = profilAu({ champs, imposition }, S, '2026-06-15');
    expect(Object.isFrozen(p)).toBe(true);
    expect(Object.isFrozen(p.champs)).toBe(true);
    expect(Object.isFrozen(p.champs['forme'])).toBe(true);
    expect(Object.isFrozen(p.imposition)).toBe(true);
    expect(() => {
      (p.champs as Record<string, unknown>)['autre'] = 1;
    }).toThrow();
  });

  it('societe-voisine-ignoree', () => {
    const e = {
      champs: [...champs, ...historique(val('forme', 'SCI', '2022-01-01', V), val('voisin', 'y', '2022-01-01', V))],
      imposition: [...imposition, imp('2022-01-01', null, 'IR', V)],
    };
    const p = profilAu(e, S, '2026-06-15');
    expect(Object.keys(p.champs)).toEqual(['forme', 'nom']);
    expect(p.champs['forme']?.valeur).toBe('SAS');
    expect(profilAu(e, V, '2026-06-15').imposition?.impot).toBe('IR');
    expect(profilAu(e, 'inconnue', '2026-06-15')).toMatchObject({ champs: {}, imposition: null });
  });

  it('date-invalide-refusee', () => {
    for (const d of ['2026-12-32', '']) {
      expect(code(() => profilAu({ champs, imposition }, S, d))).toBe('date_invalide');
      expect(code(() => profilAu({ champs: [], imposition: [] }, S, d))).toBe('date_invalide');
    }
  });
});
