import { describe, expect, it } from 'vitest';
import { ErreurParametre, parametreAuJour } from '../../au-jour.js';
import { verifierFrontieres } from '../../frontieres.js';
import { domaineOfficiel, verifierCatalogue } from '../../source.js';
import { CATALOGUE_TVA_MICRO as C } from '../tva-micro.js';

const REGLAGE = 'alerte.seuil_pct';
const CLES = [
  'alerte.seuil_pct',
  'micro.plafond.services',
  'micro.plafond.ventes',
  'reel_simplifie.plafond',
  'tva.exigibilite.acompte_bien',
  'tva.exigibilite.services',
  'tva.franchise.prorata_creation',
  'tva.franchise.seuil.avocats_auteurs',
  'tva.franchise.seuil.services',
  'tva.franchise.seuil.ventes',
  'tva.option_debits.effet',
  'tva.taux.intermediaire',
  'tva.taux.normal',
  'tva.taux.particulier',
  'tva.taux.reduit',
];
const val = (cle: string): unknown => JSON.parse(C.find((l) => l.cle === cle)?.valeur ?? 'null');
const dans = (o: unknown): number[] =>
  typeof o === 'number' ? [o] : o !== null && typeof o === 'object' ? Object.values(o).flatMap((v) => dans(v)) : [];

describe('tva-micro', () => {
  it('aucune-ligne-valide', () => {
    expect(C.length).toBeGreaterThan(0);
    for (const l of C) expect(['non_verifie', 'a_verifier']).toContain(l.statut);
    const st = (c: string) => C.filter((l) => l.cle === c).map((l) => l.statut);
    expect(st('micro.plafond.ventes')).toEqual(['non_verifie']);
    expect(st('tva.franchise.seuil.ventes')).toEqual(['non_verifie']);
    expect(st('reel_simplifie.plafond')).toEqual(['a_verifier']);
    expect(st('tva.taux.normal')).toEqual(['a_verifier']);
  });

  it('chaque-ligne-a-sa-source-officielle', () => {
    expect(verifierCatalogue(C.filter((l) => l.cle !== REGLAGE))).toEqual([]);
    const reglage = C.find((l) => l.cle === REGLAGE);
    expect(reglage?.source_titre).toBe('réglage du produit');
    expect(domaineOfficiel(reglage?.source_url)).toBe(false);
    for (const l of C.filter((x) => x.cle !== REGLAGE)) expect(domaineOfficiel(l.source_url)).toBe(true);
  });

  it('releve-du-06-11-2026', () => {
    for (const l of C) expect(l.date_releve).toBe('2026-11-06');
    for (const l of C) expect(l.pays).toBe('FR');
  });

  it('frontieres-sans-ecart', () => {
    expect(verifierFrontieres(C, 'FR')).toEqual([]);
  });

  it('montants-en-centimes-entiers', () => {
    expect(val('micro.plafond.ventes')).toBe(20310000);
    expect(val('micro.plafond.services')).toBe(8360000);
    expect(val('reel_simplifie.plafond')).toEqual({ ventes: 94500000, autres: 28600000 });
    expect(val('tva.franchise.seuil.ventes')).toEqual({ base: 8500000, majore: 9350000 });
    expect(val('tva.franchise.seuil.services')).toEqual({ base: 3750000, majore: 4125000 });
    expect(val('tva.franchise.seuil.avocats_auteurs')).toEqual({
      base: 5000000,
      majore: 5500000,
      base_autres: 3500000,
      majore_autres: 3850000,
    });
    expect(val('tva.taux.normal')).toBe(2000);
    expect(val('tva.taux.intermediaire')).toBe(1000);
    expect(val('tva.taux.reduit')).toBe(550);
    expect(val('tva.taux.particulier')).toBe(210);
    expect(val(REGLAGE)).toBe(9000);
    for (const l of C) for (const n of dans(JSON.parse(l.valeur))) expect(Number.isSafeInteger(n)).toBe(true);
  });

  it('exigibilite-fin-exclue', () => {
    const cles = ['tva.exigibilite.services', 'tva.exigibilite.acompte_bien'];
    for (const cle of cles) {
      expect(parametreAuJour(C, cle, 'FR', '2026-12-31').cle).toBe(cle);
      expect(() => parametreAuJour(C, cle, 'FR', '2027-01-01')).toThrow(ErreurParametre);
      try {
        parametreAuJour(C, cle, 'FR', '2027-01-01');
      } catch (e) {
        expect((e as ErreurParametre).code).toBe('parametre_absent');
      }
    }
    expect(C.find((l) => l.cle === 'tva.exigibilite.services')?.effet_fin).toBe('2027-01-01');
  });

  it('cles-attendues', () => {
    expect([...new Set(C.map((l) => l.cle))].sort()).toEqual(CLES);
    expect(C.length).toBe(CLES.length);
    expect(val('tva.option_debits.effet')).toEqual({ regle: 'premier_jour_mois_suivant' });
    expect(val('tva.franchise.prorata_creation')).toEqual({ joursAnnee: 365, finIncluse: true });
    expect(C.find((l) => l.cle === 'tva.taux.normal')?.source).toContain('date de début non donnée');
  });
});
