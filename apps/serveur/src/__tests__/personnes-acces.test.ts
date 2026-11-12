import { afterEach, describe, expect, it } from 'vitest';
import { creerApp } from '../app.js';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { JEU_SECURITE } from '../../../../packages/donnees-fictives/src/securite.js';
import { ISSUES_PAR_DROIT, type TypeDroit } from '../../../../packages/noyau/src/rgpd/types.js';
import type { IdentitePersonnes } from '../domaines/personnes-acces.js';

const DEBUT_MS = Date.parse('2031-03-10T08:00:00.000Z');
const SEC = 1000;
const REGLAGES = { reauthMaxMs: 600_000, attenteApresRecuperationMs: 300_000 }; // inventés
const RECENT = DEBUT_MS / SEC - 60;
const VIEUX = DEBUT_MS / SEC - 7200;
const apps: Array<ReturnType<typeof creerApp>> = [];
afterEach(() => Promise.all(apps.splice(0).map((a) => a.close())).then(() => undefined));

const personne = (id: string) => JEU_SECURITE.personnes.find((p) => p.id === id)!;
const identiteDe = (id: string, plus: Partial<IdentitePersonnes> = {}): IdentitePersonnes => ({
  role: personne(id).role as IdentitePersonnes['role'], permissions: [...personne(id).permissions], revendications: { acr: 'mfa', authTime: RECENT }, ...plus,
});
function monter(identite: IdentitePersonnes | undefined, plus: { sansReglages?: boolean; horloge?: () => string } = {}) {
  const app = creerApp(undefined, { exploitation: {
    horloge: plus.horloge ?? (() => new Date(DEBUT_MS).toISOString()), dateReference: '2031-03-10', reglagesPersonnes: { moisReponse: 2, joursRappel: 3 }, reglesConservation: [],
    ...(identite === undefined ? {} : { identite: { lire: () => identite } }), ...(plus.sansReglages ? {} : { reglagesConnexion: REGLAGES }),
  } });
  apps.push(app);
  return app;
}
type App = ReturnType<typeof creerApp>;
const cle = { 'idempotency-key': 'cle-essai-0001' };
const lister = (a: App, entetes: Record<string, string> = {}) => a.inject({ method: 'GET', url: '/personnes/demandes', headers: entetes });
const traiter = (a: App, id: string, issue = 'acces_produit') => a.inject({ method: 'POST', url: `/personnes/demandes/${id}/traitement`, headers: cle, payload: { issue } });
const enregistrer = (a: App, type: string) => a.inject({ method: 'POST', url: '/personnes/demandes', headers: { 'idempotency-key': 'cle-enreg-0001' }, payload: { type, recue_le: '2031-03-10' } });
const ROUTES: Array<(a: App) => Promise<{ statusCode: number; json: () => unknown }>> = [
  (a) => lister(a), (a) => enregistrer(a, 'rectification'), (a) => traiter(a, 'inconnue'),
  (a) => a.inject({ method: 'GET', url: '/personnes/recherche?nom=Camille' }),
];
const identifiants = async (a: App) => ((await lister(a)).json() as { body: Array<{ id: string; type: string; etat: string }> }).body;

