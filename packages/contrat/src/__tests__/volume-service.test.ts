import { describe, expect, it } from 'vitest';
import { construireVolume, creerServiceVolume } from '../domaines/volume-service.js';

const HORLOGE = () => '2026-06-15T10:00:00Z';
const lire = (scenario: string | null) => creerServiceVolume({ horloge: HORLOGE, scenario }).lire();

describe('service du volume', () => {
  it('volume-normal-sans-alerte', () => {
    expect(lire(null)).toMatchObject({ palier: { code: 'compta-1' }, compris: 100, utilise: 20, alertes_bps: [], depasse: false, proposer_choix: false });
  });
  it('volume-seuil-une-alerte', () => {
    const v = lire('volume=seuil');
    expect(v.alertes_bps).toEqual([7000]);
    expect(v.depasse).toBe(false);
  });
  it('volume-depasse-continuer-et-choix', () => {
    expect(lire('volume=depasse')).toMatchObject({ utilise: 101, alertes_bps: [7000, 10000], depasse: true, proposer_choix: true, comportement: 'continuer' });
  });
  it('prevision-entiere-et-superieure-ou-egale-a-utilise', () => {
    for (const s of [null, 'volume=seuil', 'volume=depasse']) {
      const v = lire(s);
      expect(Number.isSafeInteger(v.prevision_fin_de_mois)).toBe(true);
      expect(v.prevision_fin_de_mois).toBeGreaterThanOrEqual(v.utilise);
    }
  });
  it('prevision-stable-avec-horloge-fixe', () => {
    expect(lire('volume=seuil')).toEqual(lire('volume=seuil'));
  });
  it('palier-superieur-du-plus-grand-nul', () => {
    expect(lire(null).palier_superieur).toEqual({ code: 'compta-2', nom_affiche: '300 pièces par mois', pieces_par_mois: 300 });
    const v = construireVolume({ codePalier: 'compta-3', utilise: 5, piecesParJour: new Map(), aujourdhui: '2026-06-15' });
    expect(v.palier_superieur).toBeNull();
    expect(v.compris).toBe(1000);
  });
  it('palier-inconnu-refuse', () => {
    expect(() => construireVolume({ codePalier: 'x', utilise: 0, piecesParJour: new Map(), aujourdhui: '2026-06-15' })).toThrow();
  });
  it('aucun-budget-ni-cout-dans-la-reponse', () => {
    for (const s of [null, 'volume=seuil', 'volume=depasse']) {
      expect(JSON.stringify(Object.keys(lire(s)))).not.toMatch(/cout|budget|jetons|montant|prix/);
    }
  });
});
