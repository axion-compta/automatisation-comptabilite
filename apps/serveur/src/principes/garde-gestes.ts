// Garde de route des 12 gestes (V3-PRI-018) : fonction autonome, non branchée ; l'acteur personne vient d'une Session (L00-T50).
import { creerEnveloppe } from '../../../../packages/noyau/src/evenements/enveloppe.js';
import { ROUTES_A_GESTE, VERBES_SENSIBLES } from '../../../../packages/contrat/src/gestes-routes.js';
import { CATALOGUE_GESTES, verifierGeste, type Acteur, type CodeGeste, type TypeActeur } from '../../../../packages/noyau/src/principes/gestes.js';
import type { BoiteEnvoi, UniteDeTravail } from '../../../../packages/noyau/src/evenements/publication.js';
import { exigerNouvelleConnexion, type Session } from '../../../../packages/noyau/src/session/port.js';
import type { Canal } from '../../../../packages/noyau/src/securite/types.js';
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
  unite: UniteDeTravail;
  maintenant: () => number;
  delaiReauthMs: number;
  nouvelId: () => string;
  signalerPanne: (e: unknown) => void;
}

export interface DemandeGarde {
  operationId: string;
  societeId: string;
  session: Session | null;
  executant?: 'agent' | 'tache';
  canal: Canal;
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

  function acteurDe(d: DemandeGarde): Acteur {
    if (d.session === null) return { type: 'service', permissions: [] };
    const type: TypeActeur = d.executant ?? (d.session.nature === 'personne' ? 'personne' : 'service');
    const t = d.session.revendications.authTime;
    return { type, permissions: d.session.permissions, ...(t === undefined ? {} : { derniereReauth: Math.round(t * 1000) }) };
  }

  async function refuser(d: DemandeGarde, acteur: Acteur, geste: CodeGeste | null, code: CodeRefusGarde): Promise<VerdictGarde> {
    const horodatage = o.maintenant();
    const ligne: RefusGeste = {
      id: o.nouvelId(), societeId: d.societeId, geste, operationId: d.operationId,
      acteurType: acteur.type, code, canal: d.canal, horodatage,
    };
    const evenement: EvenementGesteRefuse = { type: 'compta.geste.refuse', societeId: d.societeId, geste, code, operationId: d.operationId, acteurType: acteur.type, horodatage };
    const deposer = (boite: BoiteEnvoi): void => boite.deposer(creerEnveloppe({
      id: o.nouvelId(), type: evenement.type, societe_id: d.societeId, exercice_id: null, objet_id: d.operationId, version: 1,
      acteur: { type: 'systeme', id: 'garde-gestes' }, canal: d.canal, horodatage: new Date(horodatage).toISOString(),
      correlation_id: ligne.id, charge: { geste, code, acteur_type: acteur.type },
    }));
    try {
      await o.unite.executer(async ({ boite }) => { await o.refus.ajouter(ligne); deposer(boite); });
    } catch (e) {
      o.signalerPanne(e);
      try { await o.unite.executer(async ({ boite }) => deposer(boite)); } catch (e2) { o.signalerPanne(e2); }
    }
    return { ok: false, statutHttp: 403, code };
  }

  return {
    async verifier(d) {
      if (Object.hasOwn(carte, d.operationId)) {
        const geste = carte[d.operationId] as CodeGeste;
        const acteur = acteurDe(d);
        const maintenant = o.maintenant();
        const v = verifierGeste(acteur, geste, { maintenant, delaiReauthMs: o.delaiReauthMs, ...(d.fusion === undefined ? {} : { fusion: d.fusion }) });
        if (!v.ok) return refuser(d, acteur, geste, v.code);
        const regle = CATALOGUE_GESTES.find((g) => g.code === geste)?.reauth;
        if (regle === 'toujours' || (regle === 'fusion_seulement' && d.fusion === true)) {
          const n = exigerNouvelleConnexion(d.session, 'cloturer', maintenant, { reauthMaxMs: o.delaiReauthMs, attenteApresRecuperationMs: 0 });
          if (!n.ok) return refuser(d, acteur, geste, 'reauth_requise');
        }
        return { ok: true };
      }
      const nom = d.operationId.toLowerCase();
      if (VERBES_SENSIBLES.some((p) => nom.startsWith(p))) return refuser(d, acteurDe(d), null, 'route_non_declaree');
      return { ok: true };
    },
  };
}
