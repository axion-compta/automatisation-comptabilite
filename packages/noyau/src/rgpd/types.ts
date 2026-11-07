export const TYPES_DROIT = ['acces', 'rectification', 'effacement', 'limitation', 'portabilite', 'opposition'] as const;
export type TypeDroit = (typeof TYPES_DROIT)[number];

export const ETATS_DEMANDE = ['recue', 'en_cours', 'traitee', 'refusee', 'transmise_a_la_societe'] as const;
export type EtatDemande = (typeof ETATS_DEMANDE)[number];

export const ISSUES = [
  'acces_produit', 'portabilite_produite', 'rectifiee', 'a_effacer', 'limitee', 'refus_conservation', 'refus_gel',
  'renvoi_societe',
] as const;
export type Issue = (typeof ISSUES)[number];

export const ISSUES_PAR_DROIT: Record<TypeDroit, readonly Issue[]> = {
  acces: ['acces_produit', 'renvoi_societe'],
  rectification: ['rectifiee', 'renvoi_societe'],
  effacement: ['a_effacer', 'refus_conservation', 'refus_gel', 'renvoi_societe'],
  limitation: ['limitee', 'renvoi_societe'],
  portabilite: ['portabilite_produite', 'renvoi_societe'],
  opposition: ['limitee', 'renvoi_societe'],
};

export const MARQUES = ['a_effacer', 'limitee', 'oubliee'] as const;
export type Marque = (typeof MARQUES)[number];

export type DemandePersonne = {
  id: string; societeId: string; type: TypeDroit; recueLe: string; echeance: string; etat: EtatDemande;
  traiteePar: string | null; traiteeLe: string | null; fichierReponseEmpreinte: string | null;
  motifRefus: string | null; sourceMotif: string | null;
};

export type CodeErreurRgpd =
  | 'date_invalide' | 'horodatage_invalide' | 'entier_invalide' | 'type_inconnu' | 'etat_inconnu'
  | 'transition_interdite' | 'issue_non_permise' | 'motif_manquant' | 'source_manquante' | 'deja_traitee'
  | 'recherche_vide' | 'recherche_trop_courte' | 'marque_inconnue' | 'objet_inconnu' | 'gel_actif'
  | 'colonne_manquante' | 'valeur_interdite' | 'delai_invalide' | 'ordre_invalide' | 'doublon' | 'contrat_absent'
  | 'conservation_chez_fournisseur' | 'empreinte_invalide';

export class ErreurRgpd extends Error {
  override name = 'ErreurRgpd';
  readonly code: CodeErreurRgpd;
  constructor(code: CodeErreurRgpd) {
    super(code);
    this.code = code;
  }
}

export const TYPES_EVENEMENT_PERSONNE = [
  'personne.demande_recue', 'personne.acces_produit', 'personne.portabilite_produite', 'personne.rectification',
  'personne.effacement_refuse', 'personne.marque_a_effacer', 'personne.limitation', 'personne.preference_oubliee',
  'personne.autres_personnes_incluses', 'personne.effacements_rejoues',
] as const;

export type EvenementPersonne = {
  type: (typeof TYPES_EVENEMENT_PERSONNE)[number];
  horodatage: string;
  demandeId: string | null;
  donnees: Readonly<Record<string, string | number | boolean | null>>;
};

const MOTIF_MAX = 500;
const MOTS_INTERDITS = ['texte', 'nom', 'email', 'iban', 'montant', 'contenu'];

export function verifierDate(d: string): void {
  const m = typeof d === 'string' ? /^([0-9]{4}-[0-9]{2}-[0-9]{2})$/.exec(d) : null;
  const ms = m === null ? NaN : Date.parse(`${d}T00:00:00Z`);
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== d) throw new ErreurRgpd('date_invalide');
}

export function verifierMotif(m: string): void {
  const n = typeof m === 'string' ? m.trim().length : 0;
  if (n < 1 || n > MOTIF_MAX) throw new ErreurRgpd('motif_manquant');
}

function mots(cle: string): string[] {
  return cle.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/);
}

export function donneesPermises(d: Readonly<Record<string, unknown>>): void {
  for (const cle of Object.keys(d)) {
    if (mots(cle).some((mot) => MOTS_INTERDITS.includes(mot))) throw new ErreurRgpd('valeur_interdite');
  }
}
