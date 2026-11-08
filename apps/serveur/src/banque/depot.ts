// Dépôt du bloc banque : interface et règles pures (V3-ROL-015, V3-BAN-090). Aucune base, aucun appel sortant.
import type { Canal } from '../../../../packages/noyau/src/securite/types.js';
import type { EntreeJournal } from '../../../../packages/noyau/src/journal/chaine.js';

export const TABLES_BANQUE = [
  'compte_bancaire', 'releve', 'fichier_source', 'ligne_bancaire', 'lien_rapprochement', 'journal_action',
  'profil_import', 'import_job', 'ligne_rejetee', 'consentement_banque', 'contrepartie', 'alias_contrepartie',
  'regle_jamais', 'execution_rapprochement', 'parametre_rapprochement', 'groupe_rapprochement',
  'proposition_ecart', 'qualification', 'demande_utilisateur', 'trou_releve', 'taux_change',
  'virement_interne', 'ecart_change', 'doublon_suspect', 'source_ligne', 'flux_prevu', 'lot_paiement',
  'iban_fournisseur', 'alerte_iban',
] as const;
export type TableBanque = (typeof TABLES_BANQUE)[number];
export const TABLES_AJOUT_SEUL: readonly TableBanque[] = ['journal_action', 'fichier_source'];

export type Contexte = {
  societeId: string;
  acteur: { type: 'personne' | 'ia' | 'systeme'; id: string };
  module: string;
  canal: Canal;
  horodatage: string;
};
export type Rangee = { id: string; societeId: string; version: number } & Record<string, unknown>;

export type CodeDepot =
  | 'acces_refuse' | 'inconnu' | 'table_inconnue' | 'ajout_seul' | 'lien_valide_fige' | 'version_perimee'
  | 'champ_protege' | 'colonne_reservee' | 'iban_en_clair' | 'montant_invalide' | 'taux_invalide'
  | 'contexte_invalide' | 'journal_reserve';

export class ErreurDepot extends Error {
  override name = 'ErreurDepot';
  readonly code: CodeDepot;
  constructor(code: CodeDepot) {
    super(code);
    this.code = code;
  }
}

export interface DepotBanque {
  ajouter(ctx: Contexte, table: TableBanque, valeurs: Record<string, unknown>): Promise<Rangee>;
  lire(ctx: Contexte, table: TableBanque, id: string): Promise<Rangee>;
  lister(ctx: Contexte, table: TableBanque, filtre?: Record<string, unknown>): Promise<Rangee[]>;
  modifier(ctx: Contexte, table: TableBanque, id: string, versionAttendue: number, changements: Record<string, unknown>): Promise<Rangee>;
  journal(ctx: Contexte): Promise<EntreeJournal[]>;
}

/** Premier code de refus trouvé dans les valeurs, ou null. */
export function verifierValeurs(valeurs: Record<string, unknown>, module: string): CodeDepot | null {
  const cles = Object.keys(valeurs);
  if (cles.some((c) => ['id', 'societeId', 'version'].includes(c))) return 'champ_protege';
  if (cles.some((c) => c === 'iban' || c === 'ibanBrut')) return 'iban_en_clair';
  if (module !== 'banque' && cles.some((c) => c.startsWith('iban') || c.startsWith('libelle'))) return 'colonne_reservee';
  if (cles.some((c) => /^(montant|solde)/.test(c) && !Number.isSafeInteger(valeurs[c]))) return 'montant_invalide';
  if (cles.some((c) => c.startsWith('taux') && typeof valeurs[c] !== 'bigint')) return 'taux_invalide';
  return null;
}
