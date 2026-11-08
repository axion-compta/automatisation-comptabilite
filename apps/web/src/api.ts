import { DecodeurFlux } from '../../../packages/contrat/src/chat/flux.js';
import type { DemandeMessage, Evenement } from '../../../packages/contrat/src/chat/evenements.js';
import { Pourquoi, PropositionVue } from '../../../packages/contrat/src/domaines/chat-propositions.js';
export type Panne = '' | '403' | '409' | '423';
/** statut 0 = le serveur n'a pas répondu (réseau). */
export type Reponse = { statut: number; corps: unknown };
async function appeler(url: string, methode: string, cle: string, corps: unknown, panne: Panne): Promise<Reponse> {
  const entetes: Record<string, string> = { 'content-type': 'application/json', 'idempotency-key': cle };
  if (panne) entetes['x-panne'] = panne;
  try {
    const r = await fetch(url, { method: methode, headers: entetes, body: JSON.stringify(corps) });
    return { statut: r.status, corps: await r.json().catch(() => null) };
  } catch {
    return { statut: 0, corps: null };
  }
}
/** Envoie une écriture (le corps est celui du contrat) ; la clé d'idempotence est fournie par l'appelant. */
export function envoyerEcriture(cle: string, libelle: string, montantCentimes: number, panne: Panne): Promise<Reponse> {
  return appeler('/ecritures', 'POST', cle, { libelle, montantCentimes }, panne);
}
/** Modifie une écriture existante ; 409 si la version est périmée. */
export function modifierEcriture(cle: string, id: string, version: number, panne: Panne): Promise<Reponse> {
  return appeler('/ecritures/' + encodeURIComponent(id), 'PUT', cle, { libelle: 'Achat fictif modifié', montantCentimes: 1300, version }, panne);
}
/** Nombre d'écritures, ou null si le serveur ne répond pas. */
export async function compterEcritures(): Promise<number | null> {
  try {
    const r = await fetch('/ecritures');
    const j: unknown = await r.json();
    // TODO fiche de suivi alignement MSW : double forme (liste nue du faux serveur, { body } du vrai serveur oRPC).
    const liste = Array.isArray(j) ? j : (j as { body?: unknown[] }).body;
    return Array.isArray(liste) ? liste.length : null;
  } catch {
    return null;
  }
}
const MESSAGES: Record<number, string> = {
  200: 'Écriture enregistrée.',
  400: 'Requête invalide.',
  403: 'Accès refusé.',
  409: 'Conflit de version.',
  423: 'Ressource verrouillée.',
};
/** Texte affiché ; réseau coupé ou erreur serveur (5xx, réponse non JSON) : « Erreur réseau. ». */
export const message = (statut: number): string =>
  statut === 0 || statut >= 500 ? 'Erreur réseau.' : (MESSAGES[statut] ?? 'Erreur ' + statut + '.');

export type CodeLecture = 'acces_refuse' | 'introuvable' | 'conflit' | 'verrouille' | 'serveur' | 'reseau' | 'reponse_invalide';
/** Erreur d'une lecture ; statut 0 = pas de réponse (réseau) ; réponse invalide : statut HTTP reçu. */
export class ErreurLecture extends Error {
  constructor(
    readonly statut: number,
    readonly code: CodeLecture,
  ) {
    super('Lecture impossible : ' + code);
    this.name = 'ErreurLecture';
  }
}
const CODES: Record<number, CodeLecture> = { 403: 'acces_refuse', 404: 'introuvable', 409: 'conflit', 423: 'verrouille' };
export type SchemaLecture<T> = { safeParse(v: unknown): { success: boolean; data?: T } };
/**
 * Lit une route en GET et valide la réponse 2xx par le schéma (garde:appels : seul ce fichier appelle le réseau).
 * Un 4xx non listé (400, 401...) donne le code reponse_invalide : choix à confirmer (voir corps de la PR).
 */
export async function lire<T>(chemin: string, schema: SchemaLecture<T>, signal?: AbortSignal): Promise<T> {
  let r: Response;
  try {
    r = await fetch(new URL(chemin, location.origin).toString(), signal ? { method: 'GET', signal } : { method: 'GET' });
  } catch {
    throw new ErreurLecture(0, 'reseau');
  }
  if (!r.ok) throw new ErreurLecture(r.status, CODES[r.status] ?? (r.status >= 500 ? 'serveur' : 'reponse_invalide'));
  const corps: unknown = await r.json().catch(() => undefined);
  const v = schema.safeParse(corps);
  if (!v.success) throw new ErreurLecture(r.status, 'reponse_invalide');
  return v.data as T;
}
export type CodeEcriture = 'cle_invalide' | 'reseau' | 'serveur' | 'reponse_invalide' | (string & {});
/** Erreur d'une écriture ; statut 0 = pas de réponse ; code = code du corps d'erreur serveur s'il existe. */
export class ErreurEcriture extends Error {
  constructor(
    readonly statut: number,
    readonly code: CodeEcriture,
    readonly donnees?: unknown,
  ) {
    super('Écriture impossible : ' + code);
    this.name = 'ErreurEcriture';
  }
}
/** Clé d'idempotence neuve (UUID, 36 caractères). */
export const nouvelleCle = (): string => crypto.randomUUID();
/**
 * Écrit (POST, PUT, DELETE) avec l'en-tête Idempotency-Key ; aucune nouvelle tentative automatique :
 * un rejeu se fait avec la MÊME clé, à l'initiative de l'écran.
 */
