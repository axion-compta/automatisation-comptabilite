// Ventes : état affiché d'une facture, en un mot.
// Priorité (la première règle vraie gagne) : doublon > a_relire > en_litige > proposee > payee > en_retard > payee_en_partie > a_encaisser.
import type { Centimes } from '../argent/index.js';
import { ErreurVente, comparerDates, estDans, exigerDate, STATUTS_VENTE, type EtatAffiche, type StatutVente } from './types.js';

export interface DemandeEtat {
  statutPiece: StatutVente;
  statutEcriture?: 'brouillon' | 'propose' | 'valide';
  resteDu: Centimes;
  echeance?: string;
  dateReference: string;
  enLitige: boolean;
  lettrage: 'aucun' | 'partiel' | 'total';
}

export function echeanceDepassee(echeance: string | undefined, dateReference: string): boolean {
  exigerDate(dateReference, 'dateReference');
  if (echeance === undefined) return false;
  return comparerDates(echeance, dateReference) < 0;
}

export function etatAffiche(d: DemandeEtat): EtatAffiche {
  if (!estDans(STATUTS_VENTE, d.statutPiece)) throw new ErreurVente('statut_invalide', 'Statut de pièce inconnu.');
  if (!Number.isSafeInteger(d.resteDu) || d.resteDu < 0) throw new ErreurVente('reste_du_invalide', 'Reste dû invalide.');
  const depassee = echeanceDepassee(d.echeance, d.dateReference);
  if (d.statutPiece === 'doublon') return 'doublon';
  if (d.statutPiece === 'a_verifier' || d.statutPiece === 'lue') return 'a_relire';
  if (d.enLitige) return 'en_litige';
  if (d.statutEcriture !== 'valide') return 'proposee';
  if (d.resteDu === 0) return 'payee';
  if (depassee) return 'en_retard';
  if (d.lettrage === 'partiel') return 'payee_en_partie';
  return 'a_encaisser';
}
