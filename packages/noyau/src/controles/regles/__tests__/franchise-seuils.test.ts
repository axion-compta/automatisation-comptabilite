import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import { executerControles } from '../../moteur.js';
import type { ParametreLu } from '../commun.js';
import { positionFranchise, regleCCT12, regleCCT12M, seuilProrata } from '../franchise-seuils.js';
import type { ObjetFranchise } from '../franchise-seuils.js';

const par = (valeur: string | null, statut: ParametreLu['statut'] = 'valide'): ParametreLu => ({ cle: 'p', valeur, statut });
const base: ObjetFranchise = {
  caVentes: centimes(0),
  caServices: centimes(0),
  seuilVentes: par('3750000'),
  seuilServices: par('1500000'),
  majoreVentes: par('4125000'),
  majoreServices: par('1650000'),
  alertePdb: 9000,
};
const avec = (p: Partial<ObjetFranchise>): ObjetFranchise => ({ ...base, ...p });
const ventes = (c: number): ObjetFranchise => avec({ caVentes: centimes(c) });
const services = (c: number): ObjetFranchise => avec({ caServices: centimes(c) });
const OK = { resultat: 'OK' };
const ALERTE = { resultat: 'ALERTE' };
const code = (f: () => unknown): string => {
  try {
    f();
  } catch (e) {
    return (e as { code?: string }).code ?? 'autre';
  }
  return 'aucune';
};

const imposs = (d: ObjetFranchise): string | undefined =>
  executerControles([regleCCT12M], [{ type: 'societe', id: 'S', donnee: d }], 'continu', 'h')[0]?.resultat;

