// Types communs du bloc banque. Montants signés en centimes (négatif = sortie). Aucune logique de rapprochement.
import type { Centimes } from '../argent/index.js';
import { estDateValide } from '../dates/civiles.js';

export type TypeCompte = 'courant' | 'epargne' | 'carte' | 'caisse' | 'autre';

export type CompteBancaire = {
  id: string; nom: string; devise: string; type: TypeCompte; compteComptable: string; journal: string; ouvertLe: string; fermeLe?: string;
};

export type ReleveResume = {
  id: string; compteId: string; periodeDebut: string; periodeFin: string; soldeOuverture?: Centimes; soldeCloture?: Centimes;
};

export type Moyen = 'carte' | 'virement' | 'prelevement' | 'cheque' | 'especes' | 'frais' | 'inconnu';
export type EtatTechnique = 'completee' | 'en_attente' | 'refusee' | 'annulee' | 'extournee' | 'rejetee';

export const ETATS_RAPPROCHEMENT = ['RAPPROCHEE', 'PROPOSEE', 'DOUTEUSE', 'SANS_PIECE', 'A_QUALIFIER', 'SANS_PIECE_REQUISE', 'NEUTRALISEE', 'PERSO', 'IGNOREE'] as const;
export type EtatRapprochement = (typeof ETATS_RAPPROCHEMENT)[number];

export type LigneBancaire = {
  id: string; societeId: string; compteId: string; releveId: string; rang: number;
  dateOperation: string; dateValeur?: string; montant: Centimes; devise: string;
  montantOrigine?: Centimes; deviseOrigine?: string; libelleBrut: string; libelleNormalise?: string;
  contrepartieId?: string; certitudeContrepartie?: 'connue' | 'proposee'; regleApprise?: boolean;
  reference?: string; moyen: Moyen; etatTechnique: EtatTechnique; etatRapprochement: EtatRapprochement;
};

export type LigneLue = {
  rang: number; dateOperation: string; dateValeur?: string; montant: Centimes; devise: string;
  montantOrigine?: Centimes; deviseOrigine?: string; libelleBrut: string; reference?: string; idExterne?: string; etatTechnique: EtatTechnique;
};

export type ReleveLu = {
  ibanBrut?: string; devise: string; periodeDebut?: string; periodeFin?: string; soldeOuverture?: Centimes; soldeCloture?: Centimes;
  lignes: LigneLue[]; rejets: { rang: number; motif: string }[];
};

export type PieceCandidate = {
  id: string; societeId: string; montant: Centimes; devise: string; montantOrigine?: Centimes; deviseOrigine?: string;
  date: string; echeance?: string; sens: 'achat' | 'vente'; contrepartieId?: string; numero?: string; avoir?: boolean;
};

export type Facteur = { nom: string; points: number; code: string };

export type Lien = {
  id: string; groupeId: string; ligneId: string; pieceId?: string; montantAffecte: Centimes; score: number;
  facteurs: readonly Facteur[]; passe: number; codeRaison: string; proposePar: 'regle' | 'ia' | 'personne';
  etat: 'propose' | 'valide' | 'refuse' | 'defait'; version: number;
};

export type CodeLigne = 'montant_invalide' | 'devise_invalide' | 'date_invalide' | 'rang_invalide' | 'origine_incomplete';

export function estComptable(l: { etatTechnique: EtatTechnique }): boolean {
  return l.etatTechnique === 'completee';
}

export function verifierLigneBancaire(l: LigneBancaire): CodeLigne[] {
  const codes: CodeLigne[] = [];
  if (!Number.isSafeInteger(l.montant)) codes.push('montant_invalide');
  if (!/^[A-Z]{3}$/.test(l.devise)) codes.push('devise_invalide');
  if (!estDateValide(l.dateOperation) || (l.dateValeur !== undefined && !estDateValide(l.dateValeur))) codes.push('date_invalide');
  if (!Number.isSafeInteger(l.rang) || l.rang < 0) codes.push('rang_invalide');
  if ((l.montantOrigine === undefined) !== (l.deviseOrigine === undefined)) codes.push('origine_incomplete');
  return codes;
}
