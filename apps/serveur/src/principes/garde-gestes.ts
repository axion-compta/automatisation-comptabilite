// Garde de route des 12 gestes (V3-PRI-018) : fonction autonome, non branchée ; l'acteur arrive déjà construit.
import { ROUTES_A_GESTE, VERBES_SENSIBLES } from '../../../../packages/contrat/src/gestes-routes.js';
import { CATALOGUE_GESTES, verifierGeste, type Acteur, type CodeGeste, type TypeActeur } from '../../../../packages/noyau/src/principes/gestes.js';
import type { DepotRefus, RefusGeste } from '../persistance/principes.js';

export class ErreurGarde extends Error {
  override name = 'ErreurGarde';
  readonly code: 'carte_invalide' | 'entree_invalide';
  constructor(code: 'carte_invalide' | 'entree_invalide', message: string = code) {
    super(message);
    this.code = code;
  }
}

export interface EvenementGesteRefuse {
  type: 'compta.geste.refuse';
  societeId: string;
  geste: CodeGeste | null;
  code: string;
  operationId: string;
  acteurType: TypeActeur;
  horodatage: number;
}

export type CodeRefusGarde = 'geste_humain_requis' | 'permission_manquante' | 'reauth_requise' | 'route_non_declaree';
export type VerdictGarde = { ok: true } | { ok: false; statutHttp: 403; code: CodeRefusGarde };

export interface OptionsGarde {
  carte?: Readonly<Record<string, string>>;
  refus: DepotRefus;
  publier: (e: EvenementGesteRefuse) => void;
  maintenant: () => number;
  delaiReauthMs: number;
  nouvelId: () => string;
  signalerPanne: (e: unknown) => void;
}

export interface DemandeGarde {
  operationId: string;
  societeId: string;
  acteur: Acteur;
  canal: string;
  fusion?: boolean;
}

export function creerGardeGestes(o: OptionsGarde): { verifier(d: DemandeGarde): Promise<VerdictGarde> } {
  const carte = o.carte ?? ROUTES_A_GESTE;
  const codes = new Set<string>(CATALOGUE_GESTES.map((g) => g.code));
  for (const valeur of Object.values(carte)) {
    if (!codes.has(valeur)) throw new ErreurGarde('carte_invalide', 'Geste hors catalogue dans la carte.');
  }
  if (!Number.isSafeInteger(o.delaiReauthMs) || o.delaiReauthMs <= 0) {
    throw new ErreurGarde('entree_invalide', 'Délai de réauthentification invalide.');
  }

  async function refuser(d: DemandeGarde, geste: CodeGeste | null, code: CodeRefusGarde): Promise<VerdictGarde> {
    const horodatage = o.maintenant();
    const ligne: RefusGeste = {
      id: o.nouvelId(), societeId: d.societeId, geste, operationId: d.operationId,
      acteurType: d.acteur.type, code, canal: d.canal, horodatage,
    };
    try {
      await o.refus.ajouter(ligne);
    } catch (e) {
      o.signalerPanne(e);
    }
    o.publier({ type: 'compta.geste.refuse', societeId: d.societeId, geste, code, operationId: d.operationId, acteurType: d.acteur.type, horodatage });
    return { ok: false, statutHttp: 403, code };
  }

  return {
    async verifier(d) {
      if (Object.hasOwn(carte, d.operationId)) {
        const geste = carte[d.operationId] as CodeGeste;
        const v = verifierGeste(d.acteur, geste, { maintenant: o.maintenant(), delaiReauthMs: o.delaiReauthMs, ...(d.fusion === undefined ? {} : { fusion: d.fusion }) });
        return v.ok ? { ok: true } : refuser(d, geste, v.code);
      }
      const nom = d.operationId.toLowerCase();
      if (VERBES_SENSIBLES.some((p) => nom.startsWith(p))) return refuser(d, null, 'route_non_declaree');
      return { ok: true };
    },
  };
}