describe('CC-T12 franchise face aux seuils', () => {
  it('CT-29 seuils', () => {
    expect(positionFranchise(ventes(3375000))).toBe('alerte');
    expect(regleCCT12M.evaluer(ventes(3375000))).toEqual(ALERTE);
    expect(regleCCT12.evaluer(ventes(3375000))).toEqual(OK);
    expect(positionFranchise(ventes(4125001))).toBe('depasse_majore');
    expect(regleCCT12.evaluer(ventes(4125001))).toEqual(ALERTE);
    expect(regleCCT12M.evaluer(ventes(4125001))).toEqual(OK);
    expect(positionFranchise(ventes(0))).toBe('sous');
    expect(regleCCT12.evaluer(ventes(0))).toEqual(OK);
    expect(regleCCT12M.evaluer(ventes(0))).toEqual(OK);
    const dec = ['continu', 'nocturne', 'a_la_demande'];
    const meta = (r: typeof regleCCT12): unknown[] => [r.id, r.version, r.gravite, r.bloque, r.declencheurs, r.actif];
    expect(meta(regleCCT12)).toEqual(['CC-T12', 1, 'B', ['tva'], dec, true]);
    expect(meta(regleCCT12M)).toEqual(['CC-T12M', 1, 'M', [], dec, true]);
    const traces = executerControles([regleCCT12], [{ type: 'societe', id: 'S1', donnee: ventes(4125001) }], 'nocturne', 'h');
    expect(traces.map((t) => t.resultat)).toEqual(['ALERTE']);
  });

  it('majore-exact-non-bloquant', () => {
    expect(positionFranchise(ventes(4125000))).toBe('alerte');
    expect(regleCCT12.evaluer(ventes(4125000))).toEqual(OK);
    expect(regleCCT12M.evaluer(ventes(4125000))).toEqual(ALERTE);
  });

  it('alerte-exacte', () => {
    expect(positionFranchise(ventes(3374999))).toBe('sous');
    expect(positionFranchise(ventes(3375000))).toBe('alerte');
    expect(positionFranchise(ventes(3375001))).toBe('alerte');
    expect(positionFranchise(avec({ alertePdb: 10000, caVentes: centimes(3749999) }))).toBe('sous');
    expect(positionFranchise(avec({ alertePdb: 10000, caVentes: centimes(3750000) }))).toBe('alerte');
    expect(positionFranchise(avec({ alertePdb: 0 }))).toBe('alerte');
    // arrondi au centime supérieur : 3 333 centimes à 90 % = 2 999,7 -> alerte dès 3 000
    const o = avec({ seuilVentes: par('3333') });
    expect(positionFranchise({ ...o, caVentes: centimes(2999) })).toBe('sous');
    expect(positionFranchise({ ...o, caVentes: centimes(3000) })).toBe('alerte');
  });

  it('services-pire-que-ventes', () => {
    expect(positionFranchise(services(1350000))).toBe('alerte');
    expect(positionFranchise(services(1349999))).toBe('sous');
    expect(positionFranchise(services(1650001))).toBe('depasse_majore');
    expect(positionFranchise(services(1650000))).toBe('alerte');
    expect(positionFranchise(avec({ caVentes: centimes(4125001), caServices: centimes(1350000) }))).toBe('depasse_majore');
    expect(positionFranchise(avec({ caVentes: centimes(3375000), caServices: centimes(1650001) }))).toBe('depasse_majore');
    expect(positionFranchise(avec({ caVentes: centimes(3375000), caServices: centimes(0) }))).toBe('alerte');
    expect(regleCCT12.evaluer(services(1650001))).toEqual(ALERTE);
  });

  it('prorata-premiere-annee', () => {
    const pr = { joursActivite: 100, joursAnnee: 200 };
    expect(seuilProrata(centimes(3750000), pr)).toBe(1875000);
    expect(seuilProrata(centimes(3750000), undefined)).toBe(3750000);
    expect(seuilProrata(centimes(3750000), { joursActivite: 200, joursAnnee: 200 })).toBe(3750000);
    expect(seuilProrata(centimes(1), { joursActivite: 1, joursAnnee: 3 })).toBe(0);
    const o = avec({ prorata: pr });
    expect(positionFranchise({ ...o, caVentes: centimes(2062500) })).toBe('alerte');
    expect(positionFranchise({ ...o, caVentes: centimes(2062501) })).toBe('depasse_majore');
    expect(positionFranchise({ ...o, caVentes: centimes(1687499) })).toBe('sous');
    expect(positionFranchise({ ...o, caVentes: centimes(1687500) })).toBe('alerte');
    expect(positionFranchise(avec({ caVentes: centimes(2062501) }))).toBe('sous');
    for (const prorata of [
      { joursActivite: 0, joursAnnee: 200 },
      { joursActivite: -1, joursAnnee: 200 },
      { joursActivite: 201, joursAnnee: 200 },
      { joursActivite: 1, joursAnnee: 0 },
      { joursActivite: 1.5, joursAnnee: 200 },
      { joursActivite: Number.NaN, joursAnnee: 200 },
      { joursActivite: 1, joursAnnee: Number.POSITIVE_INFINITY },
    ]) {
      expect(code(() => positionFranchise(avec({ prorata })))).toBe('entree_invalide');
      expect(code(() => seuilProrata(centimes(10), prorata))).toBe('entree_invalide');
    }
  });

  it('seuil-a-verifier-impossible', () => {
    const cas: Partial<ObjetFranchise>[] = [
      { seuilVentes: par('3750000', 'a_verifier') },
      { seuilServices: par('1500000', 'non_verifie') },
      { majoreVentes: par(null, 'absent') },
      { majoreServices: par(null) },
    ];
    for (const c of cas) {
      expect(positionFranchise(avec(c))).toBe('a_verifier');
      expect(regleCCT12.evaluer(avec(c))).toEqual({ resultat: 'IMPOSSIBLE' });
      expect(regleCCT12M.evaluer(avec(c))).toEqual(OK);
    }
    expect(positionFranchise(avec({ seuilServices: par('1', 'a_verifier'), caVentes: centimes(4125001) }))).toBe('depasse_majore');
    expect(positionFranchise(avec({ seuilServices: par('1', 'a_verifier'), caVentes: centimes(3375000) }))).toBe('a_verifier');
    expect(code(() => positionFranchise(avec({ seuilVentes: par('abc') })))).toBe('parametre_invalide');
    expect(code(() => positionFranchise(avec({ majoreVentes: par('-1') })))).toBe('entree_invalide');
    expect(code(() => positionFranchise(avec({ seuilServices: par('1.5') })))).toBe('parametre_invalide');
    const traces = executerControles([regleCCT12], [{ type: 'societe', id: 'S1', donnee: avec({ seuilVentes: par(null, 'absent') }) }], 'continu', 'h');
    expect(traces.map((t) => t.resultat)).toEqual(['IMPOSSIBLE']);
  });

  it('alerte-pdb-invalide', () => {
    for (const alertePdb of [Number.NaN, -1, 10001, 1.5, Number.POSITIVE_INFINITY]) {
      expect(code(() => positionFranchise(avec({ alertePdb })))).toBe('entree_invalide');
      expect(code(() => regleCCT12.evaluer(avec({ alertePdb })))).toBe('entree_invalide');
      expect(imposs(avec({ alertePdb }))).toBe('IMPOSSIBLE');
    }
  });

  it('montants-invalides', () => {
    for (const v of [Number.NaN, Number.POSITIVE_INFINITY, 1.5, -1]) {
      expect(code(() => positionFranchise(avec({ caVentes: v as never })))).toBe('entree_invalide');
      expect(code(() => positionFranchise(avec({ caServices: v as never })))).toBe('entree_invalide');
      expect(imposs(avec({ caVentes: v as never }))).toBe('IMPOSSIBLE');
    }
  });
});
