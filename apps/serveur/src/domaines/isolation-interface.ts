import { createHash } from 'node:crypto';
import { PREFIXE_ROUTES_SOCIETE } from '../../../../packages/contrat/src/prefixe-routes.js';
import {
  exigerNouvelleConnexion,
  type PortSession,
  type Session,
} from '../../../../packages/noyau/src/session/port.js';
import type { ReglagesConnexion } from '../../../../packages/noyau/src/securite/connexion.js';

export type Cible = { id: string; societeId: string; organisationId: string };
export type Perimetre = 'exercices' | 'journaux' | 'comptes_bancaires';
export type AccesExpert = { etat: 'actif' | 'revoque' | 'expire'; perimetre: readonly Perimetre[] };
export type Action = 'lire' | 'reporter' | 'ignorer' | 'exporter';
export type Code =
  | 'non_authentifie' | 'societe_unique' | 'introuvable' | 'role_insuffisant' | 'role_lecture'
  | 'perimetre_expert' | 'acces_revoque' | 'acces_expire' | 'reauthentification_requise'
  | 'mfa_requis' | 'recuperation_recente';

/** Prises : la console fournira les vrais services plus tard (faux services en essai). */
export interface PortCibles { trouver(id: string): Promise<Cible | null> }
export interface PortExperts { lire(personneId: string, societeId: string): Promise<AccesExpert | null> }
export type Dependances = {
  sessions: PortSession; cibles: PortCibles; experts: PortExperts;
  reglages: ReglagesConnexion; maintenantMs: () => number;
};
export type Demande = {
  reference: string | null; action: Action; chemin?: string; cibleId?: string; ressource?: Perimetre | 'autre';
};
export type Verdict = { ok: true; session: Session } | { ok: false; statut: number; corps: { code: Code } };

const STATUTS: Record<Code, number> = {
  non_authentifie: 401, societe_unique: 400, introuvable: 404, role_insuffisant: 403, role_lecture: 403,
  perimetre_expert: 403, acces_revoque: 403, acces_expire: 403, reauthentification_requise: 401,
  mfa_requis: 401, recuperation_recente: 403,
};
const refus = (code: Code): Verdict => ({ ok: false, statut: STATUTS[code], corps: { code } });
const PERMISSION_REQUISE = { reporter: 'compta-valider', ignorer: 'compta-valider', exporter: 'compta-exporter' } as const;

/** Société prise dans le chemin selon PREFIXE_ROUTES_SOCIETE ; null si le chemin n'a pas ce préfixe. */
export function societeDuChemin(chemin: string): string | null {
  const avant = PREFIXE_ROUTES_SOCIETE.slice(0, PREFIXE_ROUTES_SOCIETE.indexOf('{s}'));
  if (!chemin.startsWith(avant)) return null;
  const id = chemin.slice(avant.length).split('/', 1).join('');
  return id === '' ? null : id;
}

export async function controler(d: Dependances, q: Demande): Promise<Verdict> {
  const session = await d.sessions.lire(q.reference);
  if (session === null) return refus('non_authentifie');
  if (q.chemin !== undefined && societeDuChemin(q.chemin) !== session.societeId) return refus('societe_unique');
  if (q.cibleId !== undefined) {
    const cible = await d.cibles.trouver(q.cibleId);
    if (cible === null || cible.organisationId !== session.organisationId) return refus('introuvable');
    if (cible.societeId !== session.societeId) return refus('societe_unique');
  }
  const requise = q.action === 'lire' ? undefined : PERMISSION_REQUISE[q.action];
  if (requise !== undefined && !session.permissions.includes(requise)) {
    return refus(q.action !== 'exporter' && session.permissions.includes('compta-lire') ? 'role_lecture' : 'role_insuffisant');
  }
  if (session.roles.includes('invite_externe')) {
    const acces = await d.experts.lire(session.personneId, session.societeId);
    if (acces === null || acces.etat === 'revoque') return refus('acces_revoque');
    if (acces.etat === 'expire') return refus('acces_expire');
    if (q.ressource === undefined || q.ressource === 'autre' || !acces.perimetre.includes(q.ressource)) {
      return refus('perimetre_expert');
    }
  }
  if (q.action === 'exporter') {
    const niveau = exigerNouvelleConnexion(session, 'exporter_fec', d.maintenantMs(), d.reglages);
    if (!niveau.ok) return refus(niveau.raison);
  }
  return { ok: true, session };
}

export const TEXTE_MASQUE = 'Pièce sensible masquée';
export type Element = { id: string; libelle: string; sensible?: boolean };

/** Appliqué à CHAQUE lecture, jamais mis en cache : recherche = exclusion, alerte ou export = libellé masqué. */
export function masquer(s: Session, elements: readonly Element[], mode: 'recherche' | 'alerte' | 'export'): Element[] {
  if (s.permissions.includes('compta-pieces-sensibles')) return elements.map((e) => ({ ...e }));
  if (mode === 'recherche') return elements.filter((e) => e.sensible !== true).map((e) => ({ ...e }));
  return elements.map((e) => (e.sensible === true ? { ...e, libelle: TEXTE_MASQUE } : { ...e }));
}

/** En-têtes de cache : l'ETag dépend du corps, de la personne, de la société et de ses permissions. */
export function entetesCache(s: Session, corps: string): Record<string, string> {
  const empreinte = createHash('sha256')
    .update(JSON.stringify([corps, s.personneId, s.societeId, [...s.permissions].sort(), [...s.roles].sort()]))
    .digest('hex');
  return { ETag: `"${empreinte}"`, 'Cache-Control': 'private, no-cache', Vary: 'Authorization' };
}
