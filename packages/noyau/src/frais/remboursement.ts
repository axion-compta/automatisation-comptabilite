// Remboursement de frais préparé (aucune émission de paiement) ou compte courant d'associé.
import { ajouter, centimes, type Centimes } from '../argent/index.js';
import type { Ecriture } from '../ecritures/modele.js';
import { ErreurFrais, type Frais } from './types.js';

export interface Personne {
  id: string;
  qualite: 'associe' | 'dirigeant_non_associe' | 'salarie';
}

export interface LigneBanque {
  id: string;
  montant: Centimes;
  date: string;
}

export interface ComptesPersonne {
  associe: string;
  nonAssocie: string;
}

export interface ComptesE3 {
  comptePersonne: string;
  banque: string;
}

function invalide(message: string): ErreurFrais {
  return new ErreurFrais('entree_invalide', message);
}

function montantValide(m: number): Centimes {
  if (!Number.isSafeInteger(m) || m <= 0) throw invalide('Montant invalide : entier de centimes strictement positif attendu.');
  return centimes(m);
}

function verifierQualite(personne: Personne): void {
  if (personne.qualite === 'salarie') throw invalide('Salarié : remboursement hors périmètre (paie).');
}

/** Prépare un remboursement : jamais plus que la somme des frais validés non remboursés choisis. */
export function preparerRemboursement(
  personne: Personne,
  frais: readonly Frais[],
  ids: readonly string[],
  montantDemande?: Centimes,
): { montant: Centimes; fraisIds: string[] } {
  verifierQualite(personne);
  if (ids.length === 0) throw invalide('Aucun frais choisi.');
  if (new Set(ids).size !== ids.length) throw invalide('Identifiant de frais en double.');
  const parId = new Map<string, Frais>();
  for (const f of frais) {
    if (parId.has(f.id)) throw invalide('Frais en double dans la liste : ' + f.id);
    parId.set(f.id, f);
  }
  let total = centimes(0);
  for (const id of ids) {
    const f = parId.get(id);
    if (!f) throw invalide('Frais inconnu : ' + id);
    if (f.personneId !== personne.id || f.payeur !== 'personne' || f.statut !== 'valide' || f.remboursementId !== undefined) {
      throw invalide('Frais non remboursable : ' + id);
    }
    total = ajouter(total, f.montantTtc);
  }
  if (montantDemande === undefined) return { montant: montantValide(total), fraisIds: [...ids] };
  const demande = montantValide(montantDemande);
  if (demande > total) throw new ErreurFrais('remboursement_superieur', 'Le montant demandé dépasse les frais validés non remboursés.');
  return { montant: demande, fraisIds: [...ids] };
}

/** Le compte courant est réservé aux associés. */
export function choisirCompteCourant(personne: Personne): void {
  if (personne.qualite !== 'associe') {
    throw new ErreurFrais('compte_courant_reserve_associes', 'Compte courant réservé aux associés.');
  }
}

/** Compte à utiliser pour la personne (numéros passés en argument). */
export function compteDeLaPersonne(personne: Personne, comptes: ComptesPersonne): string {
  verifierQualite(personne);
  return personne.qualite === 'associe' ? comptes.associe : comptes.nonAssocie;
}

/** E3 : débit compte de la personne, crédit banque ; proposée seulement si la ligne de banque égale le montant. */
export function proposerEcritureRemboursement(
  montant: Centimes,
  ligneBanque: LigneBanque,
  comptes: ComptesE3,
  ecriture: { id: string; journal: string },
): Ecriture {
  const m = montantValide(montant);
  const lb = montantValide(ligneBanque.montant);
  if (ligneBanque.date === '') throw invalide('Date de la ligne de banque manquante.');
  if (lb !== m) throw invalide('Le montant de la ligne de banque diffère du remboursement.');
  const zero = centimes(0);
  return {
    id: ecriture.id,
    journal: ecriture.journal,
    date: ligneBanque.date,
    statut: 'propose',
    lignes: [
      { compte: comptes.comptePersonne, libelle: 'Remboursement de frais', debit: m, credit: zero },
      { compte: comptes.banque, libelle: 'Remboursement de frais', debit: zero, credit: m },
    ],
  };
}
