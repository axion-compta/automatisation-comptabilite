import { describe, expect, it } from 'vitest';
import { centimes } from '../../../argent/index.js';
import { executerControles } from '../../moteur.js';
import { NON_AFFECTE, regleAnalytique, totauxAnalytiques, type EntreeAnalytique } from '../analytique.js';

const ligne = (id: string, montant: number) => ({ id, montant: centimes(montant) });
const vent = (ligneId: string, ...parts: [string, number][]) => ({
  ligneId,
  parts: parts.map(([sectionId, montant]) => ({ sectionId, montant: centimes(montant) })),
});
const entree = (lignes: EntreeAnalytique['lignes'], ventilations: EntreeAnalytique['ventilations']): EntreeAnalytique => ({
  lignes,
  ventilations,
});

describe('controle analytique CC-PM03', () => {
  it('CT-PM03', () => {
    const ok = entree([ligne('l1', 10000)], [vent('l1', ['A', 6000], ['B', 4000])]);
    expect(regleAnalytique.evaluer(ok)).toEqual({ resultat: 'OK' });
    const ecart = entree([ligne('l1', 10000)], [vent('l1', ['A', 6000], ['B', 4001])]);
    expect(totauxAnalytiques(ecart.lignes, ecart.ventilations).ecart).toBe(-1);
    expect(regleAnalytique.evaluer(ecart)).toEqual({ resultat: 'ALERTE', ecartCentimes: -1 });
    const trace = executerControles(
      [regleAnalytique],
      [{ type: 'analytique', id: 'x', donnee: ecart }],
      'avant_export',
      '2026-01-01T00:00:00Z',
    );
    expect(trace[0]?.resultat).toBe('ALERTE');
  });

  it('non-affecte-recoit-le-reste', () => {
    const e = entree([ligne('l1', 380000), ligne('l2', 120000)], [vent('l1', ['A', 380000])]);
    const t = totauxAnalytiques(e.lignes, e.ventilations);
    expect(t.nonAffecte).toBe(120000);
    expect(t.parSection).toEqual({ A: 380000, [NON_AFFECTE]: 120000 });
    expect(t.totalAnalytique).toBe(500000);
    expect(t.totalGeneral).toBe(500000);
    const partiel = totauxAnalytiques([ligne('l1', 500000)], [vent('l1', ['A', 380000])]);
    expect(partiel.nonAffecte).toBe(120000);
    expect(partiel.ecart).toBe(0);
    expect(regleAnalytique.evaluer(e)).toEqual({ resultat: 'OK' });
  });

  it('tout-ventile-ok', () => {
    const t = totauxAnalytiques([ligne('l1', 700), ligne('l2', -200)], [vent('l1', ['A', 300], ['B', 400]), vent('l2', ['A', -200])]);
    expect(t.nonAffecte).toBe(0);
    expect(t.parSection).toEqual({ A: 100, B: 400 });
    expect(t.ecart).toBe(0);
    expect(regleAnalytique.evaluer(entree([], []))).toEqual({ resultat: 'OK' });
  });

  it('aucune-ventilation-tout-non-affecte', () => {
    const t = totauxAnalytiques([ligne('l1', 700), ligne('l2', -200)], []);
    expect(t.nonAffecte).toBe(500);
    expect(t.parSection).toEqual({ [NON_AFFECTE]: 500 });
    expect(t.totalAnalytique).toBe(t.totalGeneral);
    expect(t.ecart).toBe(0);
  });

  it('ventilation-d-une-ligne-inconnue-refusee', () => {
    const inconnue = entree([ligne('l1', 100)], [vent('zz', ['A', 100])]);
    expect(() => totauxAnalytiques(inconnue.lignes, inconnue.ventilations)).toThrow();
    expect(regleAnalytique.evaluer).toBeDefined();
    expect(() => regleAnalytique.evaluer(inconnue)).toThrow();
    const trace = executerControles([regleAnalytique], [{ type: 'a', id: 'x', donnee: inconnue }], 'avant_cloture', 't');
    expect(trace[0]?.resultat).toBe('IMPOSSIBLE');
    const double = entree([ligne('l1', 100)], [vent('l1', ['A', 100]), vent('l1', ['B', 100])]);
    expect(() => totauxAnalytiques(double.lignes, double.ventilations)).toThrow();
    const nan = entree([{ id: 'l1', montant: Number.NaN as never }], []);
    expect(() => totauxAnalytiques(nan.lignes, nan.ventilations)).toThrow();
  });

  it('metadonnees de la regle', () => {
    expect(regleAnalytique).toMatchObject({
      id: 'CC-PM03',
      version: 1,
      gravite: 'B',
      bloque: ['export', 'cloture'],
      declencheurs: ['avant_export', 'avant_cloture'],
      actif: true,
    });
  });
});
