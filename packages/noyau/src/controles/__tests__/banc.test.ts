import { describe, expect, it } from 'vitest';
import { genererAnomalies, genererCasConnus, lancerBanc, NB_PROPRES, verdictBanc } from './banc-donnees.js';

// Critère de qualité du banc (V3-CTL-079) : 5 % de 200 pièces propres.
const MAX_FAUSSES_ALERTES = 10;
const DUREE_MAX_MS = 10000;
const FAMILLES = { equilibre: 4, arithmetique: 4, societe: 3, dates: 3, natures: 3, tva: 3 };

describe('banc d anomalies injectées', () => {
  it('CT-30', () => {
    const debut = Date.now();
    const anomalies = genererAnomalies();
    const compte: Record<string, number> = {};
    for (const a of anomalies) compte[a.famille] = (compte[a.famille] ?? 0) + 1;
    expect(compte).toEqual(FAMILLES);
    expect(anomalies).toHaveLength(20);
    expect(NB_PROPRES).toBe(200);
    for (const a of anomalies) {
      expect(a.executer([]).some((t) => t.regleId === a.regleAttendue && t.resultat === 'ALERTE'), a.id).toBe(true);
    }
    const r = lancerBanc();
    expect(r.detectees).toBe(20);
    expect(r.faussesAlertes).toBeLessThanOrEqual(MAX_FAUSSES_ALERTES);
    expect(r.propres.every((t) => t.resultat !== 'IMPOSSIBLE')).toBe(true);
    expect(verdictBanc({ ...r, maxFaussesAlertes: MAX_FAUSSES_ALERTES })).toBe('vert');
    expect(Date.now() - debut).toBeLessThan(DUREE_MAX_MS);
  });

  it('banc-repetable', () => {
    expect(lancerBanc().propres).toEqual(lancerBanc().propres);
    expect(genererAnomalies().map((a) => a.executer([]))).toEqual(genererAnomalies().map((a) => a.executer([])));
  });

  it('seuil-de-fausses-alertes-exact', () => {
    const base = { detectees: 20, attendues: 20, maxFaussesAlertes: MAX_FAUSSES_ALERTES };
    expect(verdictBanc({ ...base, faussesAlertes: 10 })).toBe('vert');
    expect(verdictBanc({ ...base, faussesAlertes: 11 })).toBe('rouge');
    expect(verdictBanc({ ...base, faussesAlertes: Number.NaN })).toBe('rouge');
  });

  it('anomalie-manquee-rouge', () => {
    const r = lancerBanc(['CC-K05']);
    expect(r.detectees).toBe(19);
    expect(verdictBanc({ ...r, maxFaussesAlertes: MAX_FAUSSES_ALERTES })).toBe('rouge');
  });

  it('ht-pris-pour-ttc-detecte', () => {
    const cas = genererCasConnus().find((c) => c.id === 'K01');
    expect(cas?.famille).toBe('montants');
    expect(cas?.executer([]).some((t) => t.regleId === 'CC-K06' && t.resultat === 'ALERTE')).toBe(true);
    // sans la règle attendue, le cas n'est plus détecté
    expect(cas?.executer(['CC-K06'])).toEqual([]);
  });

  it('remboursement-non-lie-detecte', () => {
    const cas = genererCasConnus().find((c) => c.id === 'K02');
    expect(cas?.famille).toBe('paiements');
    expect(cas?.executer([]).some((t) => t.regleId === 'CC-K13' && t.resultat === 'ALERTE')).toBe(true);
    expect(cas?.executer(['CC-K13'])).toEqual([]);
  });

  it('cas-connus-sans-effet-sur-le-banc-de-base', () => {
    expect(genererCasConnus()).toHaveLength(2);
    expect(genererAnomalies()).toHaveLength(20);
    expect(lancerBanc().attendues).toBe(20);
  });
});
