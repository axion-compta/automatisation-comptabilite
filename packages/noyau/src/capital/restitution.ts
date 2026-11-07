// Capital : restitution décidée (jamais un produit) et virement à un associé sans décision (compte courant, G07).
// Les numéros de compte arrivent en argument ; une écriture produite reste toujours au statut brouillon.
import { ajouter, centimes, type Centimes } from '../argent/index.js';
import type { Ecriture } from '../ecritures/modele.js';

export class ErreurCapital extends Error {
  override name = 'ErreurCapital';
  readonly code: 'montant_invalide';
  constructor(code: 'montant_invalide', message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export interface VersementAssocie {
  id: string;
  date: string;
  journal: string;
  montant: Centimes;
  decisionId?: string;
  /** Convention débit moins crédit : négatif = compte courant créditeur. */
  soldeCourantAvant: Centimes;
}

export interface ComptesVersement {
  capitalAppeleVerse: string;
  banque: string;
  courantAssocie: string;
}

export interface QualificationVersement {
  nature: 'restitution' | 'compte_courant';
  ecriture: Ecriture;
  soldeCourantApres?: Centimes;
  gesteRequis?: 'G07';
}

function ecriture(v: VersementAssocie, debit: string, credit: string, libelle: string): Ecriture {
  return {
    id: v.id,
    journal: v.journal,
    date: v.date,
    statut: 'brouillon',
    lignes: [
      { compte: debit, libelle, debit: v.montant, credit: centimes(0) },
      { compte: credit, libelle, debit: centimes(0), credit: v.montant },
    ],
  };
}

/** Avec décision : restitution de capital (aucun produit). Sans décision : compte courant d'associé, G07 si débiteur. */
export function qualifierVersementAssocie(v: VersementAssocie, comptes: ComptesVersement): QualificationVersement {
  if (!Number.isSafeInteger(v.montant) || v.montant <= 0) {
    throw new ErreurCapital('montant_invalide', 'Le montant doit être un entier de centimes strictement positif.');
  }
  if (v.decisionId !== undefined && v.decisionId.trim() !== '') {
    return {
      nature: 'restitution',
      ecriture: ecriture(v, comptes.capitalAppeleVerse, comptes.banque, 'Restitution de capital décidée'),
    };
  }
  const soldeCourantApres = ajouter(v.soldeCourantAvant, v.montant);
  return {
    nature: 'compte_courant',
    ecriture: ecriture(v, comptes.courantAssocie, comptes.banque, 'Virement à un associé sans décision'),
    soldeCourantApres,
    ...(soldeCourantApres > 0 ? { gesteRequis: 'G07' as const } : {}),
  };
}
