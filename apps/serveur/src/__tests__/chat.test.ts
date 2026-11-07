import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';
import { creerServiceChat } from '../domaines/chat.js';
import { DecodeurFlux } from '../../../../packages/contrat/src/chat/flux.js';

const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((a) => a.close()));
});
const monter = (service = creerServiceChat()) => {
  const app = creerApp(undefined, { chat: service });
  apps.push(app);
  return app;
};
const demande = (id = 'msg-0001', plus: Record<string, unknown> = {}) => ({
  message_id: id,
  conversation_id: 'conv-0001',
  texte: 'Bonjour',
  puces: [],
  canal: 'clavier',
  ...plus,
});
const envoyer = (app: ReturnType<typeof monter>, corps: unknown, cle: string | null = 'msg-0001') =>
  app.inject({
    method: 'POST',
    url: '/chat/messages',
    headers: { 'content-type': 'application/json', ...(cle ? { 'idempotency-key': cle } : {}) },
    payload: JSON.stringify(corps),
  });
const lire = (texte: string) => new DecodeurFlux().pousser(texte);

describe('serveur : chat en mémoire', () => {
  it('message-rend-un-flux-ordonne', async () => {
    const r = await envoyer(monter(), demande());
    expect(r.statusCode).toBe(200);
    expect(r.headers['content-type']).toContain('text/event-stream');
    const evts = lire(r.body);
    expect(evts.map((e) => e.type)).toEqual(['tour.debut', 'etape', 'texte', 'tour.fin']);
    expect(evts.map((e) => e.id)).toEqual([1, 2, 3, 4]);
    expect(evts[3]).toMatchObject({ type: 'tour.fin', issue: 'reponse' });
  });

  it('meme-message-meme-flux', async () => {
    const service = creerServiceChat();
    const app = monter(service);
    const a = await envoyer(app, demande());
    const b = await envoyer(app, demande());
    expect(b.body).toBe(a.body);
    expect(service.appelsIa()).toBe(1);
    await envoyer(app, demande('msg-0002'), 'msg-0002');
    expect(service.appelsIa()).toBe(2);
  });

  it('texte-trop-long-refuse', async () => {
    const service = creerServiceChat();
    const r = await envoyer(monter(service), demande('msg-0001', { texte: 'x'.repeat(100000) }));
    expect(r.statusCode).toBe(400);
    expect((await envoyer(monter(service), demande('msg-0001', { texte: '' }))).statusCode).toBe(400);
    expect(service.appelsIa()).toBe(0);
  });

  it('champ-societe-refuse', async () => {
    const service = creerServiceChat();
    const app = monter(service);
    for (const champ of ['societe_id', 'societe', 'company_id']) {
      expect((await envoyer(app, demande('msg-0001', { [champ]: 'soc_b' }))).statusCode).toBe(400);
    }
    expect(service.appelsIa()).toBe(0);
  });

  it('arret-coupe-le-flux', async () => {
    let ouvrir: () => void = () => undefined;
    const porte = new Promise<void>((res) => (ouvrir = res));
    const service = creerServiceChat({ attendre: async (rang) => (rang === 3 ? porte : undefined) });
    const app = monter(service);
    const envoi = envoyer(app, demande());
    await service.tourOuvert('msg-0001');
    const arret = await app.inject({ method: 'POST', url: '/chat/tours/msg-0001/arreter', headers: { 'idempotency-key': 'arret-0001' } });
    expect(arret.statusCode).toBe(200);
    ouvrir();
    const evts = lire((await envoi).body);
    expect(evts.map((e) => e.type)).toEqual(['tour.debut', 'etape', 'tour.fin']);
    expect(evts[2]).toMatchObject({ issue: 'reponse' });
    expect(evts.map((e) => e.id)).toEqual([1, 2, 3]);
    expect(service.motifFin('msg-0001')).toBe('arret');
    expect(service.ecrituresAppliquees()).toBe(0);
    expect((await envoyer(app, demande())).body).toBe((await envoyer(app, demande())).body);
  });

  it('arret-tour-inconnu-404', async () => {
    const app = monter();
    const r = await app.inject({ method: 'POST', url: '/chat/tours/inconnu/arreter', headers: { 'idempotency-key': 'arret-0001' } });
    expect(r.statusCode).toBe(404);
  });

  it('idempotency-key-absente-400', async () => {
    const app = monter();
    expect((await envoyer(app, demande(), null)).statusCode).toBe(400);
    const r = await app.inject({ method: 'POST', url: '/chat/tours/msg-0001/arreter' });
    expect(r.statusCode).toBe(400);
    expect((await envoyer(app, demande('msg-0001'), 'autre-cle-1')).statusCode).toBe(400);
  });
});
