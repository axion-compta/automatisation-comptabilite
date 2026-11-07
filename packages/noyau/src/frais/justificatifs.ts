// Frais : justificatif exigé, justificatif perdu avec motif. Codes seulement, aucun texte affiché.
import { ErreurFrais, type Frais, type Trajet, type Vehicule } from './types.js';

export type CodeManquant = 'justificatif' | 'motif_perte' | 'motif_trajet' | 'depart_arrivee' | 'vehicule' | 'carte_grise' | 'montant_illisible' | 'date_illisible';

export interface ContexteJustificatifs {
  trajet?: Trajet;
  vehicule?: Vehicule;
  /** `true` : date et montant incertains ; sinon le détail champ par champ. */
  lectureIncertaine?: boolean | { date?: boolean; montant?: boolean };
}

export type ResultatValidation =
  | { ok: true; tvaForceeAZero: boolean; motifEcriture?: string }
  | { ok: false; code: 'justificatif_manquant' | 'motif_obligatoire' };

const LONGUEUR_MAX_MOTIF = 200;

const vide = (t: string | undefined): boolean => t === undefined || t.trim() === '';

function exiger(frais: Frais): void {
  if (frais?.nature !== 'depense' && frais?.nature !== 'trajet') {
    throw new ErreurFrais('entree_invalide', 'Frais invalide.');
  }
}

const sansPiece = (frais: Frais): boolean => frais.nature === 'depense' && vide(frais.pieceId);
const perdu = (frais: Frais): boolean => sansPiece(frais) && frais.justificatifPerdu;

function motifPerte(frais: Frais): string {
  const motif = (frais.motifSansJustificatif ?? '').trim();
  if (motif.length > LONGUEUR_MAX_MOTIF) throw new ErreurFrais('entree_invalide', 'Motif trop long.');
  return motif;
}

export function manquants(frais: Frais, contexte: ContexteJustificatifs = {}): CodeManquant[] {
  exiger(frais);
  const m: CodeManquant[] = [];
  if (perdu(frais)) {
    if (motifPerte(frais) === '') m.push('motif_perte');
  } else if (sansPiece(frais)) {
    m.push('justificatif');
  }
  if (frais.nature === 'trajet') {
    const { trajet, vehicule } = contexte;
    if (trajet !== undefined && !(Number.isSafeInteger(trajet.kmSaisisDixiemes) && trajet.kmSaisisDixiemes > 0)) {
      throw new ErreurFrais('entree_invalide', 'Kilomètres invalides.');
    }
    if (trajet === undefined || vide(trajet.motif)) m.push('motif_trajet');
    if (trajet === undefined || vide(trajet.depart) || vide(trajet.arrivee)) m.push('depart_arrivee');
    if (vehicule === undefined || (trajet !== undefined && trajet.vehiculeId !== vehicule.id)) m.push('vehicule');
    else if (vide(vehicule.carteGrisePieceId)) m.push('carte_grise');
  }
  const l = contexte.lectureIncertaine;
  if (l === true || (typeof l === 'object' && l.montant === true)) m.push('montant_illisible');
  if (l === true || (typeof l === 'object' && l.date === true)) m.push('date_illisible');
  return m;
}

export function peutEtreValide(frais: Frais, contexte: ContexteJustificatifs, droits: { roleHabilite: boolean }): ResultatValidation {
  const m = manquants(frais, contexte);
  if (perdu(frais) && !droits.roleHabilite) return { ok: false, code: 'justificatif_manquant' };
  if (m.includes('motif_perte') || m.includes('motif_trajet')) return { ok: false, code: 'motif_obligatoire' };
  if (m.length > 0) return { ok: false, code: 'justificatif_manquant' };
  if (perdu(frais)) return { ok: true, tvaForceeAZero: true, motifEcriture: motifPerte(frais) };
  return { ok: true, tvaForceeAZero: false };
}
