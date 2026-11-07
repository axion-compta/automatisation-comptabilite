// TVA sous réserve : jamais déduite, interrupteur verrouillé, passage par une personne seulement.
// Aucun paramètre ne peut faire passer « inclure le sous réserve » à vrai.
import { type Centimes, ajouter, centimes } from '../argent/index.js';

export type CodeErreurSousReserve = 'ia_non_autorisee' | 'transition_interdite' | 'motif_vide' | 'montant_invalide';

export class ErreurSousReserve extends Error {
  override name = 'ErreurSousReserve';
  readonly code: CodeErreurSousReserve;
  constructor(code: CodeErreurSousReserve, message: string) {
    super(message);
    this.code = code;
  }
}

export type Certitude = 'solide' | 'sous_reserve' | 'perdue' | 'en_doute';

export interface LigneTvaAchat {
  id: string;
  pieceId: string;
  tvaCentimes: number;
  certitude: Certitude;
}

export interface TroisMontants {
  solide: Centimes;
  sousReserve: Centimes;
  perdue: Centimes;
  enDoute: Centimes;
  totalLu: Centimes;
}

function montant(l: LigneTvaAchat): Centimes {
  if (!Number.isSafeInteger(l.tvaCentimes)) {
    throw new ErreurSousReserve('montant_invalide', 'Montant de TVA invalide sur la ligne ' + l.id);
  }
  return centimes(l.tvaCentimes);
}

/** Les quatre montants sont toujours rendus, même à 0. */
export function troisMontants(lignes: readonly LigneTvaAchat[]): TroisMontants {
  const m = { solide: centimes(0), sousReserve: centimes(0), perdue: centimes(0), enDoute: centimes(0) };
  const cle = { solide: 'solide', sous_reserve: 'sousReserve', perdue: 'perdue', en_doute: 'enDoute' } as const;
  for (const l of lignes) m[cle[l.certitude]] = ajouter(m[cle[l.certitude]], montant(l));
  const totalLu = ajouter(ajouter(m.solide, m.sousReserve), ajouter(m.perdue, m.enDoute));
  return { ...m, totalLu };
}

export type DeductionPreparee = { etat: 'bloquee'; piecesEnDoute: number } | { etat: 'preparee'; centimes: Centimes };

/** Somme des lignes solides seulement ; une pièce en doute bloque, sans montant. */
export function deductionPreparee(lignes: readonly LigneTvaAchat[]): DeductionPreparee {
  const piecesEnDoute = new Set(lignes.filter((l) => l.certitude === 'en_doute').map((l) => l.pieceId));
  if (piecesEnDoute.size > 0) return { etat: 'bloquee', piecesEnDoute: piecesEnDoute.size };
  return { etat: 'preparee', centimes: troisMontants(lignes).solide };
}

export interface RefusInterrupteur {
  accepte: false;
  code: 'interrupteur_verrouille';
  journal: { type: 'refus_reglage'; par: string; reglage: 'tva.inclure_sous_reserve' };
}

/** Quel que soit le demandeur et son rôle : refus et une ligne de journal. */
export function demanderInclureSousReserve(demandeur: { id: string; role: string }): RefusInterrupteur {
  return {
    accepte: false,
    code: 'interrupteur_verrouille',
    journal: { type: 'refus_reglage', par: demandeur.id, reglage: 'tva.inclure_sous_reserve' },
  };
}

export interface DemandePassage {
  acteur: { type: 'personne' | 'ia'; id: string };
  motif: string;
  pieceId: string;
  le: string;
}

export interface TracePassage {
  acteurId: string;
  le: string;
  motif: string;
  pieceId: string;
}

/** Seule une personne passe une ligne de « en doute » à « sous réserve » ; elle reste non déductible. */
export function passerEnSousReserve(
  ligne: LigneTvaAchat,
  demande: DemandePassage,
): { ligne: LigneTvaAchat; trace: TracePassage } {
  if (demande.acteur.type !== 'personne') {
    throw new ErreurSousReserve('ia_non_autorisee', 'Seule une personne peut passer une ligne en sous réserve');
  }
  if (ligne.certitude !== 'en_doute') {
    throw new ErreurSousReserve('transition_interdite', 'Seule une ligne en doute peut passer en sous réserve');
  }
  if (demande.motif.trim() === '') {
    throw new ErreurSousReserve('motif_vide', 'Le motif est obligatoire');
  }
  return {
    ligne: { ...ligne, certitude: 'sous_reserve' },
    trace: { acteurId: demande.acteur.id, le: demande.le, motif: demande.motif, pieceId: demande.pieceId },
  };
}
