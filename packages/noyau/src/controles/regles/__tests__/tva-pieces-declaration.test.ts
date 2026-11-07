import { describe, expect, it } from 'vitest';
import { type Centimes } from '../../../argent/index.js';
import { executerControles } from '../../moteur.js';
import { comparerPiecesDeclaration, regleCCT01, type EcartJustifie, type TotauxTva } from '../tva-pieces-declaration.js';

const c = (n: number): Centimes => n as Centimes; // brut : les cas invalides doivent atteindre la règle
const totaux = (p: Partial<{ col: [number, number][]; bs: number; immo: number; ac: number; ad: number }> = {}): TotauxTva => ({
  collecteeParTaux: new Map((p.col ?? []).map(([t, m]) => [t, c(m)])),
  deductibleBiensServices: c(p.bs ?? 0),
  deductibleImmobilisations: c(p.immo ?? 0),
  autoliquideeCollectee: c(p.ac ?? 0),
  autoliquideeDeductible: c(p.ad ?? 0),
});
const base = { col: [[2000, 240000]] as [number, number][], bs: 180000 };
const jus = (poste: string, montant: number, motif: EcartJustifie['motif'] = 'regularisation'): EcartJustifie => ({ motif, poste, date: '2026-10-31', montant: c(montant) });
const ev = (p: TotauxTva, d: TotauxTva, j: EcartJustifie[] = []) => regleCCT01.evaluer({ pieces: p, declaration: d, justifies: j });

