// Gestes humains G01 à G12 : liste fermée, vérification pure (V3-PRI-018, V3-PRI-005).
// Les permissions arrivent avec l'acteur ; aucune attribution aux rôles ici.

export type CodeGeste = 'G01' | 'G02' | 'G03' | 'G04' | 'G05' | 'G06' | 'G07' | 'G08' | 'G09' | 'G10' | 'G11' | 'G12';

export interface Geste {
  readonly code: CodeGeste;
  readonly action: string;
  readonly permission: string;
  readonly reauth: 'toujours' | 'jamais' | 'fusion_seulement';
}

export const CATALOGUE_GESTES: readonly Geste[] = [
  { code: 'G01', action: 'valider_ecriture', permission: 'compta-valider', reauth: 'jamais' },
  { code: 'G02', action: 'cloturer', permission: 'compta-cloturer', reauth: 'toujours' },
  { code: 'G03', action: 'deposer_declaration', permission: 'compta-valider', reauth: 'toujours' },
  { code: 'G04', action: 'payer_declaration', permission: 'compta-valider', reauth: 'toujours' },
  { code: 'G05', action: 'choisir_regime', permission: 'compta-parametrer', reauth: 'toujours' },
  { code: 'G06', action: 'activer_assimiler', permission: 'compta-parametrer', reauth: 'toujours' },
  { code: 'G07', action: 'accepter_compte_courant_debiteur', permission: 'compta-valider', reauth: 'toujours' },
  { code: 'G08', action: 'proposer_dividende', permission: 'compta-cloturer', reauth: 'toujours' },
  { code: 'G09', action: 'creer_compte_ou_fusionner_tiers', permission: 'compta-saisir', reauth: 'fusion_seulement' },
  { code: 'G10', action: 'envoyer_email', permission: 'compta-valider', reauth: 'jamais' },
  { code: 'G11', action: 'supprimer_donnees', permission: 'compta-parametrer', reauth: 'toujours' },
  { code: 'G12', action: 'appliquer_parametre_legal', permission: 'compta-parametrer', reauth: 'toujours' },
];

/** Permission exigée pour fusionner des tiers (G09 en fusion). */
const PERMISSION_FUSION = 'compta-parametrer';

export type CodeErreurGeste = 'geste_inconnu' | 'entree_invalide';

export class ErreurGeste extends Error {
  override name = 'ErreurGeste';
  readonly code: CodeErreurGeste;
  constructor(code: CodeErreurGeste, message: string) {
    super(message);
    this.code = code;
  }
}

export type TypeActeur = 'personne' | 'service' | 'agent' | 'tache';

export interface Acteur {
  type: TypeActeur;
  permissions: readonly string[];
  derniereReauth?: number;
}

export interface ContexteGeste {
  maintenant: number;
  delaiReauthMs: number;
  fusion?: boolean;
}

export type VerdictGeste =
  | { ok: true }
  | { ok: false; statutHttp: 403; code: 'geste_humain_requis' | 'permission_manquante' | 'reauth_requise' };

const TYPES_ACTEUR: readonly string[] = ['personne', 'service', 'agent', 'tache'];

function refus(code: 'geste_humain_requis' | 'permission_manquante' | 'reauth_requise'): VerdictGeste {
  return { ok: false, statutHttp: 403, code };
}

/** Ordre : code, entrées, type d'acteur, permission, puis réauthentification. */
export function verifierGeste(acteur: Acteur, code: CodeGeste, ctx: ContexteGeste): VerdictGeste {
  const geste = CATALOGUE_GESTES.find((g) => g.code === code);
  if (geste === undefined) throw new ErreurGeste('geste_inconnu', 'Geste inconnu : ' + String(code));
  if (!Number.isSafeInteger(ctx.maintenant)) throw new ErreurGeste('entree_invalide', 'Instant courant invalide');
  if (!Number.isSafeInteger(ctx.delaiReauthMs) || ctx.delaiReauthMs <= 0) {
    throw new ErreurGeste('entree_invalide', 'Délai de réauthentification invalide');
  }
  if (!TYPES_ACTEUR.includes(acteur.type)) throw new ErreurGeste('entree_invalide', 'Type d’acteur inconnu');
  if (!Array.isArray(acteur.permissions)) throw new ErreurGeste('entree_invalide', 'Permissions invalides');
  if (acteur.derniereReauth !== undefined && !Number.isSafeInteger(acteur.derniereReauth)) {
    throw new ErreurGeste('entree_invalide', 'Instant de réauthentification invalide');
  }

  if (acteur.type !== 'personne') return refus('geste_humain_requis');

  const fusion = geste.reauth === 'fusion_seulement' && ctx.fusion === true;
  const permission = fusion ? PERMISSION_FUSION : geste.permission;
  if (!acteur.permissions.includes(permission)) return refus('permission_manquante');

  if (geste.reauth === 'toujours' || fusion) {
    const ecart = acteur.derniereReauth === undefined ? -1 : ctx.maintenant - acteur.derniereReauth;
    if (ecart < 0 || ecart >= ctx.delaiReauthMs) return refus('reauth_requise');
  }
  return { ok: true };
}
