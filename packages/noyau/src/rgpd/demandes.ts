// Demandes de personnes (RGPD). Les délais viennent de réglages datés passés en argument.
// Limite : les jours ouvrés ne sautent que le week-end ; les jours fériés viendront d'un paramètre daté.
// Le motif et la source ne vont jamais dans l'événement : seulement `motifFourni`.
import { ErreurDate, ajouterJours, ajouterMois, jourDeSemaine } from '../dates/civiles.js';
import {
  ETATS_DEMANDE, ISSUES_PAR_DROIT, TYPES_DROIT, ErreurRgpd, donneesPermises, verifierDate, verifierMotif,
  type DemandePersonne, type EtatDemande, type EvenementPersonne, type Issue, type TypeDroit,
} from './types.js';

export const TRANSITIONS: Record<EtatDemande, readonly EtatDemande[]> = {
  recue: ['en_cours', 'transmise_a_la_societe'], en_cours: ['traitee', 'refusee'],
  traitee: [], refusee: [], transmise_a_la_societe: [],
};

const SAMEDI = 6;
const BORNE_BOUCLE = 3650;
const FORME_EMPREINTE = /^[0-9a-f]{64}$/;
const ISSUES_AVEC_FICHIER: readonly Issue[] = ['acces_produit', 'portabilite_produite'];
const TYPE_EVENEMENT: Partial<Record<Issue, EvenementPersonne['type']>> = {
  acces_produit: 'personne.acces_produit', portabilite_produite: 'personne.portabilite_produite',
  rectifiee: 'personne.rectification', a_effacer: 'personne.marque_a_effacer', limitee: 'personne.limitation',
  refus_conservation: 'personne.effacement_refuse', refus_gel: 'personne.effacement_refuse',
};

function entierPositif(n: number, max = Number.MAX_SAFE_INTEGER): void {
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0 || n > max) throw new ErreurRgpd('delai_invalide');
}

function calendrier<T>(f: () => T): T {
  try {
    return f();
  } catch (e) {
    if (e instanceof ErreurDate) throw new ErreurRgpd('date_invalide');
    throw e;
  }
}

export function nouvelleDemande(
  d: { id: string; societeId: string; type: TypeDroit; recueLe: string },
  p: { moisReponse: number },
): DemandePersonne {
  if (!TYPES_DROIT.includes(d.type)) throw new ErreurRgpd('type_inconnu');
  entierPositif(p.moisReponse);
  if (p.moisReponse < 1) throw new ErreurRgpd('delai_invalide');
  verifierDate(d.recueLe);
  const echeance = calendrier(() => ajouterMois(d.recueLe, p.moisReponse));
  return {
    id: d.id, societeId: d.societeId, type: d.type, recueLe: d.recueLe, echeance, etat: 'recue', traiteePar: null,
    traiteeLe: null, fichierReponseEmpreinte: null, motifRefus: null, sourceMotif: null,
  };
}

export function changerEtat(
  demande: DemandePersonne,
  vers: EtatDemande,
  o: { par: string; le: string; issue?: string; motif?: string; source?: string; fichierEmpreinte?: string },
): { demande: DemandePersonne; evenement: EvenementPersonne } {
  if (!ETATS_DEMANDE.includes(vers)) throw new ErreurRgpd('etat_inconnu');
  const permises = TRANSITIONS[demande.etat];
  if (permises.length === 0) throw new ErreurRgpd('deja_traitee');
  if (!permises.includes(vers)) throw new ErreurRgpd('transition_interdite');
  verifierDate(o.le);
  let motifRefus: string | null = null, sourceMotif: string | null = null, issue: Issue | null = null, empreinte: string | null = null;
  if (vers === 'refusee') {
    verifierMotif(o.motif as string);
    if (typeof o.source !== 'string' || o.source.trim() === '') throw new ErreurRgpd('source_manquante');
    motifRefus = (o.motif as string).trim();
    sourceMotif = o.source.trim();
  }
  if (vers === 'traitee') {
    const permisesPourType = ISSUES_PAR_DROIT[demande.type] as readonly string[];
    if (typeof o.issue !== 'string' || !permisesPourType.includes(o.issue)) throw new ErreurRgpd('issue_non_permise');
    issue = o.issue as Issue;
    if (ISSUES_AVEC_FICHIER.includes(issue)) {
      if (typeof o.fichierEmpreinte !== 'string' || !FORME_EMPREINTE.test(o.fichierEmpreinte)) throw new ErreurRgpd('empreinte_invalide');
      empreinte = o.fichierEmpreinte;
    }
  }
  const donnees = { type: demande.type, issue, motifFourni: motifRefus !== null };
  donneesPermises(donnees);
  const type = issue !== null ? TYPE_EVENEMENT[issue] : undefined;
  const evenement: EvenementPersonne = {
    type: type ?? (vers === 'refusee' ? 'personne.effacement_refuse' : 'personne.demande_recue'),
    horodatage: o.le, demandeId: demande.id, donnees,
  };
  const suite = { ...demande, etat: vers, traiteePar: o.par, traiteeLe: o.le, fichierReponseEmpreinte: empreinte, motifRefus, sourceMotif };
  return { demande: suite, evenement };
}

export function dateDeRappel(demande: DemandePersonne, joursAvant: number): string {
  entierPositif(joursAvant);
  return calendrier(() => ajouterJours(demande.echeance, 0 - joursAvant));
}
const ouverte = (d: DemandePersonne) => TRANSITIONS[d.etat].length > 0;

export function aRappeler(demandes: readonly DemandePersonne[], aujourdhui: string, joursAvant: number): string[] {
  entierPositif(joursAvant); verifierDate(aujourdhui);
  return demandes.filter((d) => ouverte(d) && dateDeRappel(d, joursAvant) <= aujourdhui && aujourdhui <= d.echeance).map((d) => d.id);
}

export function enRetard(demandes: readonly DemandePersonne[], aujourdhui: string): string[] {
  verifierDate(aujourdhui);
  return demandes.filter((d) => ouverte(d) && d.echeance < aujourdhui).map((d) => d.id);
}

export function transmettreAvantLe(recueLe: string, joursOuvres: number): string {
  entierPositif(joursOuvres, BORNE_BOUCLE); verifierDate(recueLe);
  let date = recueLe, restants = joursOuvres;
  while (restants > 0) {
    date = calendrier(() => ajouterJours(date, 1));
    if (jourDeSemaine(date) < SAMEDI) restants -= 1;
  }
  return date;
}
