import type { QueryClient } from '@tanstack/react-query';
import { ReponseActionAlerte } from '../../../../packages/contrat/src/domaines/alertes.js';
import { ReponseNotification, ReponseToutLire } from '../../../../packages/contrat/src/domaines/notifications.js';
import { ErreurEcriture, ErreurLecture, ecrire, nouvelleCle, type CodeLecture } from '../api.js';
import { relireApresAction } from './interrogation.js';

export type ActionAlerte = 'reporter' | 'ignorer' | 'annuler';
export type CorpsAction = { jours?: number; motif?: string; version: number };
const CODES: Record<number, CodeLecture> = { 403: 'acces_refuse', 404: 'introuvable', 409: 'conflit', 423: 'verrouille' };
/** Une clé par intention : rejouer la même intention (double clic, nouvel essai) renvoie la même clé. */
const cles = new Map<string, string>();
const enVol = new Map<string, Promise<unknown>>();

/** Corps conforme au contrat : champs attendus par l'action, version entière d'au moins 1. */
function verifier(action: ActionAlerte, c: CorpsAction): Record<string, unknown> {
  const champ = action === 'reporter' ? { jours: c.jours } : action === 'ignorer' ? { motif: c.motif } : {};
  const bon = Number.isInteger(c.version) && c.version >= 1 && (action !== 'reporter' || Number.isInteger(c.jours)) && (action !== 'ignorer' || typeof c.motif === 'string');
  if (!bon) throw new ErreurLecture(0, 'reponse_invalide');
  return { ...champ, version: c.version };
}
function traduire(e: unknown): never {
  if (!(e instanceof ErreurEcriture)) throw e;
  throw new ErreurLecture(e.statut, e.statut === 0 ? 'reseau' : (CODES[e.statut] ?? (e.statut >= 500 ? 'serveur' : 'reponse_invalide')));
}
function unique<T>(intention: string, lancer: (cle: string) => Promise<T>): Promise<T> {
  const deja = enVol.get(intention);
  if (deja) return deja as Promise<T>;
  const cle = cles.get(intention) ?? nouvelleCle();
  cles.set(intention, cle);
  const p = lancer(cle).then((r) => (cles.delete(intention), r), traduire).finally(() => enVol.delete(intention));
  enVol.set(intention, p);
  return p;
}

/** Reporter, ignorer ou annuler une alerte, puis relit alertes, compteurs et tableau de bord. */
export async function agirSurAlerte(exercice: string, id: string, action: ActionAlerte, corps: CorpsAction, client: QueryClient) {
  const envoye = verifier(action, corps);
  const racine = '/exercices/' + encodeURIComponent(exercice);
  const r = await unique([exercice, id, action, JSON.stringify(envoye)].join('|'), (cle) =>
    ecrire('POST', racine + '/alertes/' + encodeURIComponent(id) + '/' + action, envoye, ReponseActionAlerte, cle));
  await relireApresAction(client, [racine + '/alertes', racine + '/compteurs', racine + '/tableau-de-bord']);
  return r;
}

/** Marque une notification lue, ou toutes (« tout »), puis relit la liste. */
export async function marquerNotification(id: string, client: QueryClient): Promise<void> {
  await unique<unknown>('notif|' + id, (cle) =>
    id === 'tout' ? ecrire('POST', '/notifications/tout-lire', undefined, ReponseToutLire, cle) : ecrire('POST', '/notifications/' + encodeURIComponent(id) + '/lue', undefined, ReponseNotification, cle));
  await relireApresAction(client, ['/notifications']);
}
