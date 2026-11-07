import { describe, it, expect } from 'vitest';
import { construireRapport, rejouerIA } from '../rejouer-ia.mjs';

const regles = { 'CC-K01': 1, 'CC-K02': 1 };
const cas = (attendu, detecte, i) => ({ id: `c${i}`, attendu, detecte });
const jeu = (anomalies, detectees, propres, fausses) => [
  ...Array.from({ length: anomalies }, (_, i) => cas(true, i < detectees, i)),
  ...Array.from({ length: propres }, (_, i) => cas(false, i < fausses, 100 + i)),
];
const reference = { versionCatalogue: 'v1', versionsRegles: regles, detectees: 20, attendues: 20, faussesAlertes: 0, propres: 200 };
// faux comparateur : mêmes motifs que comparerRapports, injecté (le script ne charge aucun modèle)
const comparer = (ref, nv) => {
  const motifs = [];
  if (nv.detectees * ref.attendues < ref.detectees * nv.attendues) motifs.push('detection_en_baisse');
  if (nv.faussesAlertes * ref.propres > ref.faussesAlertes * nv.propres) motifs.push('fausses_alertes_en_hausse');
  return { regression: motifs.length > 0, motifs };
};
const lancer = (reponses) => rejouerIA({ reponses, reference, versionCatalogue: 'v1', versionsRegles: regles, comparer });

describe('rejouer-ia', () => {
  it('identique-vert', () => {
    const r = lancer(jeu(20, 20, 200, 0));
    expect(r.regression).toBe(false);
    expect(r.rapport).toEqual(reference);
  });
  it('regression-rouge', () => {
    expect(lancer(jeu(20, 19, 200, 0))).toMatchObject({ regression: true, motifs: ['detection_en_baisse'] });
    expect(lancer(jeu(20, 20, 200, 3))).toMatchObject({ regression: true, motifs: ['fausses_alertes_en_hausse'] });
  });
  it('rapport-compte-les-cas', () => {
    expect(construireRapport(jeu(4, 3, 10, 2), 'v', {})).toMatchObject({ detectees: 3, attendues: 4, faussesAlertes: 2, propres: 10 });
  });
  it.each([
    ['vide', []],
    ['non tableau', null],
    ['cas sans booleen', [{ id: 'a', attendu: 1, detecte: true }]],
    ['cas null', [null]],
    ['identifiant en double', [cas(true, true, 1), cas(true, true, 1)]],
  ])('reponses-invalides %s', (_n, reponses) => {
    expect(() => lancer(reponses)).toThrow('reponses_invalides');
  });
  it('comparateur-absent', () => {
    expect(() => rejouerIA({ reponses: jeu(1, 1, 1, 0), reference, versionCatalogue: 'v', versionsRegles: {}, comparer: undefined })).toThrow('comparateur_absent');
  });
});
