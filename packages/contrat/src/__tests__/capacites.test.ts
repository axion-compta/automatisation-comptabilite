import { describe, expect, it } from 'vitest';
import { Capacite, ReponseCapacites } from '../domaines/capacites.js';
import { PREFIXE_ROUTES_SOCIETE } from '../prefixe-routes.js';
import { contrat } from '../routes.js';
import { genererOpenapi, routesEcritureSansEnTete } from '../openapi.js';

type Interne = { route: { method: string; path: string; operationId: string }; errorMap: Record<string, { status: number }> };
const interne = (contrat.capacites.lireCapacites as unknown as { '~orpc': Interne })['~orpc'];

describe('contrat : capacités', () => {
  it('contrat-route-get-sans-idempotence', () => {
    expect(interne.route.method).toBe('GET');
    expect(interne.route.operationId).toBe('lireCapacites');
    expect(interne.route.path).toBe(PREFIXE_ROUTES_SOCIETE + '/moi/capacites');
    expect(interne.errorMap.NON_AUTHENTIFIE?.status).toBe(401);
    expect(routesEcritureSansEnTete()).not.toContain('lireCapacites');
    const op = (genererOpenapi() as { paths: Record<string, { get?: { operationId: string } }> }).paths[PREFIXE_ROUTES_SOCIETE + '/moi/capacites'];
    expect(op?.get?.operationId).toBe('lireCapacites');
  });

  it('schemas-exportes', () => {
    expect(Capacite.safeParse({ action: 'lire', permis: true }).success).toBe(true);
    expect(Capacite.safeParse({ action: 'saisir', permis: false, raison_code: 'role_lecture', raison_texte: 'Phrase.' }).success).toBe(true);
    expect(Capacite.safeParse({ action: '', permis: true }).success).toBe(false);
    expect(Capacite.safeParse({ action: 'lire', permis: 'oui' }).success).toBe(false);
    expect(ReponseCapacites.safeParse({ body: [{ action: 'lire', permis: true }] }).success).toBe(true);
    expect(ReponseCapacites.safeParse({ body: 'x' }).success).toBe(false);
  });
});
