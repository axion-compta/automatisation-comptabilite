// Réglages produit du lot 04 (lecture des pièces) : valeurs PROPOSÉES par la spec 04, pas des valeurs légales.
// Rangés comme les paramètres datés (L01-T14) pour changer sans toucher au code. Statut a_verifier partout.
// Le plafond de coût d'IA (ia.plafond_piece) n'est volontairement PAS ici : sa valeur revient à Will.
import { ErreurParametre, parametreAuJour, type CodeErreurParametre, type ParametreLegal } from './au-jour.js';

const SOURCE = 'spec 04 lecture des pièces, valeur proposée';
const DATE_SPEC = '2026-11-05';
const MO = 1024 * 1024;

const VALEURS = {
  tailleMaxOctets: ['pieces.taille_max_octets', 25 * MO],
  pagesMaxFileNormale: ['pieces.pages_max_file_normale', 50],
  pagesMaxModele: ['pieces.pages_max_modele', 10],
  imageCoteMax: ['pieces.image_cote_max', 30000],
  imagePixelsMax: ['pieces.image_pixels_max', 100000000],
  archiveRatioMax: ['pieces.archive_ratio_max', 100],
  archiveTotalMaxOctets: ['pieces.archive_total_max_octets', 1024 * MO],
  archiveNombreMax: ['pieces.archive_nombre_max', 500],
  confianceSeuilSur: ['pieces.confiance_seuil_sur', 85],
  confianceSeuilDouteux: ['pieces.confiance_seuil_douteux', 50],
  baremeXml: ['pieces.bareme_xml', 99],
  baremeAccordTextePdf: ['pieces.bareme_accord_texte_pdf', 95],
  baremeAccordOcr: ['pieces.bareme_accord_ocr', 90],
  baremeASeul: ['pieces.bareme_a_seul', 80],
  baremeVisionSeule: ['pieces.bareme_vision_seule', 70],
  baremeEchec: ['pieces.bareme_echec', 40],
  toleranceParTaux: ['pieces.tolerance_par_taux', 1],
  tolerancePieceMax: ['pieces.tolerance_piece_max', 5],
  toleranceParLigne: ['pieces.tolerance_par_ligne', 1],
  toleranceLignesMax: ['pieces.tolerance_lignes_max', 5],
  nomLongueurMax: ['pieces.nom_longueur_max', 180],
  imageDistanceMax: ['pieces.image_distance_max', 6],
} as const;

export type ReglagesPieces = { -readonly [K in keyof typeof VALEURS]: number };

export const REGLAGES_PIECES: ParametreLegal[] = Object.values(VALEURS).map(([cle, valeur]) => ({
  cle,
  pays: 'FR',
  valeur: String(valeur),
  effet_debut: DATE_SPEC,
  effet_fin: null,
  statut: 'a_verifier',
  source: SOURCE,
  date_releve: DATE_SPEC,
}));

function entier(texte: string, cle: string): number {
  const n = /^\d+$/.test(texte) ? Number(texte) : Number.NaN;
  // `au-jour.ts` ne déclare pas ce code : on le passe tel que la fiche le demande.
  if (!Number.isSafeInteger(n)) throw new ErreurParametre('parametre_invalide' as CodeErreurParametre, `${cle} « ${texte} »`);
  return n;
}

/** Réglages en vigueur à `date` (AAAA-MM-JJ). Ligne absente : parametre_absent ; valeur non entière : parametre_invalide. */
export function reglagesPiecesAuJour(date: string, liste: readonly ParametreLegal[] = REGLAGES_PIECES): ReglagesPieces {
  const resultat: Record<string, number> = {};
  for (const [nom, [cle]] of Object.entries(VALEURS)) {
    resultat[nom] = entier(parametreAuJour(liste, cle, 'FR', date).valeur, cle);
  }
  return resultat as ReglagesPieces;
}
