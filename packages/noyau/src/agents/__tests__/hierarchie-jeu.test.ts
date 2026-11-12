import { describe, expect, it } from 'vitest';
import { GRAVITES_CONSTAT, POLES } from '../../chat/types.js';
import { JEU_HIERARCHIE, REGISTRE_JEU, TABLE_JEU } from '../../../../donnees-fictives/src/hierarchie.js';
import { consolider, type Constat } from '../hierarchie.js';
import { verifierCitations } from '../sources.js';

const constats = (): Constat[] => JEU_HIERARCHIE.map((c) => ({ id: c.id, type: c.type, gravite: c.gravite, pole: c.pole, refusParChef: c.refusAttendu }));
const TABLE = { ...TABLE_JEU };
// Taux en entiers : « au moins pct % » sans flottant ; un total nul n'atteint jamais le seuil.
const auMoins = (bons: number, total: number, pct: number): boolean => total > 0 && bons * 100 >= pct * total;
const coutParEvenement = (couts: readonly number[]): number => Math.floor(couts.reduce((a, b) => a + b, 0) / couts.length);

describe('jeu de la hiérarchie des agents', () => {
  it('jeu-au-moins-quarante-constats', () => {
    expect(JEU_HIERARCHIE.length).toBeGreaterThanOrEqual(40);
    expect(new Set(JEU_HIERARCHIE.map((c) => c.id)).size).toBe(JEU_HIERARCHIE.length);
    for (const pole of POLES) for (const g of GRAVITES_CONSTAT) {
      expect(JEU_HIERARCHIE.some((c) => c.pole === pole && c.gravite === g), `${pole}/${g}`).toBe(true);
    }
    for (const c of JEU_HIERARCHIE) {
      expect(TABLE[c.type]).toBe(c.pole);
      expect(c.citations.length).toBeGreaterThan(0);
      expect(Number.isSafeInteger(c.coutMicroCentimes) && c.coutMicroCentimes > 0).toBe(true);
    }
    expect(JSON.stringify(JEU_HIERARCHIE)).not.toMatch(/@(?!\d)|\d{14}/);
  });

  it('escalade-juste-au-moins-95-pourcent', () => {
    const r = consolider(constats(), TABLE);
    const faites = new Set(r.escalades.map((e) => e.id));
    const attendues = JEU_HIERARCHIE.filter((c) => c.escaladeAttendue);
    const justes = attendues.filter((c) => faites.has(c.id));
    expect(attendues.length).toBeGreaterThan(0);
    expect(auMoins(justes.length, attendues.length, 95)).toBe(true);
    expect(faites.size).toBe(justes.length);
    for (const e of r.escalades) expect(e.pole).toBe(JEU_HIERARCHIE.find((c) => c.id === e.id)?.pole);
    expect(auMoins(19, 20, 95)).toBe(true);
    expect(auMoins(18, 20, 95)).toBe(false);
    expect(auMoins(0, 0, 95)).toBe(false);
  });

  it('refus-attendus-tous-refuses', () => {
    const r = consolider(constats(), TABLE);
    const attendus = JEU_HIERARCHIE.filter((c) => c.refusAttendu).map((c) => c.id).sort();
    expect(attendus.length).toBeGreaterThan(0);
    expect(r.a_verifier).toEqual(attendus);
    expect(r.constats).toHaveLength(JEU_HIERARCHIE.length);
  });

  it('sources-citees-cent-pourcent', () => {
    const toutes = JEU_HIERARCHIE.flatMap((c) => c.citations);
    const verifiees = toutes.filter((t) => verifierCitations([t], REGISTRE_JEU).valide);
    expect(toutes.length).toBeGreaterThan(JEU_HIERARCHIE.length);
    expect(verifiees.length * 100).toBe(100 * toutes.length);
    expect(verifierCitations(toutes, REGISTRE_JEU)).toEqual({ valide: true });
    expect(verifierCitations(['DEC-001:SRC-INCONNUE@1'], REGISTRE_JEU)).toEqual({ valide: false, inconnues: ['DEC-001:SRC-INCONNUE@1'], malFormees: [] });
    expect(verifierCitations(['SRC-FICT-1'], REGISTRE_JEU)).toEqual({ valide: false, inconnues: [], malFormees: ['SRC-FICT-1'] });
  });

  it('cout-par-evenement-entier', () => {
    const couts = JEU_HIERARCHIE.map((c) => c.coutMicroCentimes);
    const somme = couts.reduce((a, b) => a + b, 0);
    expect(somme).toBe(106250);
    expect(somme % couts.length).not.toBe(0);
    expect(coutParEvenement(couts)).toBe(2213);
    expect(Number.isInteger(coutParEvenement(couts))).toBe(true);
    expect(coutParEvenement([1, 2])).toBe(1);
    expect(coutParEvenement([0, 0])).toBe(0);
  });

  it('aucun-effet-produit', () => {
    const avant = JSON.stringify(constats());
    const entree = constats();
    const r = consolider(entree, TABLE);
    expect(r.effets).toEqual([]);
    expect(JSON.stringify(entree)).toBe(avant);
    expect(Object.keys(r).sort()).toEqual(['a_verifier', 'constats', 'effets', 'escalades']);
    for (const e of r.escalades) expect(e.vers).toBe('utilisateur');
  });
});
