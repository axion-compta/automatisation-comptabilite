import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lireBaremeIk, lireMajoration } from '../../../noyau/src/frais/bareme-ik.js';
import { ErreurParametre, ParametreLegal, parametreAuJour } from '../au-jour.js';

const brut: unknown = JSON.parse(readFileSync(new URL('../../donnees/fr/bareme-ik-voiture.json', import.meta.url), 'utf8'));
const lignes = (brut as unknown[]).map((l) => ParametreLegal.parse(l));
const voiture = lignes.filter((l) => l.cle === 'bareme_ik_voiture');
const majoration = lignes.filter((l) => l.cle === 'bareme_ik_majoration_electrique');

function code(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurParametre) return e.code;
    throw e;
  }
  return 'aucune';
}

describe('données du barème kilométrique', () => {
  it('chaque-ligne-valide-le-schema', () => {
    expect(Array.isArray(brut)).toBe(true);
    expect(lignes.length).toBeGreaterThan(0);
    expect(voiture.length).toBeGreaterThan(0);
    expect(majoration.length).toBeGreaterThan(0);
    expect(lignes.length).toBe(voiture.length + majoration.length);
  });

  it('chaque-valeur-lisible-par-le-noyau', () => {
    for (const l of voiture) expect(lireBaremeIk(l.valeur).puissances.length).toBe(5);
    for (const l of majoration) expect(lireMajoration(l.valeur)).toBe(20);
  });

  it('aucune-ligne-valide', () => {
    for (const l of lignes) expect(l.statut).toBe('a_verifier');
  });

  it('source-et-date-de-releve-non-vides', () => {
    for (const l of lignes) {
      expect(l.source.trim()).not.toBe('');
      expect(l.date_releve).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('pas-de-chevauchement', () => {
    for (const cle of ['bareme_ik_voiture', 'bareme_ik_majoration_electrique']) {
      for (const jour of ['2021-12-31', '2022-01-01', '2022-01-02', '2024-06-15', '2025-12-31']) {
        expect(code(() => parametreAuJour(lignes, cle, 'FR', jour))).not.toBe('parametre_ambigu');
      }
    }
  });

  it('annee-non-publiee-absente', () => {
    for (const cle of ['bareme_ik_voiture', 'bareme_ik_majoration_electrique']) {
      expect(code(() => parametreAuJour(lignes, cle, 'FR', '2026-06-15'))).toBe('parametre_absent');
    }
  });

  it('continuite-a-la-premiere-borne', () => {
    for (const l of voiture) {
      for (const p of lireBaremeIk(l.valeur).puissances) {
        const [t1, t2] = p.tranches;
        const borne = (t1?.jusquaKmDixiemes ?? 0) / 10;
        // taux en millièmes, fixe en centimes : tout en entiers, au centime près.
        const a = borne * (t1?.tauxMilliemes ?? 0) / 10;
        const b = borne * (t2?.tauxMilliemes ?? 0) / 10 + (t2?.fixeCentimes ?? 0);
        expect({ cv: p.cleCv, centimes: a }).toEqual({ cv: p.cleCv, centimes: b });
      }
    }
  });
});
