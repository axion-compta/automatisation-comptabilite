// Liens entre pièces : une règle en code confirme, sinon le lien reste proposé ou rejeté.
import { ajouter, centimes, type Centimes } from '../../argent/index.js';
import { ErreurPiece, SORTES_LIEN, estDans, type SorteLien, type TypePiece } from '../types.js';

export interface PieceLiee { id: string; type: TypePiece; fournisseurId?: string | undefined; numero?: string | undefined; numerosCites: string[]; date?: string | undefined; datePaiement?: string | undefined; ttc: Centimes; }
export interface EvaluationLien { sorte: SorteLien; decision: 'confirme' | 'propose' | 'rejete'; regle: string; }

const verifier = (...pieces: PieceLiee[]): void => {
  if (!pieces.every((x) => Number.isSafeInteger(x.ttc))) throw new ErreurPiece('montant_invalide', 'Le TTC doit être un entier de centimes.');
};
const normaliser = (n: string): string => n.replace(/[\s\-/.]/g, '').toUpperCase();
const memeFournisseur = (a: PieceLiee, b: PieceLiee): boolean => a.fournisseurId !== undefined && a.fournisseurId === b.fournisseurId;
const citeLe = (a: PieceLiee, b: PieceLiee): boolean => b.numero !== undefined && normaliser(b.numero) !== '' && a.numerosCites.some((n) => normaliser(n) === normaliser(b.numero ?? ''));

function dateIso(d: string | undefined): string | null {
  if (d === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const [an, mois, jour] = d.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(an, mois - 1, jour));
  return t.getUTCFullYear() === an && t.getUTCMonth() === mois - 1 && t.getUTCDate() === jour ? d : null;
}

const res = (sorte: SorteLien, decision: EvaluationLien['decision'], regle: string): EvaluationLien => ({ sorte, decision, regle });
const types = (a: PieceLiee, ta: TypePiece[], b: PieceLiee, tb: TypePiece[]): boolean => ta.includes(a.type) && tb.includes(b.type);

export function evaluerLien(sorte: SorteLien, a: PieceLiee, b: PieceLiee): EvaluationLien {
  if (!estDans(SORTES_LIEN, sorte)) throw new ErreurPiece('sorte_invalide', 'Sorte de lien inconnue.');
  verifier(a, b);
  if (a.id === b.id) return res(sorte, 'rejete', 'meme_piece');
  switch (sorte) {
    case 'paiement_de': {
      if (!types(a, ['recu', 'ticket'], b, ['facture'])) return res(sorte, 'rejete', 'types_incompatibles');
      const paye = dateIso(a.datePaiement);
      const emise = dateIso(b.date);
      if (paye === null || emise === null) return res(sorte, 'rejete', 'date_invalide');
      if (!memeFournisseur(a, b) || a.ttc !== b.ttc) return res(sorte, 'rejete', 'fournisseur_ou_montant_different');
      return paye >= emise ? res(sorte, 'confirme', 'meme_fournisseur_meme_ttc_paiement_apres_facture') : res(sorte, 'rejete', 'paiement_avant_facture');
    }
    case 'avoir_de':
      if (!types(a, ['avoir'], b, ['facture'])) return res(sorte, 'rejete', 'types_incompatibles');
      if (citeLe(a, b)) return res(sorte, 'confirme', 'numero_cite');
      return memeFournisseur(a, b) && Math.abs(a.ttc) <= b.ttc ? res(sorte, 'propose', 'meme_fournisseur_montant_inferieur') : res(sorte, 'rejete', 'aucune_regle');
    case 'reemise_de':
      if (!types(a, ['reemise'], b, ['annulee'])) return res(sorte, 'rejete', 'types_incompatibles');
      return memeFournisseur(a, b) ? res(sorte, 'propose', 'meme_fournisseur') : res(sorte, 'rejete', 'fournisseur_different');
    case 'acompte_de':
      if (!types(a, ['facture'], b, ['facture_acompte'])) return res(sorte, 'rejete', 'types_incompatibles');
      if (citeLe(a, b)) return res(sorte, 'confirme', 'numero_cite');
      return memeFournisseur(a, b) ? res(sorte, 'propose', 'meme_fournisseur') : res(sorte, 'rejete', 'aucune_regle');
    default:
      return res(sorte, 'rejete', 'regle_hors_fiche');
  }
}

/** Les parties d'une facture globale doivent totaliser son TTC au centime ; l'ordre est sans effet. */
export function evaluerPartieDe(globale: PieceLiee, parties: PieceLiee[]): EvaluationLien {
  verifier(globale, ...parties);
  const ids = new Set([globale.id, ...parties.map((x) => x.id)]);
  if (parties.length === 0) return res('partie_de', 'rejete', 'aucune_partie');
  if (ids.size !== parties.length + 1) return res('partie_de', 'rejete', 'meme_piece');
  const total = parties.reduce((s, x) => ajouter(s, x.ttc), centimes(0));
  return total === globale.ttc ? res('partie_de', 'confirme', 'somme_exacte') : res('partie_de', 'rejete', 'somme_differente');
}
