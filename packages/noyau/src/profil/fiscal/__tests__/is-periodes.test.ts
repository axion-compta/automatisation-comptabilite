import { describe, expect, it } from 'vitest';
import { centimes, type Arrondi, type Centimes } from '../../../argent/index.js';
import { ErreurProfil } from '../../types.js';
import { calculerIsParPeriodes, type PeriodeImposition } from '../is-periodes.js';
import { preparerReleve2572 } from '../releve-2572.js';

const c = (n: number): Centimes => centimes(n);
const brut = (n: number): Centimes => n as Centimes; // sans contrôle, pour les entrées invalides
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurProfil ? e.code : 'autre';
  }
  return undefined;
};
// Plafond fictif de 4 250 000 centimes ; son prorata sur 16 mois vaudrait 5 666 666,67.
const P = { tauxReduitPdb: 1500, tauxNormalPdb: 2500, plafondCentimes: c(4250000), arrondi: 'demi-superieur' as Arrondi };
const per = (debut: string, fin: string, benefice: number, eligibilite: PeriodeImposition['eligibilite'] = 'eligible'): PeriodeImposition => ({
  debut,
  fin,
  beneficeCentimes: brut(benefice),
  eligibilite,
});
const SEIZE_MOIS = [per('2027-01-01', '2027-12-31', 10000000), per('2028-01-01', '2028-04-30', 6000000)];

describe('IS par période d’imposition', () => {
  it('banc-16-mois-aucun-plafond-proratise', () => {
    const r = calculerIsParPeriodes(SEIZE_MOIS, P);
    // Période 1 : 637 500 + 1 437 500 ; période 2 : 637 500 + 437 500.
    expect(r.periodes.map((x) => x.impotCentimes)).toEqual([c(2075000), c(1075000)]);
    expect(r.totalCentimes).toBe(c(3150000));
    const texte = JSON.stringify(r);
    for (const proratise of ['5666666', '5666667', '5666']) expect(texte).not.toContain(proratise);
    expect(r.periodes.every((x) => x.plafondCentimes === c(4250000))).toBe(true);
    expect(r.periodes.every((x) => x.baseReduiteCentimes === c(4250000))).toBe(true);
  });

  it('plafond-applique-par-periode', () => {
    // Deux périodes au-dessus du plafond : chacune reçoit le plafond entier (8 500 000 de base réduite au total).
    const deux = calculerIsParPeriodes([per('2027-01-01', '2027-12-31', 5000000), per('2028-01-01', '2028-04-30', 5000000)], P);
    expect(deux.periodes.map((x) => x.baseReduiteCentimes)).toEqual([c(4250000), c(4250000)]);
    expect(deux.totalCentimes).toBe(c(1650000));
    // Période courte sous le plafond : tout au taux réduit.
    const courte = calculerIsParPeriodes([per('2027-01-01', '2027-12-31', 4250000), per('2028-01-01', '2028-04-30', 3000000)], P);
    expect(courte.periodes[1]).toMatchObject({ baseReduiteCentimes: c(3000000), partReduiteCentimes: c(450000), partNormaleCentimes: c(0) });
    // Frontière du plafond, bénéfice nul ou négatif, non éligible, à confirmer.
    const bords = calculerIsParPeriodes(
      [per('2027-01-01', '2027-12-31', 4250001), per('2028-01-01', '2028-04-30', 0)],
      P,
    );
    expect(bords.periodes[0]).toMatchObject({ partReduiteCentimes: c(637500), partNormaleCentimes: c(0) });
    expect(bords.periodes[1]?.impotCentimes).toBe(c(0));
    const perte = calculerIsParPeriodes([per('2027-01-01', '2027-12-31', -500), per('2028-01-01', '2028-04-30', 1000000, 'non_eligible')], P);
    expect(perte.periodes.map((x) => x.impotCentimes)).toEqual([c(0), c(250000)]);
    expect(perte.periodes[1]?.baseReduiteCentimes).toBe(c(0));
    expect(calculerIsParPeriodes([per('2027-01-01', '2027-12-31', 1000000, 'a_confirmer')], P).periodes[0]?.impotCentimes).toBe(c(250000));
    // Entrées invalides.
    expect(code(() => calculerIsParPeriodes([], P))).toBe('entree_invalide');
    expect(code(() => calculerIsParPeriodes([per('2027-02-30', '2027-12-31', 1)], P))).toBe('entree_invalide');
    expect(code(() => calculerIsParPeriodes([per('2027-12-31', '2027-01-01', 1)], P))).toBe('entree_invalide');
    expect(code(() => calculerIsParPeriodes([SEIZE_MOIS[1]!, SEIZE_MOIS[0]!], P))).toBe('entree_invalide');
    expect(code(() => calculerIsParPeriodes([per('2027-01-01', '2027-12-31', 1), per('2027-12-31', '2028-04-30', 1)], P))).toBe('entree_invalide');
    expect(code(() => calculerIsParPeriodes([per('2027-01-01', '2027-12-31', Number.NaN)], P))).toBe('entree_invalide');
    expect(code(() => calculerIsParPeriodes(SEIZE_MOIS, { ...P, plafondCentimes: brut(-1) }))).toBe('entree_invalide');
  });

  it('resultat-marque-a-verifier', () => {
    const r = calculerIsParPeriodes(SEIZE_MOIS, P);
    expect(r.statut).toBe('a_verifier');
    expect(r.sources.length).toBeGreaterThan(0);
    for (const p of r.periodes) {
      expect(p.sources).toEqual(expect.arrayContaining([`periode:${p.debut}/${p.fin}`, 'plafond_entier_par_periode']));
    }
    // Même avec un bénéfice nul, le résultat reste à vérifier.
    expect(calculerIsParPeriodes([per('2027-01-01', '2027-12-31', 0)], P).statut).toBe('a_verifier');
  });
});

