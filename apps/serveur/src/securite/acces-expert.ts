// Accès de l'expert invité (V3-ROL-006) : lu à chaque requête avec un cache court, jamais écrit ici.
// La console fournit la lecture de `acces_expert` (interface) ; un faux sert aux tests.
import {
  doitAvertir,
  verifierAccesExpert,
  type AccesExpert,
  type DemandeExpert,
  type VerdictExpert,
} from '../../../../packages/noyau/src/securite/expert.js';

/** Lecture de l'accès d'une personne pour une société : interface, un faux sert aux tests. */
export interface PortAccesExpert {
  lire(societeId: string, personneId: string): Promise<AccesExpert | null>;
}

export interface EvenementExpert {
  readonly type: 'securite.acces_expert_expire';
  readonly societeId: string;
  readonly personneId: string;
}

export interface ReglagesExpert {
  /** Durée du cache en ms : réglage, strictement inférieure à une minute (révocation en moins d'une minute). */
  readonly cacheMs: number;
  /** Préavis en ms avant l'échéance pour avertir l'administrateur : réglage. */
  readonly preavisMs: number;
}

export type VerdictAccesExpert = VerdictExpert | { readonly permis: false; readonly raison: 'acces_inconnu' };

const UNE_MINUTE = 60_000;

export interface DependancesExpert {
  readonly port: PortAccesExpert;
  readonly maintenant: () => number;
  readonly reglages: ReglagesExpert;
  readonly publier: (e: EvenementExpert) => void;
  readonly avertir: (acces: AccesExpert) => void;
}

export function creerAccesExpert(d: DependancesExpert) {
  const { cacheMs, preavisMs } = d.reglages;
  if (!Number.isSafeInteger(cacheMs) || cacheMs < 0 || cacheMs >= UNE_MINUTE) {
    throw new Error('cacheMs : entier de 0 à moins d’une minute attendu');
  }
  if (!Number.isSafeInteger(preavisMs) || preavisMs < 0) throw new Error('preavisMs : entier positif attendu');

  const cache = new Map<string, { lu: number; acces: AccesExpert | null }>();
  const expireSignale = new Set<string>();
  const avisEnvoye = new Set<string>();
  const cle = (s: string, p: string): string => JSON.stringify([s, p]);

  async function lire(societeId: string, personneId: string): Promise<AccesExpert | null> {
    const k = cle(societeId, personneId);
    const t = d.maintenant();
    const c = cache.get(k);
    if (c !== undefined && t >= c.lu && t - c.lu < cacheMs) return c.acces;
    const lu = await d.port.lire(societeId, personneId);
    // Un accès d'une autre société ou d'une autre personne n'est jamais retenu.
    const acces = lu !== null && lu.societeId === societeId && lu.personneId === personneId ? lu : null;
    cache.set(k, { lu: t, acces });
    return acces;
  }

  return {
    async verifier(societeId: string, personneId: string, demande: DemandeExpert): Promise<VerdictAccesExpert> {
      const acces = await lire(societeId, personneId);
      if (acces === null) return { permis: false, raison: 'acces_inconnu' };
      const verdict = verifierAccesExpert(acces, demande, new Date(d.maintenant()).toISOString());
      if (!verdict.permis && verdict.evenement !== undefined) {
        const k = cle(societeId, personneId) + acces.expireLe;
        if (!expireSignale.has(k)) {
          expireSignale.add(k);
          d.publier({ type: verdict.evenement, societeId, personneId });
        }
      }
      return verdict;
    },

    /** À appeler périodiquement : avertit l'administrateur une seule fois avant l'échéance. */
    async controlerEcheance(societeId: string, personneId: string): Promise<boolean> {
      const acces = await lire(societeId, personneId);
      if (acces === null) return false;
      const k = cle(societeId, personneId) + acces.expireLe;
      const doit = doitAvertir(acces, new Date(d.maintenant()).toISOString(), preavisMs, avisEnvoye.has(k));
      if (doit) {
        avisEnvoye.add(k);
        d.avertir(acces);
      }
      return doit;
    },
  };
}

export type ResultatInvitation =
  | { readonly statut: 'ok'; readonly societeId: string; readonly personneId: string }
  | { readonly statut: 'refuse'; readonly raison: 'inconnue' | 'deja_utilise' | 'expiree' };

/** Invitations à usage unique : on ne garde qu'une référence, jamais le secret du lien. */
export function creerInvitations(maintenant: () => number) {
  const liste = new Map<string, { societeId: string; personneId: string; expire: number; utilisee: boolean }>();
  return {
    emettre(invitationId: string, societeId: string, personneId: string, expireLe: string): void {
      const expire = Date.parse(expireLe);
      if (invitationId === '' || Number.isNaN(expire)) throw new Error('invitation invalide');
      if (liste.has(invitationId)) throw new Error('invitation déjà émise');
      liste.set(invitationId, { societeId, personneId, expire, utilisee: false });
    },
    consommer(invitationId: string): ResultatInvitation {
      const i = liste.get(invitationId);
      if (i === undefined) return { statut: 'refuse', raison: 'inconnue' };
      if (i.utilisee) return { statut: 'refuse', raison: 'deja_utilise' };
      if (maintenant() >= i.expire) return { statut: 'refuse', raison: 'expiree' };
      i.utilisee = true;
      return { statut: 'ok', societeId: i.societeId, personneId: i.personneId };
    },
  };
}