export async function ecrire<T>(
  methode: 'POST' | 'PUT' | 'DELETE',
  chemin: string,
  corps: unknown,
  schema: SchemaLecture<T>,
  cle: string,
  signal?: AbortSignal,
): Promise<T> {
  if (cle.length < 8 || cle.length > 128) throw new ErreurEcriture(0, 'cle_invalide');
  const init: RequestInit = {
    method: methode,
    headers: { 'content-type': 'application/json', 'idempotency-key': cle },
    ...(corps === undefined ? {} : { body: JSON.stringify(corps) }),
    ...(signal ? { signal } : {}),
  };
  let r: Response;
  try {
    r = await fetch(new URL(chemin, location.origin).toString(), init);
  } catch {
    throw new ErreurEcriture(0, 'reseau');
  }
  const recu: unknown = await r.json().catch(() => undefined);
  if (!r.ok) {
    const code = (recu as { code?: unknown } | null | undefined)?.code;
    throw new ErreurEcriture(r.status, typeof code === 'string' && code ? code : r.status >= 500 ? 'serveur' : 'reponse_invalide', recu);
  }
  const v = schema.safeParse(recu);
  if (!v.success) throw new ErreurEcriture(r.status, 'reponse_invalide');
  return v.data as T;
}
export type EtatLecture<T> = { etat: 'chargement' | 'erreur' | 'vide' | 'pret'; donnees?: T; erreur?: ErreurLecture };
/** Forme de useLecture (déclarée ici : la garde textes lit mal les génériques dans un .tsx). */
export type UseLecture = <T>(chemin: string, schema: SchemaLecture<T>) => EtatLecture<T>;

export type FinTour = 'tour_fini' | 'coupe' | 'arrete';
export type OptionsTour = { surEvenement: (e: Evenement) => void; signal?: AbortSignal; dernierId?: number };
const codeHttp = (statut: number): CodeLecture => CODES[statut] ?? (statut >= 500 ? 'serveur' : 'reponse_invalide');
const sansSchema: SchemaLecture<unknown> = { safeParse: (data) => ({ success: true, data }) };
/**
 * Flux d'un message : POST lu par fetch (EventSource ne sait pas POST). Coupure réseau = « coupe » : l'appelant
 * relance avec le dernierId rendu (Last-Event-ID). Signal annulé = « arrete », sans exception.
 */
export async function ecouterTour(demande: DemandeMessage, o: OptionsTour): Promise<{ dernierId: number; fin: FinTour }> {
  const decodeur = new DecodeurFlux();
  decodeur.dernierId = o.dernierId ?? 0;
  const bilan = (fin: FinTour) => ({ dernierId: decodeur.dernierId, fin });
  if (o.signal?.aborted) return bilan('arrete');
  const entetes: Record<string, string> = { 'content-type': 'application/json', accept: 'text/event-stream', 'idempotency-key': demande.message_id };
  if (o.dernierId !== undefined) entetes['last-event-id'] = String(o.dernierId);
  const stop = new Promise<'stop'>((fini) => o.signal?.addEventListener('abort', () => fini('stop'), { once: true }));
  const cible = new URL('/chat/messages', location.origin).toString();
  let lecteur: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const r = await Promise.race([fetch(cible, { method: 'POST', headers: entetes, body: JSON.stringify(demande), ...(o.signal ? { signal: o.signal } : {}) }), stop]);
    if (r === 'stop') return bilan('arrete');
    if (!r.ok) throw new ErreurLecture(r.status, codeHttp(r.status));
    lecteur = r.body?.getReader();
    const texte = new TextDecoder();
    for (;;) {
      const lu = lecteur ? await Promise.race([lecteur.read(), stop]) : { done: true as const };
      if (lu === 'stop') return bilan('arrete');
      if (lu.done) return bilan('coupe');
      for (const e of decodeur.pousser(texte.decode(lu.value, { stream: true }))) {
        o.surEvenement(e);
        if (e.type === 'tour.fin') return bilan('tour_fini');
      }
    }
  } catch (e) {
    if (e instanceof ErreurLecture) throw e;
    return bilan(o.signal?.aborted ? 'arrete' : 'coupe');
  } finally {
    void lecteur?.cancel().catch(() => undefined);
  }
}
const route = (id: string, suite: string): string => '/chat/' + suite.replace('{id}', encodeURIComponent(id));
/** Demande l'arrêt d'un tour ; le flux se coupe côté serveur. */
export async function arreterTour(id: string): Promise<void> {
  await ecrire('POST', route(id, 'tours/{id}/arreter'), undefined, sansSchema, nouvelleCle());
}
async function agirSurProposition(id: string, action: 'appliquer' | 'annuler', cle: string) {
  let r: Response;
  try {
    r = await fetch(new URL(route(id, `propositions/{id}/${action}`), location.origin).toString(), { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': cle } });
  } catch {
    throw new ErreurLecture(0, 'reseau');
  }
  if (!r.ok) throw new ErreurLecture(r.status, codeHttp(r.status));
  const v = PropositionVue.safeParse(await r.json().catch(() => undefined));
  if (!v.success) throw new ErreurLecture(r.status, 'reponse_invalide');
  return v.data;
}
export const appliquerProposition = (id: string, cle: string) => agirSurProposition(id, 'appliquer', cle);
export const annulerProposition = (id: string, cle: string) => agirSurProposition(id, 'annuler', cle);
export const lirePourquoi = (id: string, signal?: AbortSignal) => lire(route(id, 'propositions/{id}/pourquoi'), Pourquoi, signal);
