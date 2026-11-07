import { describe, expect, it } from 'vitest';
import { centimes, type Centimes } from '../../../argent/index.js';
import { ErreurProfil, type Confiance } from '../../types.js';
import { comparerAuProrata, etatFranchiseCreation, lireRegle } from '../prorata-creation.js';

const c = (n: number): Centimes => centimes(n);
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};
const R = { joursAnnee: 365, finIncluse: true };
const RX = { joursAnnee: 365, finIncluse: false };
// 73 jours inclus : 2026-10-20 au 2026-12-31 (73 = 365 / 5, donc seuil / 5 tombe juste).
const P = { debutActivite: '2026-10-20', finAnnee: '2026-12-31' };
const S = { seuilBase: c(1000000), seuilMajore: c(1200000), statutParametre: 'sur' as Confiance };
const etat = (ca: number, s: Partial<typeof S> = S, r = R) =>
  etatFranchiseCreation(c(ca), P, r, { ...S, ...s });

describe('prorata-creation', () => {
  it('sous-la-base', () => {
    expect(comparerAuProrata(c(199999), P, R, c(1000000))).toBe('sous');
    const e = etat(100000);
    expect(e).toEqual({ niveau: 'sous_base', aVerifier: false, caAnnualiseAffiche: null, sortieProposeeLe: null });
  });

  it('entre-base-et-majore-sortie-proposee', () => {
    const e = etat(220000);
    expect(e.niveau).toBe('entre_base_et_majore');
    expect(e.sortieProposeeLe).toBe('2027-01-01');
    expect(e.caAnnualiseAffiche).toBeNull();
  });

  it('au-dessus-du-majore', () => {
    const e = etat(240001);
    expect(e.niveau).toBe('au_dessus_majore');
    expect(e.sortieProposeeLe).toBeNull();
    expect(etat(240000).niveau).toBe('entre_base_et_majore');
  });

  it('egalite-exacte', () => {
    expect(comparerAuProrata(c(200000), P, R, c(1000000))).toBe('egal');
    expect(comparerAuProrata(c(200001), P, R, c(1000000))).toBe('au_dessus');
    expect(etat(200000).niveau).toBe('sous_base');
  });

  it('fin-incluse-ou-non-change-le-resultat', () => {
    expect(comparerAuProrata(c(200000), P, R, c(1000000))).toBe('egal');
    expect(comparerAuProrata(c(200000), P, RX, c(1000000))).toBe('au_dessus');
    expect(etat(200000, S, RX).niveau).toBe('entre_base_et_majore');
  });

  it('parametre-a-verifier', () => {
    expect(etat(100000, { statutParametre: 'a_verifier' }).aVerifier).toBe(true);
    expect(etat(240001, { statutParametre: 'douteux' }).aVerifier).toBe(true);
    expect(etat(100000, { statutParametre: 'sur' }).aVerifier).toBe(false);
  });

  it('regle-invalide', () => {
    const mauvais: unknown[] = [
      { joursAnnee: 0, finIncluse: true },
      { joursAnnee: Number.NaN, finIncluse: true },
      { joursAnnee: Infinity, finIncluse: true },
      { joursAnnee: 365.25, finIncluse: true },
      { joursAnnee: '365', finIncluse: true },
      { joursAnnee: 365 },
      { joursAnnee: 365, finIncluse: 'oui' },
      null,
      'texte',
    ];
    for (const m of mauvais) {
      expect(code(() => lireRegle(m))).toBe('regle_prorata_invalide');
      expect(code(() => comparerAuProrata(c(1), P, m as never, c(1)))).toBe('regle_prorata_invalide');
    }
    expect(lireRegle(R)).toEqual(R);
    expect(code(() => comparerAuProrata(c(1), P, R, 0 as Centimes))).toBe('entree_invalide');
    expect(code(() => comparerAuProrata(1.5 as Centimes, P, R, c(1)))).toBe('entree_invalide');
    expect(code(() => etat(1, { seuilMajore: c(1) }))).toBe('seuils_inverses');
  });

  it('dates-invalides', () => {
    const d = (debutActivite: string, finAnnee: string, r = R) =>
      code(() => comparerAuProrata(c(1), { debutActivite, finAnnee }, r, c(1)));
    expect(d('2026-12-31', '2026-10-20')).toBe('ordre_inverse');
    expect(d('2026-02-30', '2026-12-31')).toBe('date_invalide');
    expect(d('2026-10-20', '2026-13-01')).toBe('date_invalide');
    expect(d('2026-12-31', '2026-12-31', RX)).toBe('aucun_jour');
    expect(d('2026-12-31', '2026-12-31')).toBeUndefined();
    expect(comparerAuProrata(c(1000), { debutActivite: '2026-12-31', finAnnee: '2026-12-31' }, R, c(365000))).toBe('egal');
  });
});
