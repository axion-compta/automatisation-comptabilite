// Refus fixes du chat, avec alternative. Les drapeaux sont posés par l'appelant.
import type { MotifRefus, Niveau } from './types.js';

export type Alternative = 'contre_passation' | 'periode_ouverte' | 'ouvrir_ecran' | 'outil_facturation' | 'aucune';
export interface DemandeRefus {
  readonly outil: string;
  readonly niveau: Niveau;
  readonly cibleValidee?: boolean;
  readonly periodeCloturee?: boolean;
  readonly suppressionDefinitive?: boolean;
  readonly creeFacture?: boolean;
  readonly demandeConsignes?: boolean;
  readonly autreSociete?: boolean;
  readonly niveauIOuvert: boolean;
}
export interface Refus {
  readonly motif: MotifRefus;
  readonly alternative: Alternative;
}

/**
 * Priorité fixe, le premier motif trouvé gagne :
 * 1 autre société, 2 consignes, 3 suppression définitive, 4 facture,
 * 5 écriture validée, 6 période clôturée, 7 niveau I fermé.
 */
export function refusFixe(d: DemandeRefus): Refus | null {
  if (d.autreSociete === true) return { motif: 'autre_societe', alternative: 'aucune' };
  if (d.demandeConsignes === true) return { motif: 'consignes_confidentielles', alternative: 'aucune' };
  if (d.suppressionDefinitive === true) return { motif: 'suppression_definitive', alternative: 'aucune' };
  if (d.creeFacture === true) return { motif: 'facture_hors_produit', alternative: 'outil_facturation' };
  if (d.cibleValidee === true) return { motif: 'ecriture_validee', alternative: 'contre_passation' };
  if (d.periodeCloturee === true) return { motif: 'periode_cloturee', alternative: 'periode_ouverte' };
  if (d.niveau === 'I' && !d.niveauIOuvert) {
    return { motif: 'geste_irreversible_requis', alternative: 'ouvrir_ecran' };
  }
  return null;
}
