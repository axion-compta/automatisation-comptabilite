// Qui a payé ? Règles dans l'ordre, la première qui s'applique gagne. Seulement des codes, aucun texte affiché.
// L'IA seule ne fixe jamais le payeur : sa proposition ne sert qu'à ordonner la question. La fenêtre de jours est un argument.
import { lignesCorrespondantes, type LigneBanqueSociete, type TicketARapprocher } from './correspondance-banque.js';
import { ErreurFrais, type Payeur, type SourcePayeur, type StatutFrais } from './types.js';

export interface EntreePayeur {
  ticket: TicketARapprocher & { quatreChiffres?: string };
  declaration?: 'personne' | 'societe';
  proposeParIa?: Payeur;
  lignes: LigneBanqueSociete[];
  cartesSociete: readonly string[];
  releveImporte: boolean;
  fenetreJours: number;
}

export interface ResultatPayeur {
  payeur: Payeur;
  source?: SourcePayeur;
  statut: StatutFrais;
  regle: 1 | 2 | 3 | 4;
  conflit: boolean;
  ligneBanqueId?: string;
  question?: 'qui_a_paye';
  suggestion?: 'personne' | 'societe';
  attente?: 'releve_manquant';
}

const QUATRE_CHIFFRES = /^\d{4}$/;

function refuser(message: string): never {
  throw new ErreurFrais('entree_invalide', message);
}

export function determinerPayeur(e: EntreePayeur): ResultatPayeur {
  if (!Array.isArray(e.cartesSociete)) refuser('Liste de cartes attendue');
  if (typeof e.releveImporte !== 'boolean') refuser('Indicateur de relevé importé attendu');
  const trouvees = lignesCorrespondantes(e.ticket, e.lignes, e.fenetreJours); // valide aussi la fenêtre, le montant et les dates
  const { declaration, releveImporte } = e;
  const attente = releveImporte ? {} : { attente: 'releve_manquant' as const };
  const premiere = trouvees[0];
  if (premiere !== undefined) {
    return { payeur: 'societe', source: 'banque', statut: 'exclu_paye_societe', regle: 1, conflit: declaration === 'personne', ligneBanqueId: premiere.id };
  }
  const chiffres = e.ticket.quatreChiffres;
  if (!releveImporte && chiffres !== undefined && QUATRE_CHIFFRES.test(chiffres) && e.cartesSociete.includes(chiffres)) {
    return { payeur: 'societe', statut: 'a_completer', regle: 2, conflit: false, ...attente };
  }
  if (declaration === 'societe') return { payeur: 'societe', source: 'declaration', statut: 'a_completer', regle: 3, conflit: false, ...attente };
  if (declaration === 'personne' && releveImporte) return { payeur: 'personne', source: 'declaration', statut: 'propose', regle: 3, conflit: false };
  const sortie: ResultatPayeur = { payeur: 'a_confirmer', statut: 'a_completer', regle: 4, conflit: false };
  if (declaration === 'personne') return { ...sortie, ...attente };
  if (e.proposeParIa === 'personne' || e.proposeParIa === 'societe') sortie.suggestion = e.proposeParIa;
  return { ...sortie, question: 'qui_a_paye' };
}