describe('personnes : accès réservé à compta-parametrer', () => {
  it('chaque-route-sans-identite-401', async () => {
    expect(Object.keys(contrat.personnes)).toEqual(expect.arrayContaining(['listerDemandes', 'traiterDemande']));
    expect(ROUTES).toHaveLength(Object.keys(contrat.personnes).length);
    for (const route of ROUTES) {
      const r = await route(monter(undefined));
      expect(r.statusCode).toBe(401);
      expect(r.json()).toMatchObject({ defined: false, code: 'NON_AUTHENTIFIE', status: 401 });
    }
  });
  it('sans-permission-403-sur-chaque-route', async () => {
    for (const route of ROUTES) {
      const r = await route(monter(identiteDe('dir-a')));
      expect(r.statusCode).toBe(403);
      expect(r.json()).toMatchObject({ defined: false, code: 'PERMISSION_MANQUANTE' });
    }
  });
  it('personnel-axion-403-meme-avec-la-permission', async () => {
    const axion = identiteDe('axion-1', { permissions: [...personne('axion-1').permissions, 'compta-parametrer'] });
    for (const route of ROUTES) expect((await route(monter(axion))).statusCode).toBe(403);
  });
  it('refus-identique-demande-existante-ou-non', async () => {
    const connu = (await identifiants(monter(identiteDe('adms-a'))))[0]!.id;
    const a = monter(identiteDe('dir-a'));
    const [x, y] = [await traiter(a, connu), await traiter(a, 'demande-inconnue')];
    expect([x.statusCode, x.body]).toEqual([y.statusCode, y.body]);
    expect(x.statusCode).toBe(403);
  });
  it('administrateur-lit-la-liste', async () => {
    const r = await lister(monter(identiteDe('adms-a')));
    expect(r.statusCode).toBe(200);
    expect((r.json() as { body: unknown[] }).body.length).toBeGreaterThan(0);
  });
  it('acces-et-portabilite-exigent-reauth', async () => {
    for (const type of ['acces', 'portabilite'] as const) {
      let courante = identiteDe('adms-a');
      const a = creerApp(undefined, { exploitation: { horloge: () => new Date(DEBUT_MS).toISOString(), dateReference: '2031-03-10', reglagesPersonnes: { moisReponse: 2, joursRappel: 3 }, reglesConservation: [], identite: { lire: () => courante }, reglagesConnexion: REGLAGES } });
      apps.push(a);
      const id = ((await enregistrer(a, type)).json() as { body: { id: string } }).body.id;
      const avant = await identifiants(a);
      const issue = ISSUES_PAR_DROIT[type as TypeDroit][0]!;
      courante = identiteDe('adms-a', { revendications: { acr: 'mfa', authTime: VIEUX } });
      const r = await traiter(a, id, issue);
      expect(r.statusCode).toBe(401);
      expect(r.json()).toMatchObject({ defined: false, code: 'REAUTHENTIFICATION_REQUISE' });
      courante = identiteDe('adms-a');
      expect(await identifiants(a)).toEqual(avant);
      expect((await traiter(a, id, issue)).statusCode).toBe(200);
    }
  });
  it('rectification-sans-reauth', async () => {
    const vieux = identiteDe('adms-a', { revendications: { acr: 'mfa', authTime: VIEUX } });
    const id = (await identifiants(monter(vieux))).find((d) => d.type === 'rectification' && d.etat !== 'traitee')!.id;
    expect((await traiter(monter(vieux), id, 'rectification_faite')).statusCode).not.toBe(401);
    expect((await lister(monter(vieux))).statusCode).toBe(200);
  });
  it('sans-double-facteur-401', async () => {
    const r = await lister(monter(identiteDe('adms-a', { revendications: { authTime: RECENT } })));
    expect(r.statusCode).toBe(401);
    expect(r.json()).toMatchObject({ code: 'MFA_REQUIS' });
  });
  it('cas-limites-de-l-identite', async () => {
    const adms = identiteDe('adms-a');
    const cas: Array<[string, IdentitePersonnes, string?]> = [
      ['permissions vides', { ...adms, permissions: [] }],
      ['authTime absent', { ...adms, revendications: { acr: 'mfa' } }],
      ['authTime NaN', { ...adms, revendications: { acr: 'mfa', authTime: NaN } }],
      ['authTime Infinity', { ...adms, revendications: { acr: 'mfa', authTime: Infinity } }],
      ['authTime futur', { ...adms, revendications: { acr: 'mfa', authTime: DEBUT_MS / SEC + 3600 } }],
      ['récupération récente', { ...adms, derniereRecuperationMs: DEBUT_MS - 1 }],
    ];
    for (const [nom, identite] of cas) {
      const a = monter(identite);
      const id = (await identifiants(monter(adms))).find((d) => d.type === 'acces' && d.etat !== 'traitee')!.id;
      expect((await traiter(a, id)).statusCode, nom).toBeGreaterThanOrEqual(401);
      expect((await traiter(a, id)).statusCode, nom).toBeLessThan(500);
    }
    const nonEntier = monter(adms, { horloge: () => 'pas une date' });
    expect((await traiter(nonEntier, 'x')).statusCode).toBe(401);
    expect((await lister(nonEntier)).statusCode).toBe(401);
    expect((await lister(monter(undefined), { 'x-role': 'administrateur' })).statusCode).toBe(401);
    const sans = await lister(monter(adms, { sansReglages: true }));
    expect(sans.statusCode).toBe(503);
    expect(sans.json()).toMatchObject({ code: 'REGLAGE_ABSENT' });
  });
});
