import { exigerNiveau, type ReglagesConnexion, type Revendications, type VerdictNiveau } from '../securite/connexion.js';
import { estPermission, estRole, type OperationSensible, type Permission, type Role } from '../securite/types.js';

export type Session = {
  readonly personneId: string;
  readonly nature: 'personne' | 'service';
  readonly organisationId: string;
  readonly organisations: readonly string[];
  readonly societeId: string;
  readonly societes: readonly string[];
  readonly roles: readonly Role[];
  readonly permissions: readonly Permission[];
  readonly revendications: Revendications;
};

export interface PortSession {
  lire(reference: string | null): Promise<Session | null>;
}

export class ErreurSession extends Error {
  readonly code: 'session_invalide' | 'organisation_refusee';
  constructor(code: 'session_invalide' | 'organisation_refusee') {
    super(code);
    this.name = 'ErreurSession';
    this.code = code;
  }
}

const invalide = (): never => {
  throw new ErreurSession('session_invalide');
};
const texte = (v: unknown): string => (typeof v === 'string' && v !== '' ? v : invalide());
const liste = (v: unknown): string[] =>
  Array.isArray(v) && v.length > 0 ? v.map(texte) : invalide();
const objet = (v: unknown): Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : invalide();
const CHAMPS = [
  'personneId', 'nature', 'organisationId', 'organisations', 'societeId', 'societes', 'roles',
  'permissions', 'revendications',
];

function revendications(v: unknown): Revendications {
  const r = objet(v);
  if (Object.keys(r).some((k) => k !== 'acr' && k !== 'authTime')) invalide();
  if (r.acr !== undefined && typeof r.acr !== 'string') invalide();
  if (r.authTime !== undefined && !(typeof r.authTime === 'number' && Number.isFinite(r.authTime))) invalide();
  return Object.freeze({
    ...(r.acr === undefined ? {} : { acr: r.acr as string }),
    ...(r.authTime === undefined ? {} : { authTime: r.authTime as number }),
  });
}

export function verifierSession(brut: unknown): Session {
  const o = objet(brut);
  if (Object.keys(o).some((k) => !CHAMPS.includes(k))) invalide();
  if (o.nature !== 'personne' && o.nature !== 'service') invalide();
  const organisations = liste(o.organisations);
  const societes = liste(o.societes);
  const organisationId = texte(o.organisationId);
  const societeId = texte(o.societeId);
  if (!organisations.includes(organisationId) || !societes.includes(societeId)) invalide();
  const roles = liste(o.roles);
  const permissions = liste(o.permissions);
  if (!roles.every(estRole) || !permissions.every(estPermission)) invalide();
  return Object.freeze({
    personneId: texte(o.personneId),
    nature: o.nature as Session['nature'],
    organisationId,
    organisations: Object.freeze(organisations),
    societeId,
    societes: Object.freeze(societes),
    roles: Object.freeze(roles as Role[]),
    permissions: Object.freeze(permissions as Permission[]),
    revendications: revendications(o.revendications),
  });
}

export function exigerPermission(s: Session, p: Permission): { ok: true } | { ok: false; raison: 'permission_manquante' } {
  return s.permissions.includes(p) ? { ok: true } : { ok: false, raison: 'permission_manquante' };
}

export function exigerPersonne(s: Session): { ok: true } | { ok: false; raison: 'compte_de_service' } {
  return s.nature === 'personne' ? { ok: true } : { ok: false, raison: 'compte_de_service' };
}

export function exigerNouvelleConnexion(
  s: Session | null,
  operation: OperationSensible | 'ordinaire',
  maintenantMs: number,
  reglages: ReglagesConnexion,
  derniereRecuperationMs?: number,
): VerdictNiveau {
  return exigerNiveau(s === null ? undefined : s.revendications, operation, maintenantMs, reglages, derniereRecuperationMs);
}

export function choisirOrganisation(
  s: Session,
  organisationId: string,
  societesDeLOrganisation: readonly string[],
): Session {
  if (!s.organisations.includes(organisationId) || societesDeLOrganisation.length === 0) {
    throw new ErreurSession('organisation_refusee');
  }
  return verifierSession({
    ...s,
    organisationId,
    societes: [...societesDeLOrganisation],
    societeId: societesDeLOrganisation[0],
  });
}
