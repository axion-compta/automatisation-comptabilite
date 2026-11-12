import { ORPCError } from '@orpc/server';
import { exigerNiveau, type ReglagesConnexion, type Revendications } from '../../../../packages/noyau/src/securite/connexion.js';
import type { Permission, Role } from '../../../../packages/noyau/src/securite/types.js';
import type { TypeDroit } from '../../../../packages/noyau/src/rgpd/types.js';

export type IdentitePersonnes = { role: Role; permissions: readonly string[]; revendications?: Revendications; derniereRecuperationMs?: number };
export interface SourceIdentitePersonnes { lire(): IdentitePersonnes | undefined }

export const PERMISSION_PERSONNES: Permission = 'compta-parametrer';
export const TYPES_AVEC_REAUTH: readonly TypeDroit[] = ['acces', 'portabilite'];
export const OPERATION_DU_TRAITEMENT = 'exporter_dossier'; // la réponse remet une copie des données : même règle que l'export du dossier

export type VerdictPersonnes = { ok: true } | { ok: false; statut: 401 | 403 | 503; code: string };
const non = (statut: 401 | 403 | 503, code: string): VerdictPersonnes => ({ ok: false, statut, code });

export function verifierAccesPersonnes(
  identite: IdentitePersonnes | undefined,
  { typeDemande, maintenantMs, reglages }: { typeDemande?: TypeDroit; maintenantMs: number; reglages: ReglagesConnexion | undefined },
): VerdictPersonnes {
  if (identite === undefined || identite === null) return non(401, 'NON_AUTHENTIFIE');
  if (identite.role === 'personnel_axion' || !Array.isArray(identite.permissions) || !identite.permissions.includes(PERMISSION_PERSONNES)) return non(403, 'PERMISSION_MANQUANTE');
  if (reglages === undefined) return non(503, 'REGLAGE_ABSENT');
  try {
    const operation = typeDemande !== undefined && TYPES_AVEC_REAUTH.includes(typeDemande) ? OPERATION_DU_TRAITEMENT : 'ordinaire';
    const v = exigerNiveau(identite.revendications, operation, maintenantMs, reglages, identite.derniereRecuperationMs);
    return v.ok ? v : non(401, v.raison.toUpperCase());
  } catch {
    return non(401, 'NON_AUTHENTIFIE'); // valeur invalide : on refuse
  }
}

export function refusPersonnes(verdict: Extract<VerdictPersonnes, { ok: false }>): ORPCError<string, undefined> {
  return new ORPCError(verdict.code, { status: verdict.statut, message: verdict.code });
}
