import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { ErreurBilan, capitauxPropresSousSeuil, etatsFinanciers } from '../bilan.js';
import type { PosteAffecte, PosteEtat, ResultatAffectation } from '../postes.js';

// Jeu fictif inventé : montants de B1 et B2, postes sans lien avec un plan réel.
const RES = 'Poste Resultat';
const TABLE: PosteEtat[] = [
  { poste: RES, cote: 'passif', prefixes: ['X'], sens: 'tous' },
  { poste: 'Poste Alpha', cote: 'actif', prefixes: ['Y'], sens: 'tous' },
];
const poste = (nom: string, cote: PosteAffecte['cote'], montant: number): PosteAffecte => ({ poste: nom, cote, montant: centimes(montant), comptes: [] });
const affectation = (actif: number, passif: number, produits: number, charges: number): ResultatAffectation => ({
  postes: [poste('Poste Alpha', 'actif', actif), poste('Poste Beta', 'passif', passif), poste('Poste Delta', 'produits', produits), poste('Poste Gamma', 'charges', charges)],
  nonAffectes: [],
  ambigus: [],
});
const b2 = affectation(1750000, 1300000, 600000, 150000);
const erreur = (action: () => unknown): string | undefined => {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurBilan ? e.code : 'autre';
  }
  return undefined;
};

describe('états financiers', () => {
  it('compte-de-resultat-b1', () => {
    const e = etatsFinanciers(b2, { table: TABLE, posteResultat: RES });
    expect(e.compteResultat).toEqual({ produits: 600000, charges: 150000, resultat: 450000 });
  });

  it('bilan-equilibre-b2', () => {
    const e = etatsFinanciers(b2, { table: TABLE, posteResultat: RES });
    expect(e.bilan).toEqual({ actif: 1750000, passifHorsResultat: 1300000, resultat: 450000, passif: 1750000 });
    expect(e.controles).toEqual([
      { id: 'ETAT-01', ok: true, ecartCentimes: 0 },
      { id: 'ETAT-02', ok: true, ecartCentimes: 0 },
    ]);
    expect(e.postes.find((p) => p.poste === RES)).toEqual({ poste: RES, cote: 'passif', montant: 450000 });
  });

  it('desequilibre-un-centime-etat-01', () => {
    const e = etatsFinanciers(affectation(1750001, 1300000, 600000, 150000), { table: TABLE, posteResultat: RES });
    expect(e.controles[0]).toEqual({ id: 'ETAT-01', ok: false, ecartCentimes: 1 });
    expect(e.controles[1]?.ok).toBe(true);
    expect(etatsFinanciers(affectation(1749999, 1300000, 600000, 150000), { table: TABLE, posteResultat: RES }).controles[0]?.ecartCentimes).toBe(-1);
  });

  it('perte-au-passif-en-negatif', () => {
    const e = etatsFinanciers(affectation(1000000, 1300000, 100000, 400000), { table: TABLE, posteResultat: RES });
    expect(e.compteResultat.resultat).toBe(-300000);
    expect(e.bilan).toEqual({ actif: 1000000, passifHorsResultat: 1300000, resultat: -300000, passif: 1000000 });
    expect(e.postes.find((p) => p.poste === RES)?.montant).toBe(-300000);
    expect(e.controles.every((c) => c.ok)).toBe(true);
  });

  it('premier-exercice-sans-variation', () => {
    expect(etatsFinanciers(b2, { table: TABLE, posteResultat: RES }).variations).toBeUndefined();
  });

  it('variations-avec-n1', () => {
    const n1 = etatsFinanciers(affectation(1000000, 700000, 500000, 200000), { table: TABLE, posteResultat: RES });
    const e = etatsFinanciers(b2, { table: TABLE, posteResultat: RES, precedent: n1 });
    const v = (nom: string) => e.variations?.find((x) => x.poste === nom);
    expect(v('Poste Alpha')).toMatchObject({ n: 1750000, n1: 1000000 });
    expect(v(RES)).toMatchObject({ n: 450000, n1: 300000 });
    const plus = { ...b2, postes: [...b2.postes, poste('Poste Omega', 'actif', 5)] };
    const seul = etatsFinanciers(plus, { table: TABLE, posteResultat: RES, precedent: n1 });
    expect(seul.variations?.find((x) => x.poste === 'Poste Omega')).toMatchObject({ n: 5, n1: 0 });
    const noms = e.variations?.map((x) => x.poste) ?? [];
    expect(noms).toEqual([...noms].sort());
  });

  it('capitaux-propres-sous-seuil', () => {
    const cp = (capitauxPropres: number, capital: number, f = 4000) =>
      capitauxPropresSousSeuil({ capitauxPropres: centimes(capitauxPropres), capital: centimes(capital) }, f);
    expect(cp(399999, 1000000)).toBe(true);
    expect(cp(400000, 1000000)).toBe(false);
    expect(cp(-1, 1000000)).toBe(true);
    expect(cp(333, 1000, 3334)).toBe(true);
    expect(cp(334, 1000, 3334)).toBe(false);
    expect(cp(0, 0)).toBe(false);
    expect(cp(0, 1000000, 0)).toBe(false);
    expect(cp(9999, 10000, 10000)).toBe(true);
  });
});

describe('états financiers : cas limites', () => {
  it('affectation vide : tout à zéro, contrôles ok', () => {
    const e = etatsFinanciers({ postes: [], nonAffectes: [], ambigus: [] }, { table: TABLE, posteResultat: RES });
    expect(e.compteResultat).toEqual({ produits: 0, charges: 0, resultat: 0 });
    expect(e.bilan).toEqual({ actif: 0, passifHorsResultat: 0, resultat: 0, passif: 0 });
    expect(e.controles.map((c) => c.ok)).toEqual([true, true]);
  });

  it('refus des fractions et montants invalides', () => {
    const f = (v: number) => erreur(() => capitauxPropresSousSeuil({ capitauxPropres: centimes(1), capital: centimes(1) }, v));
    for (const v of [-1, 10001, Number.NaN, Infinity, 1.5]) expect(f(v)).toBe('fraction_invalide');
    expect(f(0)).toBeUndefined();
    expect(f(10000)).toBeUndefined();
    expect(erreur(() => capitauxPropresSousSeuil({ capitauxPropres: 1.5 as never, capital: centimes(1) }, 1))).toBe('montant_invalide');
    expect(erreur(() => capitauxPropresSousSeuil({ capitauxPropres: centimes(1), capital: centimes(-1) }, 1))).toBe('montant_invalide');
  });

  it('refus du poste de résultat absent ou mal placé', () => {
    expect(erreur(() => etatsFinanciers(b2, { table: TABLE, posteResultat: '' }))).toBe('poste_resultat_invalide');
    expect(erreur(() => etatsFinanciers(b2, { table: TABLE, posteResultat: 'Poste Alpha' }))).toBe('poste_resultat_invalide');
    expect(erreur(() => etatsFinanciers(b2, { table: TABLE, posteResultat: 'Poste Inconnu' }))).toBe('poste_resultat_invalide');
  });

  it('un poste de résultat déjà présent au passif reçoit le résultat', () => {
    const a = affectation(1750000, 1300000, 600000, 150000);
    a.postes.push(poste(RES, 'passif', 10));
    const e = etatsFinanciers(a, { table: TABLE, posteResultat: RES });
    expect(e.postes.filter((p) => p.poste === RES)).toEqual([{ poste: RES, cote: 'passif', montant: 450010 }]);
    expect(e.bilan.passifHorsResultat).toBe(1300010);
  });
});
