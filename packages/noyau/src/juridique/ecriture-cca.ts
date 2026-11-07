// Écriture BROUILLON des intérêts de compte courant d'associé, avec retenue par associé (JUR-017).
// Aucun numéro de compte ni taux ici : tout arrive en argument. Sans convention archivée : blocage, aucune écriture.
import { centimes, pourcentage, soustraire, type Arrondi, type Centimes } from '../argent/index.js';
import { verifierEcriture, type Ecriture, type LigneEcriture } from '../ecritures/modele.js';

export type CodeErreurEcritureCca = 'interets_nuls' | 'interets_invalides' | 'taux_invalide' | 'comptes_identiques';

export class ErreurEcritureCca extends Error {
  override name = 'ErreurEcritureCca';
  readonly code: CodeErreurEcritureCca;
  constructor(code: CodeErreurEcritureCca, detail = '') {
    super(detail === '' ? code : `${code} : ${detail}`);
    this.code = code;
  }
}

export interface Convention {
  id: string;
  type: 'compte_courant_remunere' | 'autre';
  statut: 'declaree' | 'traitee' | 'archivee';
}

export type StatutAssocie = 'personne_physique' | 'personne_physique_dispensee' | 'personne_morale' | 'inconnu';

export interface DemandeEcritureCca {
  convention: Convention | null;
  interets: Centimes;
  statutAssocie: StatutAssocie;
  date: string;
  journal: string;
  id: string;
}

export interface ParametresEcritureCca {
  retenueParStatut: Partial<Record<StatutAssocie, number>>;
  comptes: { interets: string; retenue: string; compteCourant: string };
  arrondi: Arrondi;
}

export type ResultatEcritureCca =
  | { etat: 'bloque'; carte: 'deposer_convention' }
  | { etat: 'brouillon'; ecriture: Ecriture; retenue: Centimes; net: Centimes; cartes: readonly 'retenue_a_verifier'[] };

const BORNE_BASE = 10_000;
const SANS_RETENUE: readonly StatutAssocie[] = ['personne_morale', 'inconnu'];

function tauxRetenue(p: ParametresEcritureCca, statut: StatutAssocie): number | undefined {
  if (SANS_RETENUE.includes(statut)) return undefined;
  const valeur = p.retenueParStatut[statut];
  if (valeur === undefined) return undefined;
  if (!Number.isSafeInteger(valeur) || valeur < 0 || valeur > BORNE_BASE) throw new ErreurEcritureCca('taux_invalide', String(valeur));
  return valeur;
}

export function proposerEcritureCca(demande: DemandeEcritureCca, parametres: ParametresEcritureCca): ResultatEcritureCca {
  const { interets, statutAssocie } = demande;
  const { comptes } = parametres;
  if (new Set([comptes.interets, comptes.retenue, comptes.compteCourant]).size !== 3) throw new ErreurEcritureCca('comptes_identiques');
  if (!Number.isSafeInteger(interets) || interets < 0) throw new ErreurEcritureCca('interets_invalides', String(interets));
  if (interets === 0) throw new ErreurEcritureCca('interets_nuls');
  const taux = tauxRetenue(parametres, statutAssocie);
  const { convention } = demande;
  if (convention === null || convention.type !== 'compte_courant_remunere' || convention.statut !== 'archivee') {
    return { etat: 'bloque', carte: 'deposer_convention' };
  }
  const retenue = taux === undefined ? centimes(0) : pourcentage(interets, taux, parametres.arrondi);
  const net = soustraire(interets, retenue);
  const ligne = (compte: string, libelle: string, debit: number, credit: number): LigneEcriture => ({ compte, libelle, debit: centimes(debit), credit: centimes(credit) });
  const lignes = [
    ligne(comptes.interets, 'interets_cca', interets, 0),
    ...(retenue > 0 ? [ligne(comptes.retenue, 'retenue_cca', 0, retenue)] : []),
    ...(net > 0 ? [ligne(comptes.compteCourant, 'net_cca', 0, net)] : []),
  ];
  const ecriture: Ecriture = { id: demande.id, journal: demande.journal, date: demande.date, statut: 'brouillon', lignes };
  verifierEcriture(ecriture);
  return { etat: 'brouillon', ecriture, retenue, net, cartes: taux === undefined ? ['retenue_a_verifier'] : [] };
}
