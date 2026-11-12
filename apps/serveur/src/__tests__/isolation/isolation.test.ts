import { creerApp } from '../../app.js';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { contrat } from '../../../../../packages/contrat/src/routes.js';
import { listerRoutes, type RouteLue } from '../../../../../packages/contrat/src/verifier-securite.js';
import { ROLES, type Role } from '../../../../../packages/noyau/src/securite/types.js';
import { aUnObjet, appelerRoutes, arretsDeValidation, cleDe, estErreurClient, exemple, fournisseurDeRoles, genererCas, reponsesDeuxCents, routesSansTest, urlReelle, VALIDATION_NON_REMPLIE, type Appel } from './generateur.js';

const routes = listerRoutes(contrat);
const cas = genererCas(routes);
const INEXISTANT = { ok: false, statut: 404, corps: { code: 'introuvable' } };

describe('générateur d’isolation @isolation', () => {
  it('route-ajoutee-sans-test-rouge', () => {
    expect(routes.length).toBeGreaterThan(0);
    expect(routesSansTest(routes, cas)).toEqual([]);
    const nouvelle: RouteLue = { chemin: '/nouvelle-route', methode: 'GET', operationId: 'nouvelleRoute', tags: [], entree: undefined };
    // Une route ajoutée au contrat après la génération n'a aucun cas : la vérification la nomme.
    expect(routesSansTest([...routes, nouvelle], cas)).toEqual([cleDe(nouvelle)]);
    // Un rôle manquant sur une route suffit aussi.
    const sansLecture = cas.filter((c) => !(c.role === 'lecture' && c.route === cleDe(routes[0]!)));
    expect(routesSansTest(routes, sansLecture)).toEqual([cleDe(routes[0]!)]);
    const sansClient = cas.filter((c) => !(c.nature === 'autre-client' && c.role === 'comptable' && c.route === cleDe(routes[0]!)));
    expect(routesSansTest(routes, sansClient)).toEqual([cleDe(routes[0]!)]);
    const sansSociete = cas.filter((c) => !(c.nature === 'autre-societe' && c.route === cleDe(routes[0]!)));
    expect(routesSansTest(routes, sansSociete)).toEqual([cleDe(routes[0]!)]);
    expect(routesSansTest([], [])).toEqual([]);
  });

  it('T-ISO-1-zero-200', () => {
    expect(cas).toHaveLength(routes.length * ROLES.length * 3);
    expect(ROLES).toHaveLength(6);
    const ouverts = cas.filter((c) => c.verdict.ok).map((c) => c.cle);
    expect(ouverts).toEqual([]);
    for (const c of cas) {
      expect(c.verdict.ok).toBe(false);
      if (!c.verdict.ok) expect([400, 404]).toContain(c.verdict.statut);
    }
  });

  it('T-ISO-1-reponses-http-uniformes', async () => {
    // Pas une preuve d'isolation : creerApp ne laisse pas injecter d'objet étranger (défaut de fiche), donc les trois natures répondent « inconnu ».
    const vus: Role[] = [];
    const app = creerApp(undefined, { session: fournisseurDeRoles(vus) });
    const appels = await appelerRoutes(app, routes);
    await app.close();
    expect(appels.length).toBe(routes.filter(aUnObjet).length * ROLES.length * 3);
    expect(new Set(appels.map((a) => a.role))).toEqual(new Set(ROLES));
    // Le rôle de chaque appel est bien celui lu par le serveur.
    expect(vus).toEqual(appels.map((a) => a.role));
    // Les trois natures visent trois objets différents.
    for (const a of appels.filter((x) => x.nature !== 'inexistant')) {
      const ref = appels.find((x) => x.route === a.route && x.role === a.role && x.nature === 'inexistant')!;
      expect([a.route, a.url === ref.url]).toEqual([a.route, false]);
    }
    // Aucun appel ne s'arrête à la validation, sauf la liste figée.
    expect(arretsDeValidation(appels)).toEqual([...VALIDATION_NON_REMPLIE].sort());
    expect(reponsesDeuxCents(appels)).toEqual([]);
    for (const a of appels) expect([a.route, estErreurClient(a.statut)]).toEqual([a.route, true]);
    for (const a of appels.filter((x) => x.nature !== 'inexistant')) {
      const ref = appels.find((x) => x.route === a.route && x.role === a.role && x.nature === 'inexistant')!;
      expect([a.route, a.statut, a.corps]).toEqual([a.route, ref.statut, ref.corps]);
    }
  });

  it('bornes-des-statuts', () => {
    const rep = (statut: number): Appel => ({ route: 'r', role: 'lecture', nature: 'inexistant', url: 'u', statut, corps: '' });
    const cas2xx = [-1, 0, 199, 200, 299, 300, NaN].map((st) => reponsesDeuxCents([rep(st)]).length);
    expect(cas2xx).toEqual([0, 0, 0, 1, 1, 0, 0]);
    expect([-1, 0, 399, 400, 499, 500, NaN].map(estErreurClient)).toEqual([false, false, false, true, true, false, false]);
  });

  it('arrets-de-validation-detectes', () => {
    const rep = (route: string, statut: number, corps: string): Appel => ({ route, role: 'lecture', nature: 'inexistant', url: 'u', statut, corps });
    const mauvais = '{"code":"BAD_REQUEST"}';
    expect(arretsDeValidation([rep('b', 400, mauvais), rep('a', 400, mauvais), rep('a', 400, mauvais)])).toEqual(['a', 'b']);
    expect(arretsDeValidation([rep('a', 404, mauvais), rep('b', 400, '{"code":"AUTRE"}'), rep('c', NaN, mauvais), rep('d', 0, mauvais)])).toEqual([]);
  });

  it('exemple-minimal-lu-dans-le-schema', () => {
    const schema = z.object({ cle: z.string(), n: z.number(), ok: z.boolean(), type: z.enum(['a', 'b']), liste: z.array(z.string()), facultatif: z.string().optional() });
    expect(exemple(schema as never)).toEqual({ cle: 'cle-isolation-0001', n: 1, ok: true, type: 'a', liste: [] });
    expect(exemple(undefined)).toBeUndefined();
    expect(urlReelle({ chemin: '/exercices/{exercice}/alertes/{id}', methode: 'GET', operationId: 'x', tags: [], entree: undefined }, 'obj-1')).toBe('/exercices/seg-1/alertes/obj-1');
    expect(urlReelle({ chemin: '/api/compta/v1/societes/{s}/frais/{id}', methode: 'GET', operationId: 'x', tags: [], entree: undefined }, 'obj-1')).toBe('/api/compta/v1/societes/soc-1/frais/obj-1');
  });

  it('C01', () => {
    const inexistants = cas.filter((c) => c.nature === 'inexistant');
    const autresClients = cas.filter((c) => c.nature === 'autre-client');
    expect(autresClients.length).toBeGreaterThan(0);
    // Même corps pour un autre client et pour un objet inexistant : aucune fuite d'existence.
    for (const c of [...inexistants, ...autresClients]) expect(c.verdict).toEqual(INEXISTANT);
    // Autre société du même client : refus net, aucun effet.
    for (const c of cas.filter((x) => x.nature === 'autre-societe')) {
      expect(c.verdict).toEqual({ ok: false, statut: 400, corps: { code: 'societe_unique' } });
    }
  });
});
