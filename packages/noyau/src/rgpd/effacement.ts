import type { ResultatConservation } from '../conservation/regles.js';
import { ErreurRgpd, verifierDate, type EvenementPersonne } from './types.js';

export type EntreeEffacement = {
  objet: { source: string; id: string };
  conservation: ResultatConservation | null;
  gelActif: boolean;
  finSauvegardes: string | null;
};
export type DecisionEffacement =
  | { issue: 'refus_gel' }
  | { issue: 'a_effacer'; sauvegardesJusquAu: string | null }
  | { issue: 'refus_conservation'; jusquAu: string; source: string }
  | { issue: 'refus_conservation'; jusquAu: null; source: null; aConfirmer: true };

export function deciderEffacement(entree: EntreeEffacement, aujourdhui: string): DecisionEffacement {
  verifierDate(aujourdhui);
  if (entree.finSauvegardes !== null) verifierDate(entree.finSauvegardes);
  const { conservation } = entree;
  if (conservation !== null && conservation.etat === 'date') {
    verifierDate(conservation.date);
    if (typeof conservation.regle.source !== 'string' || conservation.regle.source.trim() === '') {
      throw new ErreurRgpd('source_manquante');
    }
  }
  if (entree.gelActif) return { issue: 'refus_gel' };
  if (conservation === null) return { issue: 'a_effacer', sauvegardesJusquAu: entree.finSauvegardes };
  if (conservation.etat === 'a_confirmer') return { issue: 'refus_conservation', jusquAu: null, source: null, aConfirmer: true };
  if (conservation.date >= aujourdhui) {
    return { issue: 'refus_conservation', jusquAu: conservation.date, source: conservation.regle.source };
  }
  return { issue: 'a_effacer', sauvegardesJusquAu: entree.finSauvegardes };
}

export function evenementEffacement(decision: DecisionEffacement, demandeId: string, le: string): EvenementPersonne {
  if (typeof le !== 'string' || Number.isNaN(Date.parse(le))) throw new ErreurRgpd('horodatage_invalide');
  const type = decision.issue === 'a_effacer' ? 'personne.marque_a_effacer' : 'personne.effacement_refuse';
  return { type, horodatage: le, demandeId, donnees: { issue: decision.issue } };
}
