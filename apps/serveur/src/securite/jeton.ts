import { createPublicKey, verify, type JsonWebKey } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { verifierSession, type PortSession, type Session } from '../../../../packages/noyau/src/session/port.js';
import type { Session as SessionRoute } from '../domaines/controles-actions.js';

/** Réglages du royaume `clients` : émetteur, audience et clés PUBLIQUES (kid -> JWK). Lus à un seul endroit. */
export type ReglagesJeton = { emetteur: string; audience: string; cles: Readonly<Record<string, JsonWebKey>> };
/** Droits d'une personne : fournis par un service de la console (interface, faux en essai). */
export type Attributs = Omit<Session, 'personneId' | 'revendications'>;
export interface PortAttributs { lire(sujetExterne: string): Promise<Attributs | null> }
/** Table `a_compta.personne` : une ligne par `sujet_externe`, créée à la première visite. */
export interface PortPersonnes { assurer(sujetExterne: string, nomAffiche: string): Promise<{ id: string; creee: boolean }> }
export type OptionJeton = { sessions: PortSession };
export type DependancesJeton = {
  reglages: ReglagesJeton; attributs: PortAttributs; personnes: PortPersonnes;
  horloge?: () => number;
  /** Reçoit `securite.premiere_visite` (identifiant de personne seulement). */
  trace?: (evenement: string, personneId: string) => void;
};

/** Seule lecture des réglages : variables d'environnement, aucune valeur par défaut. */
export function lireReglagesJeton(env: Readonly<Record<string, string | undefined>>): ReglagesJeton {
  const emetteur = env['JETON_EMETTEUR'];
  const audience = env['JETON_AUDIENCE'];
  const brut = env['JETON_CLES'];
  if (!emetteur || !audience || !brut) throw new Error('réglages du jeton incomplets');
  const cles = JSON.parse(brut) as Record<string, JsonWebKey>;
  if (typeof cles !== 'object' || cles === null || Object.keys(cles).length === 0) throw new Error('clés du jeton invalides');
  return { emetteur, audience, cles };
}

const SEGMENT = /^[A-Za-z0-9_-]+$/;
const objet = (v: unknown): Record<string, unknown> | null =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const decoderJson = (segment: string): Record<string, unknown> | null => {
  try { return objet(JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'))); } catch { return null; }
};

type Verifie = { sujet: string; nom: string; authTime?: number };

/** Émetteur, audience, signature RS256, expiration, `acr` = mfa. Tout écart donne `null`. */
function verifierJeton(jeton: string, r: ReglagesJeton, maintenantMs: number): Verifie | null {
  const parts = jeton.split('.');
  if (parts.length !== 3 || !parts.every((p) => SEGMENT.test(p))) return null;
  const [e, c, s] = parts as [string, string, string];
  const entete = decoderJson(e);
  const charge = decoderJson(c);
  if (!entete || !charge || entete['alg'] !== 'RS256') return null;
  const kid = entete['kid'];
  if (typeof kid !== 'string' || !Object.hasOwn(r.cles, kid)) return null;
  try {
    const cle = createPublicKey({ key: r.cles[kid] as JsonWebKey, format: 'jwk' });
    if (!verify('sha256', Buffer.from(`${e}.${c}`), cle, Buffer.from(s, 'base64url'))) return null;
  } catch { return null; }
  const aud = charge['aud'];
  const exp = charge['exp'];
  const nbf = charge['nbf'];
  const sub = charge['sub'];
  const auth = charge['auth_time'];
  if (charge['iss'] !== r.emetteur || !(aud === r.audience || (Array.isArray(aud) && aud.includes(r.audience)))) return null;
  if (typeof exp !== 'number' || !Number.isFinite(exp) || exp * 1000 <= maintenantMs) return null;
  if (nbf !== undefined && !(typeof nbf === 'number' && nbf * 1000 <= maintenantMs)) return null;
  if (typeof sub !== 'string' || sub === '' || charge['acr'] !== 'mfa') return null;
  const nom = charge['name'];
  return { sujet: sub, nom: typeof nom === 'string' && nom !== '' ? nom : sub, ...(typeof auth === 'number' ? { authTime: auth } : {}) };
}

/** Adaptateur `PortSession` : la référence est le jeton ; invalide ou inconnu = `null`. */
export function creerSessionsJeton(d: DependancesJeton): PortSession {
  const horloge = d.horloge ?? Date.now;
  return {
    async lire(reference) {
      if (reference === null) return null;
      const v = verifierJeton(reference, d.reglages, horloge());
      if (v === null) return null;
      const droits = await d.attributs.lire(v.sujet);
      if (droits === null) return null;
      const personne = await d.personnes.assurer(v.sujet, v.nom);
      if (personne.creee) d.trace?.('securite.premiere_visite', personne.id);
      return verifierSession({
        ...droits, personneId: personne.id,
        revendications: { acr: 'mfa', ...(v.authTime === undefined ? {} : { authTime: v.authTime }) },
      });
    },
  };
}

/** Table des personnes en mémoire (essais et faux service). */
export function creerPersonnesMemoire(): PortPersonnes & { lignes(): ReadonlyArray<{ id: string; sujetExterne: string; nomAffiche: string }> } {
  const table = new Map<string, { id: string; sujetExterne: string; nomAffiche: string }>();
  return {
    async assurer(sujetExterne, nomAffiche) {
      const connue = table.get(sujetExterne);
      if (connue) return { id: connue.id, creee: false };
      const id = `personne-${table.size + 1}`;
      table.set(sujetExterne, { id, sujetExterne, nomAffiche });
      return { id, creee: true };
    },
    lignes: () => [...table.values()],
  };
}

const sessions = new WeakMap<FastifyRequest, Session>();
export const sessionDeRequete = (requete: FastifyRequest): Session | undefined => sessions.get(requete);
export const versSessionRoute = (s: Session): SessionRoute =>
  ({ sorte: s.nature === 'personne' ? 'personne' : 'agent', par: s.personneId, permissions: s.permissions, reauthentifie: false });

const CORPS_401 = { defined: false, code: 'NON_AUTHENTIFIE', status: 401, message: 'NON_AUTHENTIFIE' } as const;

/** Toute route exige un jeton valide ; sinon 401 `NON_AUTHENTIFIE`. Une panne du service de session refuse aussi. */
export function installerJeton(app: FastifyInstance, option: OptionJeton): void {
  if (typeof option?.sessions?.lire !== 'function') throw new Error('option jeton invalide');
  app.addHook('onRequest', async (requete, reponse) => {
    const m = /^Bearer ([^\s]+)$/.exec(String(requete.headers.authorization ?? ''));
    let session: Session | null = null;
    try { session = m ? await option.sessions.lire(m[1] as string) : null; } catch { session = null; }
    if (session === null) return reponse.status(401).send(CORPS_401);
    sessions.set(requete, session);
  });
}
