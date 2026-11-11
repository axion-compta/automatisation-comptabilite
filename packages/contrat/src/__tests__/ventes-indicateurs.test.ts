import { describe, expect, it } from 'vitest';
import { genererVentes } from '../../../donnees-fictives/src/ventes.js';
import { QueryIndicateurs, Indicateurs, Serie } from '../domaines/ventes-indicateurs.js';
import { creerServiceIndicateurs } from '../domaines/ventes-indicateurs-service.js';
import { genererOpenapiLot, routesEcritureSansEnTete } from '../openapi.js';
import { REGISTRES } from '../registres/index.js';

const pleine = (regimeConfirme = false) => creerServiceIndicateurs(genererVentes(), { regimeConfirme });
const mois = (m: string, regime = false, prop = false) => pleine(regime).lireIndicateurs(m, prop);

describe('indicateurs et suites de numéros des ventes', () => {
  it('indicateurs-d-un-mois', () => {
    const r = mois('2026-01', true);
    expect(Indicateurs.parse(r)).toEqual(r);
    expect(r.chiffreAffaires.montantCentimes).toBeGreaterThan(0);
    expect(r.aEncaisser.montantCentimes).toBeGreaterThan(0);
    expect(r.enRetard.montantCentimes).toBeGreaterThan(0);
    expect(r.enRetard.clients).toBeGreaterThan(0);
    expect(r.provisoire).toBe(false);
    const prov = mois('2026-01', true, true);
    expect(prov.provisoire).toBe(true);
    expect(prov.chiffreAffaires.montantCentimes).toBeGreaterThanOrEqual(r.chiffreAffaires.montantCentimes);
    expect(mois('2026-03').chiffreAffaires.montantCentimes).not.toBe(r.chiffreAffaires.montantCentimes);
  });

  it('chaque-nombre-a-ses-pieces', () => {
    const r = mois('2026-01', true);
    for (const i of [r.chiffreAffaires, r.aEncaisser, r.enRetard, r.tvaEnAttente]) {
      expect(i.pieces.length, JSON.stringify(i)).toBeGreaterThan(0);
      expect(i.pieces).toEqual([...i.pieces].sort());
      expect(new Set(i.pieces).size).toBe(i.pieces.length);
    }
    expect(r.tvaCollectee).toHaveProperty('pieces');
    const retard = new Set(r.enRetard.pieces);
    expect(r.aEncaisser.pieces.filter((p) => retard.has(p))).toHaveLength(retard.size);
  });

  it('regime-non-confirme-aucun-montant', () => {
    for (const m of ['2026-01', '2026-02', '2026-06']) {
      const t = mois(m).tvaCollectee;
      expect(t).toEqual({ nonCalculee: 'regime_a_confirmer' });
      expect(JSON.stringify(t)).not.toMatch(/montant/);
    }
    expect(mois('2026-01', true).tvaCollectee).toHaveProperty('montantCentimes');
  });

  it('societe-vide-zeros', () => {
    const r = creerServiceIndicateurs(genererVentes(), { profil: 'vide', regimeConfirme: true }).lireIndicateurs('2026-01');
    const zero = { montantCentimes: 0, pieces: [] };
    expect(r).toEqual({ chiffreAffaires: zero, aEncaisser: zero, enRetard: { ...zero, clients: 0 }, tvaCollectee: zero, tvaEnAttente: zero, provisoire: false });
    expect(creerServiceIndicateurs(genererVentes(), { profil: 'vide' }).listerSeries()).toEqual([]);
  });

  it('mois-absent-ou-invalide-400', () => {
    for (const q of [{}, { mois: '2026-00' }, { mois: '2026-1' }, { mois: '2026-13' }, { mois: 'x'.repeat(500) }, { mois: '2026-01', avecPropositions: 'oui' }]) {
      expect(QueryIndicateurs.safeParse(q).success, JSON.stringify(q)).toBe(false);
    }
    expect(QueryIndicateurs.safeParse({ mois: '2026-01', avecPropositions: 'true' }).success).toBe(true);
    const lot = genererOpenapiLot('10') as { paths: Record<string, Record<string, { operationId?: string; parameters: { name: string; required: boolean }[] }>> };
    expect(lot.paths['/ventes/indicateurs']?.['get']?.parameters.find((x) => x.name === 'mois')?.required).toBe(true);
    expect(lot.paths['/ventes/series']?.['get']?.operationId).toBe('listerSeries');
    expect(Object.keys(REGISTRES['10'] ?? {})).toEqual(['ventesIndicateurs']);
    expect(routesEcritureSansEnTete()).toEqual([]);
  });

  it('series-trou-et-doublon', () => {
    const series = pleine().listerSeries();
    expect(series.map((s) => Serie.parse(s))).toEqual(series);
    const fa = series.find((s) => s.serie.startsWith('FA-2026-'));
    expect(fa?.trous).toContain(17);
    expect(fa?.doublons.some((d) => d.ordre === 1 && d.ids.length >= 2)).toBe(true);
    expect(fa?.tropDeTrous).toBe(false);
    expect(fa?.dernierOrdreVu).toBe(31);
  });
});
