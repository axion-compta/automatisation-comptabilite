export const ROLES = [
  'administrateur', 'utilisateur', 'lecture', 'comptable', 'invite_externe', 'personnel_axion',
] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'compta-lire', 'compta-deposer', 'compta-saisir', 'compta-valider', 'compta-lever-bloquant',
  'compta-cloturer', 'compta-exporter', 'compta-parametrer', 'compta-equipe', 'compta-commenter',
  'compta-pieces-sensibles',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ACTIONS = [
  'lire', 'voir_piece_sensible', 'deposer', 'saisir', 'valider', 'lever_majeur', 'lever_bloquant',
  'cloturer', 'exporter', 'parametrer', 'gerer_equipe', 'commenter',
  'proposer_actions_automatiques', 'assimiler_factures_autre_nom',
] as const;
export type Action = (typeof ACTIONS)[number];

export const PERMISSION_DE_L_ACTION: Readonly<Record<Action, Permission>> = Object.freeze({
  lire: 'compta-lire', voir_piece_sensible: 'compta-pieces-sensibles', deposer: 'compta-deposer',
  saisir: 'compta-saisir', valider: 'compta-valider', lever_majeur: 'compta-valider',
  lever_bloquant: 'compta-lever-bloquant', cloturer: 'compta-cloturer',
  exporter: 'compta-exporter', parametrer: 'compta-parametrer', gerer_equipe: 'compta-equipe',
  commenter: 'compta-commenter', proposer_actions_automatiques: 'compta-parametrer',
  assimiler_factures_autre_nom: 'compta-valider',
});

export const ACTIONS_ECRITURE: readonly Action[] = Object.freeze(
  ACTIONS.filter((a) => a !== 'lire' && a !== 'voir_piece_sensible' && a !== 'commenter'),
);

export const OPERATIONS_SENSIBLES = [
  'rouvrir_periode', 'cloturer', 'exporter_fec', 'exporter_dossier', 'changer_role',
  'changer_cle', 'changer_modele_ia', 'ouvrir_interrupteur',
] as const;
export type OperationSensible = (typeof OPERATIONS_SENSIBLES)[number];

export const RAISONS = [
  'non_authentifie', 'mfa_requis', 'reauthentification_requise', 'recuperation_recente',
  'role_lecture', 'role_insuffisant', 'perimetre_expert', 'acces_expire', 'acces_revoque',
  'separation_taches', 'mode_saisie_seule', 'etat_acces', 'societe_unique', 'introuvable',
  'personnel_axion_lecture_seule', 'arret_urgence', 'debit_depasse', 'entree_invalide',
] as const;
export type Raison = (typeof RAISONS)[number];

export const EVENEMENTS = [
  'securite.premiere_visite', 'securite.reauth_refusee', 'securite.facteur_recupere',
  'securite.acces_expert_expire', 'securite.ecriture_axion_refusee', 'securite.arret_urgence',
  'securite.reprise', 'audit.tete_signee', 'audit.chaine_rompue', 'acces.etat_change',
  'export.massif', 'ia.route_refusee',
] as const;
export type Evenement = (typeof EVENEMENTS)[number];

export const CANAUX = ['clic', 'chat', 'voix', 'import', 'api', 'systeme'] as const;
export type Canal = (typeof CANAUX)[number];

export class ErreurSecurite extends Error {
  readonly code: Raison | 'argument_invalide';
  constructor(code: Raison | 'argument_invalide', message?: string) {
    super(message ?? code);
    this.name = 'ErreurSecurite';
    this.code = code;
  }
}

const garde =
  <T extends string>(liste: readonly T[]) =>
  (v: unknown): v is T =>
    liste.includes(v as T);

export const estRole = garde(ROLES);
export const estPermission = garde(PERMISSIONS);
export const estAction = garde(ACTIONS);
export const estRaison = garde(RAISONS);
export const estCanal = garde(CANAUX);
