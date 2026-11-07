// Frais : invariants purs, appelés par le contrat avant toute écriture.
import type { Centimes } from '../argent/index.js';
import { ErreurFrais, type Frais, type StatutFrais } from './types.js';

export type CodeViolation = 'inv1_paye_societe_rembourse' | 'inv2_payeur_suppose_avance' | 'inv5_montant_sur_bareme_a_verifier';

export interface ContexteInvariants {
  baremeAVerifier?: boolean;
  montantTrajet?: Centimes | null;
}

const AU_DELA_A_COMPLETER: readonly StatutFrais[] = ['propose', 'valide', 'rembourse', 'en_compte_courant'];

const present = (v: unknown): boolean => v !== undefined && v !== null;
const piece = (f: Frais): string | null => (typeof f.pieceId === 'string' && f.pieceId !== '' ? f.pieceId : null);
const ordre = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function violations(frais: Frais, contexte: ContexteInvariants = {}): CodeViolation[] {
  const montant = contexte.montantTrajet;
  if (present(montant) && !Number.isSafeInteger(montant)) {
    throw new ErreurFrais('entree_invalide', 'Montant de trajet invalide.');
  }
  const v: CodeViolation[] = [];
  if (frais.payeur === 'societe' && (frais.statut === 'rembourse' || present(frais.remboursementId) || present(frais.destination))) {
    v.push('inv1_paye_societe_rembourse');
  }
  if (frais.payeur === 'a_confirmer' && AU_DELA_A_COMPLETER.includes(frais.statut)) {
    v.push('inv2_payeur_suppose_avance');
  }
  if (contexte.baremeAVerifier === true && present(montant) && montant !== 0) {
    v.push('inv5_montant_sur_bareme_a_verifier');
  }
  return v;
}

export function doublonsDePiece(frais: readonly Frais[]): { pieceId: string; fraisIds: string[] }[] {
  const groupes = new Map<string, string[]>();
  for (const f of frais) {
    const p = piece(f);
    if (p === null || f.statut === 'refuse') continue;
    groupes.set(p, [...(groupes.get(p) ?? []), f.id]);
  }
  return [...groupes.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([pieceId, ids]) => ({ pieceId, fraisIds: [...ids].sort(ordre) }))
    .sort((a, b) => ordre(a.pieceId, b.pieceId));
}

export function refuserDoublon(existants: readonly Frais[], nouveau: Frais): void {
  const p = piece(nouveau);
  if (p === null) return;
  if (existants.some((f) => f.id !== nouveau.id && f.statut !== 'refuse' && piece(f) === p)) {
    throw new ErreurFrais('doublon_piece', 'Cette pièce est déjà rattachée à un autre frais.');
  }
}

export function verifierInvariants(frais: Frais, contexte: ContexteInvariants = {}): void {
  const [premiere] = violations(frais, contexte);
  if (premiere !== undefined) throw new ErreurFrais('entree_invalide', `Invariant violé : ${premiere}.`);
}
