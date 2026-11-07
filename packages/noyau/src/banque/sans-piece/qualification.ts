// Qualification en code des lignes sans pièce candidate. Aucun compte comptable, aucun texte affiché.
// Jamais un crédit inconnu classé en produit sans confirmation. Les listes du contexte sont des arguments.
import type { Centimes } from '../../argent/index.js';
import type { Moyen } from '../types.js';

export class ErreurQualification extends Error {
  constructor(readonly code: 'montant_nul' | 'montant_invalide') {
    super(code);
    this.name = 'ErreurQualification';
  }
}

export type LigneAQualifier = {
  readonly montant: Centimes;
  readonly moyen: Moyen;
  readonly contrepartieId?: string;
  readonly creancier?: string;
  readonly ibanHache?: string;
};
export type Contexte = {
  readonly banquesDeLaSociete: readonly string[];
  readonly creanciers: Readonly<Record<string, 'impot_taxe' | 'social'>>;
  readonly ibansAssocies: readonly string[];
  readonly clientsConnus: readonly string[];
  readonly virementInterne: boolean;
};
export type Proposition = 'acompte_recu' | 'apport_associe' | 'remboursement_associe' | 'frais' | 'impot' | 'social' | 'interne';
export type Qualification = {
  readonly etat: 'SANS_PIECE_REQUISE' | 'A_QUALIFIER' | 'SANS_PIECE';
  readonly type: string;
  readonly proposition?: Proposition;
  readonly codeRaison: string;
};

const requise = (type: string, proposition: Proposition): Qualification => ({ etat: 'SANS_PIECE_REQUISE', type, proposition, codeRaison: type });
const connu = (liste: readonly string[], id: string | undefined): boolean => id !== undefined && id !== '' && liste.includes(id);

export function qualifier(ligne: LigneAQualifier, contexte: Contexte): Qualification {
  const m = ligne.montant;
  if (!Number.isSafeInteger(m)) throw new ErreurQualification('montant_invalide');
  if (m === 0) throw new ErreurQualification('montant_nul');
  const credit = m > 0;
  if (contexte.virementInterne) return requise('interne', 'interne');
  if (!credit && ligne.moyen === 'frais' && connu(contexte.banquesDeLaSociete, ligne.contrepartieId)) return requise('frais_banque', 'frais');
  const c = ligne.creancier;
  const genre = c !== undefined && Object.hasOwn(contexte.creanciers, c) ? contexte.creanciers[c] : undefined;
  if (genre === 'impot_taxe') return requise('impot_taxe', 'impot');
  if (genre === 'social') return requise('social', 'social');
  if (connu(contexte.ibansAssocies, ligne.ibanHache)) {
    return { etat: 'A_QUALIFIER', type: 'associe', proposition: credit ? 'apport_associe' : 'remboursement_associe', codeRaison: 'associe' };
  }
  if (!credit) return { etat: 'SANS_PIECE', type: 'piece_attendue', codeRaison: 'debit_sans_piece' };
  if (connu(contexte.clientsConnus, ligne.contrepartieId)) {
    return { etat: 'A_QUALIFIER', type: 'acompte', proposition: 'acompte_recu', codeRaison: 'client_connu' };
  }
  return { etat: 'A_QUALIFIER', type: 'credit_inconnu', codeRaison: 'credit_inconnu' };
}
