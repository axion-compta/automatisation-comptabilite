import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { comparerRapports, empreinteVersions, tauxDetectionPdb } from '../calibrage.js';
import type { RapportCalibrage } from '../calibrage.js';
import { lancerBanc, NB_PROPRES } from './banc-donnees.js';
import { regleCCK04 } from '../regles/arithmetique.js';
import { regleCCK11, regleCCK11M } from '../regles/dates-piece.js';
import { regleCCK08 } from '../regles/destinataire.js';
import { regleCCK01, regleCCK02, regleCCK03 } from '../regles/equilibre.js';
import { regleCCT06 } from '../regles/multi-taux.js';
import { regleCCK12 } from '../regles/nature.js';
import { regleCCK05, regleCCK06 } from '../regles/pied-de-facture.js';
import { regleCCT02 } from '../regles/tva-en-doute.js';

const REGLES_DU_BANC = [regleCCK01, regleCCK02, regleCCK03, regleCCK04, regleCCK05, regleCCK06, regleCCK08, regleCCK11, regleCCK11M, regleCCK12, regleCCT02, regleCCT06];

const reference = JSON.parse(readFileSync(new URL('../../../../../docs/calibrage-controles.json', import.meta.url), 'utf8')) as RapportCalibrage;
const base: RapportCalibrage = { versionCatalogue: 'v-test', versionsRegles: { A: 1, B: 2 }, detectees: 20, attendues: 20, faussesAlertes: 2, propres: 200 };
const avec = (p: Partial<RapportCalibrage>): RapportCalibrage => ({ ...base, ...p });

describe('calibrage', () => {
  it('reference-sans-regression', () => {
    const banc = lancerBanc();
    const versionsRegles = Object.fromEntries(REGLES_DU_BANC.map((r) => [r.id, r.version]));
    const rejoue = { ...reference, versionsRegles, detectees: banc.detectees, attendues: banc.attendues, faussesAlertes: banc.faussesAlertes, propres: NB_PROPRES };
    expect(rejoue).toEqual(reference);
    expect(reference.detectees).toBe(reference.attendues);
    expect(comparerRapports(reference, rejoue)).toEqual({ regression: false, motifs: [] });
  });
  it('detection-en-baisse', () => {
    expect(comparerRapports(base, avec({ detectees: 19 }))).toEqual({ regression: true, motifs: ['detection_en_baisse'] });
    expect(comparerRapports(avec({ detectees: 19 }), avec({ detectees: 20 })).regression).toBe(false);
    expect(comparerRapports(avec({ detectees: 10, attendues: 20 }), avec({ detectees: 5, attendues: 10 })).regression).toBe(false);
  });
  it('fausses-alertes-en-hausse', () => {
    expect(comparerRapports(base, avec({ faussesAlertes: 3 }))).toEqual({ regression: true, motifs: ['fausses_alertes_en_hausse'] });
    expect(comparerRapports(base, avec({ faussesAlertes: 2 })).regression).toBe(false);
    expect(comparerRapports(base, avec({ faussesAlertes: 1 })).regression).toBe(false);
    expect(comparerRapports(base, avec({ faussesAlertes: 4, propres: 400 })).regression).toBe(false);
  });
  it('regle-retiree', () => {
    expect(comparerRapports(base, avec({ versionsRegles: { A: 1 } }))).toEqual({ regression: true, motifs: ['regle_retiree'] });
    expect(comparerRapports(base, avec({ versionsRegles: { A: 2, B: 3, C: 1 } })).regression).toBe(false);
    const tout = comparerRapports(base, avec({ detectees: 1, faussesAlertes: 9, versionsRegles: {} }));
    expect(tout.motifs).toEqual(['detection_en_baisse', 'fausses_alertes_en_hausse', 'regle_retiree']);
  });
  it('taux-arrondi-explicite', () => {
    expect(tauxDetectionPdb(base)).toBe(10000);
    expect(tauxDetectionPdb(avec({ detectees: 1, attendues: 3 }))).toBe(3333);
    expect(tauxDetectionPdb(avec({ detectees: 2, attendues: 3 }))).toBe(6666);
    expect(tauxDetectionPdb(avec({ detectees: 0 }))).toBe(0);
    for (const detectees of [Number.NaN, Infinity, 1.5, -1, 21]) expect(() => tauxDetectionPdb(avec({ detectees }))).toThrow('rapport_invalide');
    expect(() => tauxDetectionPdb(avec({ faussesAlertes: 200 }))).not.toThrow();
    expect(() => comparerRapports(base, avec({ faussesAlertes: 201 }))).toThrow('rapport_invalide');
    expect(() => comparerRapports(base, avec({ propres: Number.NaN }))).toThrow('rapport_invalide');
    expect(() => comparerRapports(avec({ faussesAlertes: -1 }), base)).toThrow('rapport_invalide');
  });
  it('empreinte-stable', () => {
    expect(empreinteVersions({ B: 2, A: 1 })).toBe(empreinteVersions({ A: 1, B: 2 }));
    expect(empreinteVersions({ A: 1, B: 2 })).toBe('A=1;B=2');
    expect(empreinteVersions({})).toBe('');
    expect(empreinteVersions({ A: 1 })).not.toBe(empreinteVersions({ A: 2 }));
    expect(empreinteVersions({ A: 12 })).not.toBe(empreinteVersions({ A: 1, '2': 1 }));
    for (const v of [0, -1, 1.5, Number.NaN, Infinity]) expect(() => empreinteVersions({ A: v })).toThrow('version_invalide');
  });
  it('attendues-nulles-exception', () => {
    expect(() => tauxDetectionPdb(avec({ detectees: 0, attendues: 0 }))).toThrow('attendues_nulles');
    expect(() => comparerRapports(avec({ detectees: 0, attendues: 0 }), base)).toThrow('attendues_nulles');
    expect(() => comparerRapports(base, avec({ detectees: 0, attendues: 0 }))).toThrow('attendues_nulles');
  });
});
