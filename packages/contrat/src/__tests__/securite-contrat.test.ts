import { oc } from '@orpc/contract';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { contrat } from '../routes.js';
import { ecrituresSansCle, listerRoutes, routesDInscription } from '../verifier-securite.js';

const avecCle = z.object({ headers: z.object({ 'idempotency-key': z.string().min(1) }) });
const sansCle = z.object({ headers: z.object({}) });
const proc = (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: `/${string}`, id: string, entree: z.ZodType, tags: string[] = []) =>
  oc.route({ method, path, operationId: id, tags, inputStructure: 'detailed' }).input(entree);
const ids = (l: { operationId: string }[]) => l.map((r) => r.operationId);

describe('securite du contrat', () => {
  it('toute-ecriture-exige-idempotency-key', () => {
    const routes = listerRoutes(contrat);
    expect(routes.length).toBeGreaterThan(0);
    expect(ids(ecrituresSansCle(routes))).toEqual([]);
  });

  it('aucune-route-d-inscription', () => {
    expect(ids(routesDInscription(listerRoutes(contrat)))).toEqual([]);
  });

  it('parcours-trouve-les-routes-connues', () => {
    const noms = ids(listerRoutes(contrat));
    expect(noms).toContain('creerEcriture');
    expect(noms).toContain('modifierEcriture');
    expect(listerRoutes({})).toEqual([]);
    expect(listerRoutes({ a: { b: 1, c: null, d: {} } })).toEqual([]);
    expect(ids(listerRoutes({ a: { b: { c: proc('GET', '/x', 'profonde', sansCle) } } }))).toEqual(['profonde']);
  });

  it('route-fictive-sans-en-tete-detectee', () => {
    const fictif = {
      a: { creer: proc('POST', '/a', 'sansEntete', sansCle), ok: proc('POST', '/b', 'avecEntete', avecCle), lire: proc('GET', '/c', 'lecture', sansCle) },
      vide: oc.route({ method: 'POST', path: '/d', operationId: 'sansEntree' }),
      sansHeaders: proc('DELETE', '/e', 'sansHeaders', z.object({})),
      optionnelle: proc('PATCH', '/f', 'cleOptionnelle', z.object({ headers: z.object({ 'idempotency-key': z.string().optional() }) })),
    };
    expect(ids(ecrituresSansCle(listerRoutes(fictif))).sort()).toEqual(['cleOptionnelle', 'sansEntete', 'sansEntree', 'sansHeaders']);
  });

  it('route-fictive-signup-detectee', () => {
    const fictif = { s: proc('POST', '/Sign-Up', 'a', avecCle), o: proc('POST', '/x', 'Inscription', avecCle), p: proc('POST', '/mot-de-passe', 'b', avecCle), u: proc('POST', '/SignUp', 'c', avecCle), n: proc('POST', '/ecritures', 'neutre', avecCle) };
    expect(ids(routesDInscription(listerRoutes(fictif))).sort()).toEqual(['Inscription', 'a', 'b', 'c']);
    expect(routesDInscription([])).toEqual([]);
  });

  it('etiquette-sans-effet-refusee-hors-post', () => {
    const t = ['sans-effet'];
    const fictif = {
      post: proc('POST', '/rech', 'recherche', sansCle, t),
      put: proc('PUT', '/p', 'putTague', sansCle, t),
      patch: proc('PATCH', '/q', 'patchTague', sansCle, t),
      del: proc('DELETE', '/r', 'delTague', sansCle, t),
    };
    expect(ids(ecrituresSansCle(listerRoutes(fictif))).sort()).toEqual(['delTague', 'patchTague', 'putTague']);
  });
});
