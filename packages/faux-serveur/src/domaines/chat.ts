import { http, HttpResponse, type HttpHandler } from 'msw';
import { encoderEvenement } from '../../../contrat/src/chat/flux.js';
import type { Evenement } from '../../../contrat/src/chat/evenements.js';
import { DemandeEnvoi } from '../../../contrat/src/domaines/chat.js';
import { EnTeteEcriture } from '../../../contrat/src/schemas.js';
import { genererChat } from '../../../donnees-fictives/src/chat.js';

export interface OptionsChatFaux {
  /** Scénario « coupure » : le flux s'arrête après N événements (l'en-tête x-coupure le décide aussi, par requête). */
  coupureApres?: number;
  /** Appelée avant chaque événement (rang à partir de 1) : suspend un tour dans les tests. */
  attendre?: (rang: number) => Promise<void> | undefined;
  societe?: string;
}

type Brut = Evenement extends infer E ? (E extends { id: number } ? Omit<E, 'id'> : never) : never;
const erreur = (code: string, status: number, defined: boolean) => HttpResponse.json({ defined, code, status, message: code }, { status });
const entier = (v: string | null): number | undefined => (v !== null && /^\d+$/.test(v) ? Number(v) : undefined);

/** Faux serveur du chat : même flux que le serveur en mémoire (tour scripté), mémoire par message_id. */
export function creerHandlersChat(base: string, attendreReseau: () => Promise<void>, options: OptionsChatFaux = {}): HttpHandler[] {
  const texte = genererChat().messages.find((m) => m.societe === (options.societe ?? 'soc_a') && m.role === 'assistant')?.texte ?? 'Réponse d’essai';
  const flux = new Map<string, Promise<string[]>>();
  const arretes = new Set<string>();

  async function jouer(id: string): Promise<string[]> {
    const script: Brut[] = [{ type: 'tour.debut' }, { type: 'etape', etape: 'lecture' }, { type: 'texte', texte }];
    const sortie: string[] = [];
    for (const evt of script) {
      await options.attendre?.(sortie.length + 1);
      if (arretes.has(id)) break;
      sortie.push(encoderEvenement(sortie.length + 1, evt as Evenement));
    }
    sortie.push(encoderEvenement(sortie.length + 1, { type: 'tour.fin', issue: 'reponse', cout_micro_centimes: 0 } as Evenement));
    return sortie;
  }

  return [
    http.post(base + '/chat/messages', async ({ request }) => {
      await attendreReseau();
      const entete = EnTeteEcriture.safeParse({ 'idempotency-key': request.headers.get('idempotency-key') ?? undefined });
      const corps = DemandeEnvoi.safeParse(await request.json().catch(() => undefined));
      if (!entete.success || !corps.success || entete.data['idempotency-key'] !== corps.data.message_id) return erreur('BAD_REQUEST', 400, false);
      const id = corps.data.message_id;
      let complet = flux.get(id);
      if (!complet) flux.set(id, (complet = jouer(id)));
      const depart = entier(request.headers.get('last-event-id')) ?? 0;
      const coupure = entier(request.headers.get('x-coupure')) ?? options.coupureApres;
      const morceaux = (await complet).slice(depart, coupure === undefined ? undefined : depart + coupure);
      const encodeur = new TextEncoder();
      const corpsFlux = new ReadableStream<Uint8Array>({
        start(c) {
          for (const m of morceaux) c.enqueue(encodeur.encode(m));
          c.close();
        },
      });
      return new HttpResponse(corpsFlux, { headers: { 'content-type': 'text/event-stream' } });
    }),

    http.post(base + '/chat/tours/:id/arreter', async ({ request, params }) => {
      await attendreReseau();
      if (!EnTeteEcriture.safeParse({ 'idempotency-key': request.headers.get('idempotency-key') ?? undefined }).success) return erreur('BAD_REQUEST', 400, false);
      const id = String(params['id']);
      if (!flux.has(id)) return erreur('TOUR_INCONNU', 404, true);
      arretes.add(id);
      return HttpResponse.json({ body: { tour_id: id, arrete: true } });
    }),
  ];
}
