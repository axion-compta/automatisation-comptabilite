import { describe, expect, it } from 'vitest';
import { centimes, type Arrondi } from '../../argent/index.js';
import { ErreurChat, STATUTS_CONSTAT, type GraviteConstat, type StatutConstat } from '../../chat/types.js';
import { changerStatut, seuilSignification } from '../reprise.js';

const c = centimes;
const base = { totalBilan: c(4_000_000), chiffreAffaires: c(3_000_000), plancher: c(1_000), pointsDeBase: 50, arrondi: 'demi-superieur' as Arrondi };
const code = (f: () => unknown): string | undefined => {
  try { f(); } catch (e) { return e instanceof ErreurChat ? e.code : 'autre'; }
  return undefined;
};

describe('seuil de signification', () => {
  it('plancher-gagne', () => {
    expect(seuilSignification({ ...base, plancher: c(900_000) })).toBe(900_000);
  });
  it('pourcentage-du-bilan-gagne', () => {
    expect(seuilSignification(base)).toBe(20_000);
  });
  it('pourcentage-du-chiffre-d-affaires-gagne', () => {
    expect(seuilSignification({ ...base, totalBilan: c(1_000_000), chiffreAffaires: c(6_000_000) })).toBe(30_000);
  });
  it('egalite-bilan-et-ca', () => {
    expect(seuilSignification({ ...base, totalBilan: c(2_000_000), chiffreAffaires: c(2_000_000) })).toBe(10_000);
    expect(seuilSignification({ ...base, plancher: c(10_000), totalBilan: c(2_000_000), chiffreAffaires: c(2_000_000) })).toBe(10_000);
  });
  it('arrondi-applique', () => {
    const p = { ...base, totalBilan: c(1_050), chiffreAffaires: c(0), plancher: c(0), pointsDeBase: 5_000 };
    const r = (arrondi: Arrondi) => seuilSignification({ ...p, totalBilan: c(1_051), arrondi });
    expect(r('inferieur')).toBe(525);
    expect(r('superieur')).toBe(526);
    expect(r('demi-superieur')).toBe(526);
    expect(r('demi-pair')).toBe(526);
    expect(seuilSignification({ ...p, arrondi: 'demi-pair' })).toBe(525);
  });
  it('arguments-invalides', () => {
    for (const mauvais of [{ totalBilan: c(-1) }, { chiffreAffaires: c(-1) }, { plancher: c(-1) },
      { pointsDeBase: 10_001 }, { pointsDeBase: -1 }, { pointsDeBase: 2.5 }, { pointsDeBase: NaN }, { pointsDeBase: Infinity },
      { totalBilan: NaN as never }, { plancher: Infinity as never }, { chiffreAffaires: 1.5 as never }]) {
      expect(code(() => seuilSignification({ ...base, ...mauvais }))).toBe('parametre_invalide');
    }
    expect(seuilSignification({ ...base, pointsDeBase: 0, plancher: c(0) })).toBe(0);
    expect(seuilSignification({ ...base, pointsDeBase: 10_000, plancher: c(0) })).toBe(4_000_000);
  });
});

describe('statuts des constats', () => {
  const permis: Record<StatutConstat, StatutConstat[]> = {
    ouvert: ['explique', 'corrige', 'accepte'], explique: ['corrige', 'accepte'], corrige: [], accepte: [],
  };
  const gravite: GraviteConstat = 'mineur';
  it('transitions-permises', () => {
    for (const [de, vers] of Object.entries(permis) as [StatutConstat, StatutConstat[]][]) {
      for (const v of vers) expect(changerStatut({ gravite, statut: de }, v, [])).toBe(v);
    }
  });
  it('transition-interdite', () => {
    expect(code(() => changerStatut({ gravite, statut: 'corrige' }, 'ouvert', []))).toBe('parametre_invalide');
    for (const de of STATUTS_CONSTAT) {
      for (const vers of STATUTS_CONSTAT) {
        if (permis[de].includes(vers)) continue;
        expect(code(() => changerStatut({ gravite, statut: de }, vers, ['compta-lever-bloquant']))).toBe('parametre_invalide');
      }
    }
    expect(code(() => changerStatut({ gravite, statut: 'inconnu' as never }, 'corrige', []))).toBe('parametre_invalide');
  });
  it('critique-accepte-sans-permission-refuse', () => {
    for (const statut of ['ouvert', 'explique'] as const) {
      expect(code(() => changerStatut({ gravite: 'critique', statut }, 'accepte', ['compta-lire']))).toBe('droit_insuffisant');
    }
    expect(changerStatut({ gravite: 'majeur', statut: 'ouvert' }, 'accepte', [])).toBe('accepte');
    expect(changerStatut({ gravite: 'critique', statut: 'ouvert' }, 'corrige', [])).toBe('corrige');
  });
  it('critique-accepte-avec-permission', () => {
    expect(changerStatut({ gravite: 'critique', statut: 'ouvert' }, 'accepte', ['compta-lire', 'compta-lever-bloquant'])).toBe('accepte');
  });
});
