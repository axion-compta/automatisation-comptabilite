import { describe, expect, it } from 'vitest';
import { ErreurParametre, ParametreLegal, parametreAuJour } from '../au-jour.js';
import { REGLAGES_PIECES, reglagesPiecesAuJour } from '../reglages-pieces.js';

// Valeurs écrites en clair d'après la fiche L04-T54 (jamais recalculées avec les formules du code).
const ATTENDU: [string, string, number][] = [
  ['pieces.taille_max_octets', 'tailleMaxOctets', 26214400],
  ['pieces.pages_max_file_normale', 'pagesMaxFileNormale', 50],
  ['pieces.pages_max_modele', 'pagesMaxModele', 10],
  ['pieces.image_cote_max', 'imageCoteMax', 30000],
  ['pieces.image_pixels_max', 'imagePixelsMax', 100000000],
  ['pieces.archive_ratio_max', 'archiveRatioMax', 100],
  ['pieces.archive_total_max_octets', 'archiveTotalMaxOctets', 1073741824],
  ['pieces.archive_nombre_max', 'archiveNombreMax', 500],
  ['pieces.confiance_seuil_sur', 'confianceSeuilSur', 85],
  ['pieces.confiance_seuil_douteux', 'confianceSeuilDouteux', 50],
  ['pieces.bareme_xml', 'baremeXml', 99],
  ['pieces.bareme_accord_texte_pdf', 'baremeAccordTextePdf', 95],
  ['pieces.bareme_accord_ocr', 'baremeAccordOcr', 90],
  ['pieces.bareme_a_seul', 'baremeASeul', 80],
  ['pieces.bareme_vision_seule', 'baremeVisionSeule', 70],
  ['pieces.bareme_echec', 'baremeEchec', 40],
  ['pieces.tolerance_par_taux', 'toleranceParTaux', 1],
  ['pieces.tolerance_piece_max', 'tolerancePieceMax', 5],
  ['pieces.tolerance_par_ligne', 'toleranceParLigne', 1],
  ['pieces.tolerance_lignes_max', 'toleranceLignesMax', 5],
  ['pieces.nom_longueur_max', 'nomLongueurMax', 180],
  ['pieces.image_distance_max', 'imageDistanceMax', 6],
];
const CLES = ATTENDU.map(([cle]) => cle);
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
    for (const [cle, , v] of ATTENDU) expect(parametreAuJour(REGLAGES_PIECES, cle, 'FR', JOUR).valeur, cle).toBe(String(v));
    for (const p of REGLAGES_PIECES) expect(ParametreLegal.safeParse(p).success).toBe(true);
    const r: Record<string, number> = { ...reglagesPiecesAuJour(JOUR) };
    expect(Object.keys(r)).toHaveLength(ATTENDU.length);
    for (const [, champ, v] of ATTENDU) expect(r[champ], champ).toBe(v);
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
