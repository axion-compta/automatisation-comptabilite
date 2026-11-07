// État d'une conversation dans le navigateur (fiche L05-T50) : réducteur pur, tolérant, sans React ni réseau.
import type { Carte } from '../../../../packages/contrat/src/chat/cartes.js';
import { lireEvenement, type Evenement } from '../../../../packages/contrat/src/chat/evenements.js';

export type Proposition = Omit<Extract<Evenement, { type: 'proposition' }>, 'id' | 'type'>;
export type Question = Omit<Extract<Evenement, { type: 'question' }>, 'id' | 'type'>;
export type Tour = {
  id: number;
  etapes: string[];
  segments: string[];
  cartes: Carte[];
  propositions: Proposition[];
  question?: Question;
  erreur?: string;
  issue?: string;
};
export type Message = { auteur: 'personne'; texte: string } | { auteur: 'axion'; tour: Tour };
export type EtatConversation = { messages: Message[]; tourEnCours?: Tour; dernierId: number };

export const ETAT_INITIAL: EtatConversation = { messages: [], dernierId: -1 };
export const ERREUR_TOUR_INTERROMPU = 'tour_interrompu';

const fermer = (etat: EtatConversation, tour: Tour): Message[] => [...etat.messages, { auteur: 'axion', tour }];

/** Applique un événement brut. Inconnu, invalide, doublon ou id en retard : état inchangé (même référence). */
export function reduire(etat: EtatConversation, evenementBrut: unknown): EtatConversation {
  const e = lireEvenement(evenementBrut);
  if (e === null || e.id <= etat.dernierId) return etat;
  const base = { dernierId: e.id };
  if (e.type === 'tour.debut') {
    const messages = etat.tourEnCours ? fermer(etat, { ...etat.tourEnCours, erreur: ERREUR_TOUR_INTERROMPU }) : etat.messages;
    return { ...base, messages, tourEnCours: { id: e.id, etapes: [], segments: [], cartes: [], propositions: [] } };
  }
  const t = etat.tourEnCours;
  if (t === undefined) return etat;
  switch (e.type) {
    case 'etape':
      return { ...etat, ...base, tourEnCours: { ...t, etapes: [...t.etapes, e.etape] } };
    case 'texte':
      return { ...etat, ...base, tourEnCours: { ...t, segments: [...t.segments, e.texte] } };
    case 'carte':
      return { ...etat, ...base, tourEnCours: { ...t, cartes: [...t.cartes, e.carte] } };
    case 'proposition': {
      const p: Proposition = { proposition_id: e.proposition_id, niveau: e.niveau, nombre_objets: e.nombre_objets };
      if (e.montant_total_centimes !== undefined) p.montant_total_centimes = e.montant_total_centimes;
      return { ...etat, ...base, tourEnCours: { ...t, propositions: [...t.propositions, p] } };
    }
    case 'question':
      return { ...etat, ...base, tourEnCours: { ...t, question: { choix: e.choix } } };
    case 'erreur':
      return { ...etat, ...base, tourEnCours: { ...t, erreur: e.code } };
    case 'tour.fin':
      return { messages: fermer(etat, { ...t, issue: e.issue }), ...base };
  }
}

/** Arrêt demandé : ferme le tour en gardant propositions et cartes déjà reçues. */
export function arreter(etat: EtatConversation): EtatConversation {
  if (etat.tourEnCours === undefined) return etat;
  return { messages: fermer(etat, etat.tourEnCours), dernierId: etat.dernierId };
}

export function envoyer(etat: EtatConversation, message: string): EtatConversation {
  return { ...etat, messages: [...etat.messages, { auteur: 'personne', texte: message }] };
}
