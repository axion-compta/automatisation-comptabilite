import { describe, expect, it } from 'vitest';
import { ErreurParametre, ParametreLegal, parametreAuJour } from '../au-jour.js';
import { REGLAGES_PIECES, reglagesPiecesAuJour } from '../reglages-pieces.js';

const CLES = [
  'pieces.taille_max_octets',
  'pieces.pages_max_file_normale',
  'pieces.pages_max_modele',
  'pieces.image_cote_max',
  'pieces.image_pixels_max',
  'pieces.archive_ratio_max',
  'pieces.archive_total_max_octets',
  'pieces.archive_nombre_max',
  'pieces.confiance_seuil_sur',
  'pieces.confiance_seuil_douteux',
  'pieces.bareme_xml',
  'pieces.bareme_accord_texte_pdf',
  'pieces.bareme_accord_ocr',
  'pieces.bareme_a_seul',
  'pieces.bareme_vision_seule',
  'pieces.bareme_echec',
  'pieces.tolerance_par_taux',
  'pieces.tolerance_piece_max',
  'pieces.tolerance_par_ligne',
  'pieces.tolerance_lignes_max',
  'pieces.nom_longueur_max',
  'pieces.image_distance_max',
];
const JOUR = '2026-11-05';

function codeErreur(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurParametre ? e.code : 'autre';
  }
  return undefined;
}

function avecValeur(cle: string, valeur: string): ParametreLegal[] {
  return REGLAGES_PIECES.map((p) => (p.cle === cle ? { ...p, valeur } : p));
}

describe('réglages des pièces', () => {
  it('toutes-les-cles-presentes', () => {
    expect(REGLAGES_PIECES.map((p) => p.cle).sort()).toEqual([...CLES].sort());
    for (const cle of CLES) expect(parametreAuJour(REGLAGES_PIECES, cle, 'FR', JOUR).cle).toBe(cle);
    for (const p of REGLAGES_PIECES) expect(ParametreLegal.safeParse(p).success).toBe(true);
    const r = reglagesPiecesAuJour(JOUR);
    expect(Object.keys(r)).toHaveLength(CLES.length);
    expect(r.tailleMaxOctets).toBe(25 * 1024 * 1024);
    expect(r.confianceSeuilSur).toBe(85);
    expect(r.baremeEchec).toBe(40);
    expect(r.imageDistanceMax).toBe(6);
  });

  it('valeurs-entieres', () => {
    for (const v of Object.values(reglagesPiecesAuJour(JOUR))) expect(Number.isSafeInteger(v)).toBe(true);
    for (const mauvaise of ['1.5', 'NaN', 'Infinity', '-Infinity', '', ' ', '1e3', '0x10', ' 5', '5 ', '-1', 'abc', '9007199254740993']) {
      expect(codeErreur(() => reglagesPiecesAuJour(JOUR, avecValeur('pieces.nom_longueur_max', mauvaise))), mauvaise).toBe('parametre_invalide');
    }
    expect(reglagesPiecesAuJour(JOUR, avecValeur('pieces.nom_longueur_max', '7')).nomLongueurMax).toBe(7);
  });

  it('statut-a-verifier-partout', () => {
    expect(REGLAGES_PIECES.length).toBeGreaterThan(0);
    for (const p of REGLAGES_PIECES) {
      expect(p.statut).toBe('a_verifier');
      expect(p.pays).toBe('FR');
      expect(p.effet_fin).toBeNull();
      expect(p.effet_debut).toBe(JOUR);
    }
  });

  it('source-non-vide-partout', () => {
    for (const p of REGLAGES_PIECES) {
      expect(p.source.trim().length).toBeGreaterThan(0);
      expect(p.source).toContain('spec 04');
    }
  });

  it('avant-effet-parametre-absent', () => {
    expect(codeErreur(() => reglagesPiecesAuJour('2026-11-04'))).toBe('parametre_absent');
    expect(codeErreur(() => reglagesPiecesAuJour('2020-01-01'))).toBe('parametre_absent');
    expect(codeErreur(() => reglagesPiecesAuJour(JOUR))).toBeUndefined();
    expect(codeErreur(() => reglagesPiecesAuJour('2030-01-01'))).toBeUndefined();
  });

  it('plafond-ia-absent', () => {
    expect(REGLAGES_PIECES.some((p) => p.cle.startsWith('ia.'))).toBe(false);
    expect(codeErreur(() => parametreAuJour(REGLAGES_PIECES, 'ia.plafond_piece', 'FR', JOUR))).toBe('parametre_absent');
    expect(Object.keys(reglagesPiecesAuJour(JOUR)).some((k) => k.toLowerCase().includes('plafond'))).toBe(false);
  });
});
