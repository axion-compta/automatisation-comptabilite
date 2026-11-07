import { describe, expect, it } from 'vitest';
import type { Arrondi, Centimes } from '../../../argent/index.js';
import { ErreurControle } from '../commun.js';
import type { ParametreLu } from '../commun.js';
import { regleCCT08, traiterDepenseVehicule } from '../vehicules.js';
import type { DepenseVehicule, ParametresVehicule, Vehicule } from '../vehicules.js';

const c = (n: number): Centimes => n as Centimes;
const param = (valeur: string | null, statut: ParametreLu['statut'] = 'valide'): ParametreLu => ({ cle: 'tva.test', valeur, statut });
const params = (carbT: string, carbU: string, autres: string): ParametresVehicule => ({
  carburantTourisme: param(carbT),
  carburantUtilitaire: param(carbU),
  autresTourisme: param(autres),
});
const P = params('8000', '10000', '0');
const V: Vehicule[] = [
  { id: 'v-tour', genre: 'tourisme' },
  { id: 'v-util', genre: 'utilitaire' },
];
const dep = (nature: DepenseVehicule['nature'], ttc: number, tva: number, vehiculeId?: string): DepenseVehicule => ({
  nature,
  ttc: c(ttc),
  tva: c(tva),
  ...(vehiculeId === undefined ? {} : { vehiculeId }),
});
const run = (d: DepenseVehicule, p = P, a: Arrondi = 'demi-superieur', v: readonly Vehicule[] = V) => traiterDepenseVehicule(d, v, p, a);
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurControle ? e.code : 'autre';
  }
  return undefined;
};

