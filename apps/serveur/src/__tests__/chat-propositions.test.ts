import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';
import { creerServicePropositions, type OptionsPropositions } from '../domaines/chat-propositions.js';
import { AppelIa, DecisionIa, CHAMPS_INTERDITS } from '../../../../packages/contrat/src/chat/journal-ia.js';
import type { Niveau } from '../../../../packages/noyau/src/chat/types.js';
import { cheminSociete } from '../../../../packages/contrat/src/prefixe-routes.js';
const CHAT = cheminSociete('/chat').replace('{s}', 'soc_a');

const MIN = 60_000;
const DEBUT = Date.parse('2031-03-10T08:00:00.000Z');
const reglages = { validiteMs: 30 * MIN, toastMs: 10 * MIN, historiqueMs: 60 * MIN };
const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(() => Promise.all(apps.splice(0).map((a) => a.close())).then(() => undefined));

function monter(plus: Partial<OptionsPropositions> = {}, niveau: Niveau = 'B') {
  const horloge = { t: DEBUT };
  const service = creerServicePropositions({ acteur: 'personne', horloge: () => new Date(horloge.t).toISOString(), reglages, ...plus });
  service.ajouter({ id: 'prp-0001', outil: 'enregistrer_ecriture', niveau, cibles: ['ecr-1'], avant: { montant: 0 }, apres: { montant: 4200 } });
  const app = creerApp(undefined, { propositions: service });
  apps.push(app);
  return { app, horloge, service };
}
const cle = (c = 'cle-00001') => ({ 'idempotency-key': c });
const post = (app: ReturnType<typeof creerApp>, action: string, entetes: Record<string, string> = cle(), id = 'prp-0001') =>
  app.inject({ method: 'POST', url: `${CHAT}/propositions/${id}/${action}`, headers: entetes });
const cles = (v: unknown): string[] =>
  typeof v === 'object' && v !== null ? Object.entries(v).flatMap(([k, x]) => [k, ...cles(x)]) : [];

describe('serveur : propositions du chat en mémoire', () => {
  it('lire-une-proposition', async () => {
    const r = await monter().app.inject({ method: 'GET', url: CHAT + '/propositions/prp-0001' });
    expect(r.json().body).toMatchObject({ id: 'prp-0001', etat: 'proposee', niveau: 'B', nombre_objets: 1 });
  });
  it('appliquer-par-une-personne', async () => {
    const { app } = monter();
    const r = await post(app, 'appliquer');
    expect(r.statusCode).toBe(200);
    expect(r.json().body).toMatchObject({ etat: 'appliquee', applique_le: new Date(DEBUT).toISOString() });
    expect((await app.inject({ method: 'GET', url: CHAT + '/propositions/prp-0001' })).json().body.etat).toBe('appliquee');
  });
  it('meme-cle-meme-reponse', async () => {
    const { app, horloge } = monter();
    const a = await post(app, 'appliquer');
    horloge.t += MIN;
    const b = await post(app, 'appliquer');
    expect(b.statusCode).toBe(200);
    expect(b.body).toBe(a.body);
    expect((await post(app, 'appliquer', cle('autre-cle-1'))).statusCode).toBe(400);
  });
  it('compte-de-service-403', async () => {
    const { app } = monter({ acteur: 'compte_service' });
    const r = await post(app, 'appliquer', { ...cle(), 'x-acteur': 'personne' });
    expect(r.statusCode).toBe(403);
    expect(r.json().code).toBe('ACTEUR_NON_HUMAIN');
    expect((await app.inject({ method: 'GET', url: CHAT + '/propositions/prp-0001' })).json().body.etat).toBe('proposee');
  });
  it('expiree-409', async () => {
    const { app, horloge } = monter();
    horloge.t += reglages.validiteMs;
    const r = await post(app, 'appliquer');
    expect(r.statusCode).toBe(409);
    expect(r.json().code).toBe('PROPOSITION_EXPIREE');
  });
  it('niveau-i-423', async () => {
    const { app } = monter({}, 'I');
    const r = await post(app, 'appliquer');
    expect(r.statusCode).toBe(423);
    expect(r.json().code).toBe('NIVEAU_FERME');
  });
  it('annuler-dans-la-fenetre', async () => {
    const { app, horloge, service } = monter();
    await post(app, 'appliquer');
    horloge.t += reglages.toastMs + MIN;
    const r = await post(app, 'annuler', cle('cle-annul'));
    expect(r.statusCode).toBe(200);
    expect(r.json().body.etat).toBe('annulee');
    expect(service.etatObjet('prp-0001')).toEqual({ montant: 0 });
    expect((await post(app, 'annuler', cle('cle-annul'))).body).toBe(r.body);
  });
  it('annuler-trop-tard-409', async () => {
    const { app, horloge, service } = monter();
    await post(app, 'appliquer');
    horloge.t += reglages.historiqueMs;
    const r = await post(app, 'annuler', cle('cle-annul'));
    expect(r.statusCode).toBe(409);
    expect(r.json().code).toBe('ANNULATION_EXPIREE');
    expect(service.etatObjet('prp-0001')).toEqual({ montant: 4200 });
  });
  it('pourquoi-sans-texte', async () => {
    const r = await monter().app.inject({ method: 'GET', url: CHAT + '/propositions/prp-0001/pourquoi' });
    const corps = r.json().body;
    expect(DecisionIa.safeParse(corps.decision).success).toBe(true);
    expect(AppelIa.safeParse(corps.appel).success).toBe(true);
    expect(Object.keys(corps.decision)).toEqual(expect.arrayContaining(['demandeur', 'source_proposition', 'confiance']));
    expect(corps.appel).toHaveProperty('modele');
    expect(cles(corps).filter((k) => (CHAMPS_INTERDITS as readonly string[]).includes(k))).toEqual([]);
  });
  it('proposition-inconnue-404', async () => {
    const { app } = monter();
    for (const [methode, url] of [['GET', ''], ['GET', '/pourquoi'], ['POST', '/appliquer'], ['POST', '/annuler']] as const) {
      const r = await app.inject({ method: methode, url: `${CHAT}/propositions/nulle${url}`, headers: methode === 'POST' ? cle() : {} });
      expect(r.statusCode, url).toBe(404);
    }
  });
  it('cle-obligatoire-et-annulation-sans-application', async () => {
    const { app } = monter();
    expect((await post(app, 'appliquer', {})).statusCode).toBe(400);
    expect((await post(app, 'annuler')).statusCode).toBe(404);
  });
});
