import { describe, expect, it } from 'vitest';
import { contrat } from '../../../../../packages/contrat/src/routes.js';
import { listerRoutes, type RouteLue } from '../../../../../packages/contrat/src/verifier-securite.js';
import { ROLES } from '../../../../../packages/noyau/src/securite/types.js';
import { cleDe, genererCas, routesSansTest } from './generateur.js';

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
  });

  it('T-ISO-1-zero-200', () => {
    expect(cas).toHaveLength(routes.length * ROLES.length * 3);
    expect(ROLES).toHaveLength(6);
    const ouverts = cas.filter((c) => c.verdict.ok).map((c) => c.cle);
    expect(ouverts).toEqual([]);
    for (const c of cas) {
      expect(c.verdict.ok === false && [400, 404]).toContain(c.verdict.ok === false ? c.verdict.statut : 0);
    }
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