describe('CC-T08 carburant et véhicules', () => {
  it('CT-25', () => {
    expect(run(dep('carburant', 7240, 1207, 'v-tour'))).toEqual({ code: 'DEDUCTIBLE', deduit: 966, charge: 6274 });
    expect(run(dep('peage', 1260, 210, 'v-tour'))).toEqual({ code: 'NON_DEDUCTIBLE_NATURE', deduit: 0, charge: 1260 });
    const sans = dep('carburant', 7240, 1207);
    expect(run(sans)).toEqual({ code: 'A_VERIFIER', deduit: 0, charge: 7240 });
    const o = { depense: sans, vehicules: V, parametres: P, arrondi: 'demi-superieur' as const };
    expect(regleCCT08.evaluer(o)).toEqual({ resultat: 'ALERTE', valeur: 'A_VERIFIER' });
    expect(regleCCT08.evaluer({ ...o, depense: dep('carburant', 7240, 1207, 'v-tour') })).toEqual({ resultat: 'OK' });
    expect(regleCCT08.evaluer({ ...o, depense: dep('peage', 1260, 210, 'v-tour') })).toEqual({ resultat: 'OK' });
    expect(regleCCT08.id).toBe('CC-T08');
    expect(regleCCT08.version).toBe(1);
    expect(regleCCT08.gravite).toBe('M');
    expect(regleCCT08.bloque).toEqual([]);
    expect(regleCCT08.declencheurs).toEqual(['arrivee', 'continu', 'a_la_demande']);
    expect(regleCCT08.actif).toBe(true);
  });

  it('utilitaire-carburant', () => {
    const p = params('8000', '5000', '2500');
    expect(run(dep('carburant', 7240, 1000, 'v-util'), p)).toEqual({ code: 'DEDUCTIBLE', deduit: 500, charge: 6740 });
    expect(run(dep('entretien', 1000, 200, 'v-util'), p)).toEqual({ code: 'DEDUCTIBLE', deduit: 100, charge: 900 });
    expect(run(dep('entretien', 1000, 200, 'v-tour'), p)).toEqual({ code: 'DEDUCTIBLE', deduit: 50, charge: 950 });
    expect(run(dep('carburant', 1000, 200, 'v-tour'), p).deduit).toBe(160);
    expect(run(dep('achat', 1000, 200, 'v-util'), { ...p, carburantUtilitaire: param(null, 'absent') }).code).toBe('A_VERIFIER');
    expect(run(dep('location', 1000, 200, 'v-tour'), P).code).toBe('NON_DEDUCTIBLE_NATURE');
  });

  it('parametre-a-verifier', () => {
    const attendu = { code: 'A_VERIFIER', deduit: 0, charge: 1000 };
    for (const statut of ['a_verifier', 'non_verifie', 'absent'] as const) {
      const mauvais = param(statut === 'absent' ? null : '8000', statut);
      expect(run(dep('carburant', 1000, 200, 'v-tour'), { ...P, carburantTourisme: mauvais })).toEqual(attendu);
      expect(run(dep('carburant', 1000, 200, 'v-util'), { ...P, carburantUtilitaire: mauvais })).toEqual(attendu);
      expect(run(dep('entretien', 1000, 200, 'v-tour'), { ...P, autresTourisme: mauvais })).toEqual(attendu);
    }
    expect(run(dep('peage', 1000, 200, 'v-tour'), { ...P, autresTourisme: param(null, 'valide') })).toEqual(attendu);
    expect(run(dep('carburant', 1000, 200, 'v-tour'), { ...P, autresTourisme: param(null, 'absent') }).code).toBe('DEDUCTIBLE');
  });

  it('deduit-plus-charge-egal-ttc', () => {
    let graine = 12345;
    const suivant = (borne: number): number => {
      graine = (Math.imul(graine, 1103515245) + 12345) >>> 0;
      return graine % borne;
    };
    const natures: DepenseVehicule['nature'][] = ['carburant', 'achat', 'location', 'entretien', 'peage'];
    const modes: Arrondi[] = ['demi-superieur', 'demi-pair', 'inferieur', 'superieur'];
    for (let i = 0; i < 1000; i++) {
      const ttc = suivant(2000000);
      const tva = suivant(ttc + 1);
      const p = params(String(suivant(10001)), String(suivant(10001)), String(suivant(10001)));
      const d = dep(natures[suivant(5)] as DepenseVehicule['nature'], ttc, tva, suivant(2) === 0 ? 'v-tour' : 'v-util');
      const r = run(d, p, modes[suivant(4)] as Arrondi);
      expect(r.deduit + r.charge).toBe(ttc);
      expect(r.deduit).toBeGreaterThanOrEqual(0);
      expect(r.deduit).toBeLessThanOrEqual(tva);
    }
  });

  it('arrondi-explicite', () => {
    const d = dep('carburant', 7240, 1207, 'v-tour');
    expect(run(d, P, 'demi-superieur').deduit).toBe(966);
    expect(run(d, P, 'inferieur').deduit).toBe(965);
    expect(run(d, P, 'superieur').deduit).toBe(966);
    expect(run(d, P, 'inferieur').charge).toBe(6275);
  });

  it('vehicule-inconnu', () => {
    const attendu = { code: 'A_VERIFIER', deduit: 0, charge: 7240 };
    expect(run(dep('carburant', 7240, 1207, 'v-autre'))).toEqual(attendu);
    expect(run(dep('carburant', 7240, 1207, 'v-tour'), P, 'demi-superieur', [])).toEqual(attendu);
    const inverse = [...V].reverse();
    expect(run(dep('carburant', 7240, 1207, 'v-tour'), P, 'demi-superieur', inverse)).toEqual(run(dep('carburant', 7240, 1207, 'v-tour')));
    expect(run(dep('carburant', 7240, 1207, 'v-util'), P, 'demi-superieur', inverse).deduit).toBe(1207);
  });

  it('part-hors-bornes-exception', () => {
    const d = dep('carburant', 1000, 200, 'v-tour');
    for (const v of ['-1', '10001', 'NaN', 'Infinity', '1.5', 'abc']) {
      expect(code(() => run(d, { ...P, carburantTourisme: param(v) }))).toBe('parametre_invalide');
    }
    expect(code(() => run(d, { ...P, carburantTourisme: param('10000') }))).toBeUndefined();
    expect(code(() => run(d, { ...P, carburantTourisme: param('0') }))).toBeUndefined();
    expect(code(() => run(dep('peage', 1000, 200, 'v-tour'), { ...P, autresTourisme: param('10001') }))).toBe('parametre_invalide');
  });

  it('tva-superieure-au-ttc-exception', () => {
    expect(code(() => run(dep('carburant', 1000, 1001, 'v-tour')))).toBe('entree_invalide');
    expect(code(() => run(dep('carburant', 1000, 1000, 'v-tour')))).toBeUndefined();
    expect(code(() => run(dep('carburant', 1000, 1001)))).toBe('entree_invalide');
  });

  it('montants-invalides', () => {
    for (const n of [Number.NaN, Number.POSITIVE_INFINITY, 1.5, -1]) {
      expect(code(() => run(dep('carburant', n, 0, 'v-tour')))).toBe('entree_invalide');
      expect(code(() => run(dep('carburant', 1000, n, 'v-tour')))).toBe('entree_invalide');
    }
    expect(code(() => run(dep('carburant', 0, 0, 'v-tour')))).toBeUndefined();
    expect(() => regleCCT08.evaluer({ depense: dep('carburant', Number.NaN, 0), vehicules: V, parametres: P, arrondi: 'inferieur' })).toThrow(ErreurControle);
  });
});