describe('CC-T01 TVA des pièces et déclaration', () => {
  it('CT-16', () => {
    expect(ev(totaux(base), totaux(base))).toEqual({ resultat: 'OK', valeur: 0, ecartCentimes: 0 });
    expect(regleCCT01).toMatchObject({ id: 'CC-T01', version: 1, gravite: 'B', actif: true });
    expect(regleCCT01.bloque).toEqual(['tva', 'export']);
    expect(regleCCT01.declencheurs).toEqual(['continu', 'avant_tva', 'avant_export', 'a_la_demande']);
    const traces = executerControles([regleCCT01], [{ type: 'periode', id: '2026-10', donnee: { pieces: totaux(base), declaration: totaux(base), justifies: [] } }], 'avant_tva', 't');
    expect(traces[0]?.resultat).toBe('OK');
  });

  it('CT-17', () => {
    const apres = totaux({ ...base, bs: 182000 });
    expect(ev(apres, totaux(base))).toEqual({ resultat: 'ALERTE', valeur: 'deductible_bs', ecartCentimes: 2000 });
    expect(ev(apres, apres).resultat).toBe('OK');
  });

  it('un-centime-d-ecart-bloque', () => {
    for (const delta of [1, -1]) {
      const sortie = ev(totaux({ ...base, immo: delta }), totaux(base));
      expect(sortie).toEqual({ resultat: 'ALERTE', valeur: 'deductible_immo', ecartCentimes: 1 });
    }
    expect(comparerPiecesDeclaration(totaux({ ...base, immo: -1 }), totaux(base), []).ecarts).toEqual([{ poste: 'deductible_immo', ecart: -1 }]);
  });

  it('taux-d-un-seul-cote', () => {
    const p = totaux({ col: [[1000, 500], [2000, 700]] });
    const d = totaux({ col: [[2000, 700]] });
    expect(comparerPiecesDeclaration(p, d, [])).toEqual({ ecarts: [{ poste: 'collectee:1000', ecart: 500 }], ecartTotal: 500 });
    expect(comparerPiecesDeclaration(d, p, []).ecarts).toEqual([{ poste: 'collectee:1000', ecart: -500 }]);
    const deux = comparerPiecesDeclaration(totaux({ col: [[2000, 1], [1000, 2]] }), totaux(), []);
    expect(deux.ecarts.map((e) => e.poste)).toEqual(['collectee:1000', 'collectee:2000']);
    expect(ev(totaux({ col: [[1000, 300], [2000, -100]] }), totaux()).ecartCentimes).toBe(400);
  });

  it('autoliquidation-desequilibree', () => {
    const equilibre = totaux({ ac: 500, ad: 500 });
    expect(ev(equilibre, equilibre).resultat).toBe('OK');
    expect(ev(totaux({ ac: 500, ad: 400 }), equilibre)).toMatchObject({ resultat: 'ALERTE', valeur: 'autoliquidation' });
    expect(ev(equilibre, totaux({ ac: 500, ad: 400 }))).toMatchObject({ resultat: 'ALERTE', valeur: 'autoliquidation' });
    expect(ev(equilibre, totaux({ ac: 600, ad: 600 }))).toMatchObject({ resultat: 'ALERTE', ecartCentimes: 100 });
    expect(ev(totaux({ ac: 500, ad: 400 }), totaux({ ac: 600, ad: 500 })).resultat).toBe('ALERTE');
  });

  it('credit-reporte-justifie', () => {
    const p = totaux({ ...base, bs: 182000 });
    const j = jus('deductible_bs', 2000, 'credit_reporte');
    expect(ev(p, totaux(base), [j])).toMatchObject({ resultat: 'OK', ecartCentimes: 0 });
    expect(ev(p, totaux(base), [jus('deductible_bs', 1999)]).resultat).toBe('ALERTE');
    expect(ev(p, totaux(base), [jus('deductible_bs', 2001)])).toMatchObject({ resultat: 'ALERTE', ecartCentimes: 1 });
    expect(ev(p, totaux(base), [jus('collectee:2000', 2000)]).resultat).toBe('ALERTE');
  });

  it('justification-non-reutilisee', () => {
    const p = totaux({ col: [[2000, 2000]], bs: 2000 });
    const sortie = comparerPiecesDeclaration(p, totaux(), [jus('deductible_bs', 2000)]);
    expect(sortie).toEqual({ ecarts: [{ poste: 'collectee:2000', ecart: 2000 }], ecartTotal: 2000 });
    const deuxFois = comparerPiecesDeclaration(p, totaux(), [jus('deductible_bs', 1000), jus('deductible_bs', 1000)]);
    expect(deuxFois.ecarts).toEqual([{ poste: 'collectee:2000', ecart: 2000 }]);
  });

  it('declaration-vide-et-pieces-vides-ok', () => {
    expect(ev(totaux(), totaux())).toEqual({ resultat: 'OK', valeur: 0, ecartCentimes: 0 });
    expect(comparerPiecesDeclaration(totaux(), totaux(), [])).toEqual({ ecarts: [], ecartTotal: 0 });
  });

  it('jamais-ecartable', () => {
    expect(regleCCT01.gravite).toBe('B');
    const [t] = executerControles([regleCCT01], [{ type: 'periode', id: 'p', donnee: { pieces: totaux({ bs: 1 }), declaration: totaux(), justifies: [] } }], 'avant_export', 't');
    expect(t?.resultat).toBe('ALERTE');
  });

  it('entrees invalides et ordre inverse', () => {
    for (const mauvais of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(ev(totaux({ bs: mauvais }), totaux()).resultat).toBe('IMPOSSIBLE');
      expect(ev(totaux(), totaux({ col: [[2000, mauvais]] })).resultat).toBe('IMPOSSIBLE');
      expect(ev(totaux(), totaux({ col: [[mauvais, 1]] })).resultat).toBe('IMPOSSIBLE');
      expect(ev(totaux(), totaux(), [jus('deductible_bs', mauvais)]).resultat).toBe('IMPOSSIBLE');
    }
    expect(() => comparerPiecesDeclaration({ ...totaux(), deductibleImmobilisations: 1.5 as never }, totaux(), [])).toThrowError();
    const a = totaux({ col: [[2000, 5], [1000, 3]] });
    const b = totaux({ col: [[1000, 3], [2000, 5]] });
    expect(ev(a, b)).toEqual(ev(b, a));
    const j = [jus('deductible_bs', 1), jus('deductible_bs', 2)];
    const p = totaux({ bs: 3 });
    expect(ev(p, totaux(), j)).toEqual(ev(p, totaux(), [...j].reverse()));
  });
});