describe('relevé de solde 2572', () => {
  const entree = (isDu: number, acomptesVerses: number, creditsImputes: number) => ({
    isDu: brut(isDu),
    acomptesVerses: brut(acomptesVerses),
    creditsImputes: brut(creditsImputes),
  });

  it('releve-2572-solde-au-centime', () => {
    const r = preparerReleve2572(entree(3150000, 2000000, 149999));
    expect(r.soldeAPayerCentimes).toBe(c(1000001));
    expect(r.excedentCentimes).toBe(c(0));
    expect(preparerReleve2572(entree(1, 0, 0)).soldeAPayerCentimes).toBe(c(1));
    const nul = preparerReleve2572(entree(1000, 900, 100));
    expect([nul.soldeAPayerCentimes, nul.excedentCentimes]).toEqual([c(0), c(0)]);
  });

  it('releve-2572-excedent-rendu', () => {
    const r = preparerReleve2572(entree(500000, 800000, 50001));
    expect(r.excedentCentimes).toBe(c(350001));
    expect(r.soldeAPayerCentimes).toBe(c(0));
    expect(preparerReleve2572(entree(0, 0, 1)).excedentCentimes).toBe(c(1));
    for (const mauvais of [-1, Number.NaN, 1.5, Number.POSITIVE_INFINITY]) {
      expect(code(() => preparerReleve2572(entree(mauvais, 0, 0)))).toBe('entree_invalide');
      expect(code(() => preparerReleve2572(entree(0, mauvais, 0)))).toBe('entree_invalide');
      expect(code(() => preparerReleve2572(entree(0, 0, mauvais)))).toBe('entree_invalide');
    }
  });

  it('releve-2572-cases-tracees', () => {
    const r = preparerReleve2572(entree(3150000, 2000000, 150000));
    expect(r.statut).toBe('a_verifier');
    expect(r.cases.map((x) => [x.code, x.montantCentimes])).toEqual([
      ['is_du', c(3150000)],
      ['acomptes_verses', c(2000000)],
      ['credits_imputes', c(150000)],
      ['solde_a_payer', c(1000000)],
    ]);
    expect(r.cases.every((x) => x.origine.length > 0 && x.libelle.length > 0)).toBe(true);
    expect(r.cases[0]?.origine).toBe('is_par_periodes');
    expect(preparerReleve2572(entree(100, 300, 0)).cases.at(-1)?.code).toBe('excedent');
  });
});
