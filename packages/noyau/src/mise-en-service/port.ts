// Ports de la mise en service : ce que le module attend de la console et d'un serveur de bases clients.
// Aucun nom d'hébergeur, aucun réseau, aucun réglage en dur : l'adaptateur réel les reçoit de l'extérieur.
import type { Retour } from './operations.js';

export type EtatEspace = 'en_creation' | 'pret';

export type ReponseCreation = { organisationId: string; base: string; etat: EtatEspace; rejoue: boolean };

/** Port de la console des automatisations. Chaque appel porte une clé d'idempotence (`cle`). */
export interface PortConsole {
  creerEspace(d: { cle: string; identifiant: string }): Promise<ReponseCreation>;
  inviter(d: { cle: string; organisationId: string; personne: string; role: string }): Promise<Retour>;
  suspendre(d: { cle: string; organisationId: string }): Promise<Retour>;
  geler(d: { cle: string; organisationId: string; motif: string }): Promise<Retour>;
  supprimer(d: { cle: string; organisationId: string }): Promise<Retour>;
  /** `null` si l'espace est inconnu. */
  etatEspace(organisationId: string): Promise<EtatEspace | null>;
}

export type EtatBase = { existe: boolean; migrationsAppliquees: number };

/** Port neutre des bases clients (`cli_<id>`) : le serveur peut changer sans toucher au module. */
export interface PortBaseClient {
  /** Idempotent : renvoie `false` si la base existait déjà. */
  creerBase(nom: string): Promise<boolean>;
  /** Idempotent : renvoie le nombre de migrations nouvellement appliquées (0 si tout l'était déjà). */
  appliquerMigrations(nom: string): Promise<number>;
  verifierEtat(nom: string): Promise<EtatBase>;
}

export type EnsembleMiseEnService = { console: PortConsole; bases: PortBaseClient };
