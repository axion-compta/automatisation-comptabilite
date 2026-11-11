// Réauthentification récente sur les 8 opérations sensibles : même règle et même code d'erreur que la console.
// Le délai et le code se lisent chez la console (interface, faux en essai) ; rien n'est recopié ici.
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { exigerNiveau, type Revendications } from '../../../../packages/noyau/src/securite/connexion.js';
import { OPERATIONS_SENSIBLES, type OperationSensible } from '../../../../packages/noyau/src/securite/types.js';
import { sessionDeRequete } from './jeton.js';

export type ReglagesConsole = { reauthMaxMs: number; attenteApresRecuperationMs: number; codeErreur: string };
export interface PortReglagesConsole { lire(): Promise<ReglagesConsole> }
export type SessionReauth = { personneId: string; revendications: Revendications; derniereRecuperationMs?: number };
export type DependancesReauth = {
  reglages: PortReglagesConsole;
  /** Session de la requête ; `derniereRecuperationMs` vient du signal `securite.facteur_recupere`. */
  session?: (requete: FastifyRequest) => SessionReauth | undefined;
  horloge?: () => number;
  trace?: (evenement: 'securite.reauth_refusee', personneId: string, donnees: Record<string, string>) => void;
};

const PREFIXE = 'operation:';
const estOperation = (v: string): v is OperationSensible => (OPERATIONS_SENSIBLES as readonly string[]).includes(v);

/** Étiquette à poser dans `config.etiquettes` d'une route sensible. */
export function etiquetteOperation(nom: OperationSensible): string {
  if (!estOperation(nom)) throw new Error('opération sensible inconnue');
  return PREFIXE + nom;
}
export function operationDeEtiquette(etiquettes: unknown): OperationSensible | undefined {
  if (!Array.isArray(etiquettes)) return undefined;
  for (const e of etiquettes) {
    if (typeof e === 'string' && e.startsWith(PREFIXE) && estOperation(e.slice(PREFIXE.length))) return e.slice(PREFIXE.length) as OperationSensible;
  }
  return undefined;
}

const reglagesValides = (r: unknown): r is ReglagesConsole => {
  const x = r as ReglagesConsole | null;
  return typeof x?.codeErreur === 'string' && x.codeErreur !== '' &&
    Number.isSafeInteger(x.reauthMaxMs) && x.reauthMaxMs >= 0 &&
    Number.isSafeInteger(x.attenteApresRecuperationMs) && x.attenteApresRecuperationMs >= 0;
};
const corps401 = (code: string) => ({ defined: false, code, status: 401, message: code }) as const;

/** À installer APRÈS `installerJeton` : refus 401 sur toute route portant une étiquette `operation:<nom>`. */
export function installerReauthentification(app: FastifyInstance, d: DependancesReauth): void {
  if (typeof d?.reglages?.lire !== 'function') throw new Error('dépendances de réauthentification invalides');
  const horloge = d.horloge ?? Date.now;
  const session = d.session ?? ((r: FastifyRequest): SessionReauth | undefined => sessionDeRequete(r));
  app.addHook('onRequest', async (requete, reponse) => {
    const operation = operationDeEtiquette((requete.routeOptions.config as { etiquettes?: unknown } | undefined)?.etiquettes);
    if (operation === undefined) return;
    const s = session(requete);
    let reglages: ReglagesConsole | undefined;
    try {
      const lu: unknown = await d.reglages.lire();
      if (reglagesValides(lu)) reglages = lu;
    } catch { reglages = undefined; }
    const verdict = reglages === undefined
      ? ({ ok: false, raison: 'reauthentification_requise' } as const)
      : exigerNiveau(s?.revendications, operation, horloge(), reglages, s?.derniereRecuperationMs);
    if (verdict.ok) return;
    if (s !== undefined) d.trace?.('securite.reauth_refusee', s.personneId, { operation, raison: verdict.raison });
    const code = verdict.raison === 'reauthentification_requise' && reglages !== undefined ? reglages.codeErreur : verdict.raison;
    return reponse.status(401).send(corps401(code));
  });
}
