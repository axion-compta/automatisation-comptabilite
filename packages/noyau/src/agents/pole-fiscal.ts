// Pôle fiscalité : contrôle d'une déclaration avant tout envoi. Fonction pure, aucun appel à un modèle.
// Montants en centimes entiers. Aucun texte affiché ici : seulement des codes.

import type { Role } from '../securite/types.js';

// « Comptable invité » = rôle `comptable` du catalogue de sécurité.
export type RoleDestinataire = Extract<Role, 'comptable' | 'administrateur'>;

export interface RoleActif {
  role: Role;
  id: string;
}

export interface LigneDeclaration {
  id: string;
  montant: number;
  sources: readonly string[];
}

export interface DeclarationFiscale {
  controleBalanceFait: boolean;
  total: number;
  lignes: readonly LigneDeclaration[];
}

export interface BalanceFiscale {
  total: number;
}

export interface EscaladeFiscale {
  vers: RoleDestinataire;
  destinataire: string;
}

export interface VerdictDeclaration {
  statut: 'acceptee' | 'refusee' | 'escalade';
  motifs: string[];
  escalade: EscaladeFiscale | null;
}

const refus = (motifs: string[]): VerdictDeclaration => ({ statut: 'refusee', motifs, escalade: null });
const sourceValide = (s: unknown): boolean => typeof s === 'string' && s.trim() !== '';

/** Comptable invité s'il existe, sinon administrateur ; rien si aucun des deux. */
function destinataire(roles: readonly RoleActif[]): EscaladeFiscale | null {
  for (const vers of ['comptable', 'administrateur'] as const) {
    const r = roles.find((x) => x.role === vers && typeof x.id === 'string' && x.id.trim() !== '');
    if (r) return { vers, destinataire: r.id };
  }
  return null;
}

export function verifierDeclaration(
  declaration: DeclarationFiscale,
  balance: BalanceFiscale,
  roles: readonly RoleActif[],
): VerdictDeclaration {
  if (declaration.controleBalanceFait !== true) return refus(['controle_balance_manquant']);

  const entier = (n: unknown): boolean => typeof n === 'number' && Number.isSafeInteger(n);
  if (!entier(declaration.total) || !entier(balance.total) || !declaration.lignes.every((l) => entier(l.montant))) {
    return refus(['montant_invalide']);
  }

  const sansSource = declaration.lignes
    .filter((l) => !Array.isArray(l.sources) || l.sources.length === 0 || !l.sources.every(sourceValide))
    .map((l) => `ligne_sans_source:${l.id}`);
  if (sansSource.length > 0) return refus(sansSource);

  if (declaration.total === balance.total) return { statut: 'acceptee', motifs: [], escalade: null };

  const vers = destinataire(roles);
  if (vers === null) return refus(['ecart_balance', 'aucun_destinataire']);
  return { statut: 'escalade', motifs: ['ecart_balance'], escalade: vers };
}
