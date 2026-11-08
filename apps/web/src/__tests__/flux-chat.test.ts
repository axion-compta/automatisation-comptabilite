// @vitest-environment jsdom
// Fiche L05-T49 : flux d'un message par fetch, reprise, arrêt, appliquer une proposition.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { appliquerProposition, arreterTour, ecouterTour, ErreurLecture } from '../api.js';
import { encoderEvenement } from '../../../../packages/contrat/src/chat/flux.js';
import type { DemandeMessage, Evenement } from '../../../../packages/contrat/src/chat/evenements.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const DEMANDE: DemandeMessage = { message_id: 'msg-0001', conversation_id: 'conv-0001', texte: 'Bonjour', puces: [], canal: 'clavier' };
const EVTS = [{ type: 'tour.debut' }, { type: 'texte', texte: 'Salut' }, { type: 'tour.fin', issue: 'reponse', cout_micro_centimes: 0 }] as unknown as Evenement[];
const SSE = EVTS.map((e, i) => encoderEvenement(i + 1, e));
const flux = (morceaux: string[], fin: 'ferme' | 'panne' | 'pendu' = 'ferme') => {
  const enc = new TextEncoder();
  const reste = [...morceaux];
  return new Response(
    new ReadableStream<Uint8Array>({
      pull(c) {
        const m = reste.shift();
        if (m !== undefined) c.enqueue(enc.encode(m));
        else if (fin === 'ferme') c.close();
        else if (fin === 'panne') c.error(new Error('coupure'));
        else return new Promise(() => undefined);
      },
    }),
    { headers: { 'content-type': 'text/event-stream' } },
  );
};
const serveur = (reponse: () => Response | Promise<Response>) => {
  const appels: Array<{ url: string; init: RequestInit }> = [];
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => (appels.push({ url, init }), Promise.resolve(reponse())));
  return appels;
};
const ecouter = (o: { dernierId?: number; signal?: AbortSignal } = {}) => {
  const recus: Evenement[] = [];
  return ecouterTour(DEMANDE, { surEvenement: (e) => recus.push(e), ...o }).then((r) => ({ ...r, ids: recus.map((e) => e.id) }));
};
const cle = (a: { init: RequestInit }, nom: string) => (a.init.headers as Record<string, string>)[nom];
const code = async (p: Promise<unknown>) => p.then(() => 'ok', (e: ErreurLecture) => [e.statut, e.code]);

describe('flux du chat par fetch', () => {
  it('flux-complet', async () => {
    const appels = serveur(() => flux(SSE));
    expect(await ecouter()).toEqual({ dernierId: 3, fin: 'tour_fini', ids: [1, 2, 3] });
    expect(appels[0]?.init.method).toBe('POST');
    expect(appels[0]?.url).toContain('/chat/messages');
    expect(cle(appels[0]!, 'idempotency-key')).toBe('msg-0001');
    expect(cle(appels[0]!, 'accept')).toBe('text/event-stream');
    expect(cle(appels[0]!, 'last-event-id')).toBeUndefined();
  });

  it('morceaux-coupes', async () => {
    const tout = SSE.join('');
    serveur(() => flux([tout.slice(0, 7), tout.slice(7, 40), tout.slice(40)]));
    expect((await ecouter()).ids).toEqual([1, 2, 3]);
  });

  it('coupure-puis-reprise', async () => {
    let n = 0;
    const appels = serveur(() => (n++ === 0 ? flux(SSE.slice(0, 2), 'panne') : flux(SSE)));
    const premier = await ecouter();
    expect(premier).toMatchObject({ dernierId: 2, fin: 'coupe', ids: [1, 2] });
    const suite = await ecouter({ dernierId: premier.dernierId });
    expect(cle(appels[1]!, 'last-event-id')).toBe('2');
    expect(suite).toMatchObject({ dernierId: 3, fin: 'tour_fini', ids: [3] });
  });

  it('arret-par-signal', async () => {
    vi.useFakeTimers();
    serveur(() => flux(SSE.slice(0, 1), 'pendu'));
    const stop = new AbortController();
    const fini = ecouter({ signal: stop.signal });
    await vi.advanceTimersByTimeAsync(100);
    stop.abort();
    const delai = new Promise((res) => setTimeout(() => res('trop long'), 500));
    const course = Promise.race([fini, delai]);
    await vi.advanceTimersByTimeAsync(499);
    expect(await course).toMatchObject({ fin: 'arrete', ids: [1] });
  });

  it('reponse-400', async () => {
    serveur(() => new Response('{}', { status: 400 }));
    expect(await code(ecouter())).toEqual([400, 'reponse_invalide']);
  });

  it('reponse-500-serveur', async () => {
    serveur(() => new Response('', { status: 500 }));
    expect(await code(ecouter())).toEqual([500, 'serveur']);
  });

  it('corps-vide', async () => {
    serveur(() => new Response(null, { status: 200 }));
    expect(await ecouter()).toEqual({ dernierId: 0, fin: 'coupe', ids: [] });
  });

  it('evenement-inconnu-ignore', async () => {
    serveur(() => flux([SSE[0]!, 'id: 2\nevent: bidule\ndata: {"id":2,"type":"bidule"}\n\n', SSE[1]!, SSE[2]!]));
    expect((await ecouter()).ids).toEqual([1, 2, 3]);
  });

  it('arreter-tour-appelle-la-route', async () => {
    const appels = serveur(() => Response.json({ tour_id: 'msg-0001', arrete: true }));
    await arreterTour('msg-0001');
    expect([appels[0]?.init.method, appels[0]?.url]).toEqual(['POST', location.origin + '/chat/tours/msg-0001/arreter']);
    expect(cle(appels[0]!, 'idempotency-key')).toHaveLength(36);
  });

  const PROPOSITION = { id: 'p1', outil: 'proposer_validation', niveau: 'B', etat: 'appliquee', nombre_objets: 1, cree_le: '2026-01-01T10:00:00Z', expire_le: '2026-01-01T11:00:00Z' };
  it('appliquer-envoie-la-cle', async () => {
    const appels = serveur(() => Response.json(PROPOSITION));
    expect(await appliquerProposition('p1', 'cle-appliquer-1')).toMatchObject({ id: 'p1', etat: 'appliquee' });
    expect(cle(appels[0]!, 'idempotency-key')).toBe('cle-appliquer-1');
    expect(appels[0]?.url).toBe(location.origin + '/chat/propositions/p1/appliquer');
  });

  it('appliquer-403-409-423', async () => {
    for (const [statut, attendu] of [[403, 'acces_refuse'], [409, 'conflit'], [423, 'verrouille']] as const) {
      serveur(() => Response.json({ code: 'x' }, { status: statut }));
      expect(await code(appliquerProposition('p1', 'cle-appliquer-1'))).toEqual([statut, attendu]);
    }
  });
});
