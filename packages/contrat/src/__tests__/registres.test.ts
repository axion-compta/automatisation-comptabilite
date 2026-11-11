import { oc } from '@orpc/contract';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { contratChat, contratSocle } from '../routes.js';
import { fusionnerOpenapi, genererOpenapiDe, routesEcritureSansEnTete, type Source } from '../openapi.js';
import { REGISTRES, contratModules } from '../registres/index.js';

const lecture = (operationId: string, path: `/${string}`) =>
  oc.route({ method: 'GET', path, inputStructure: 'detailed', operationId }).input(z.object({})).output(z.object({ body: z.string() }));
const ecriture = (operationId: string, path: `/${string}`, cle: boolean) =>
  oc
    .route({ method: 'POST', path, inputStructure: 'detailed', operationId })
    .input(z.object({ ...(cle ? { headers: z.object({ 'idempotency-key': z.string().min(8) }) } : {}), body: z.object({ nom: z.string() }) }))
    .output(z.object({ body: z.string() }));

const operations = (doc: object) =>
  Object.entries((doc as { paths: Record<string, Record<string, { operationId: string }>> }).paths).flatMap(([chemin, ops]) =>
    Object.entries(ops).map(([methode, o]) => ({ chemin, methode, id: o.operationId })),
  );

describe('registres par lot', () => {
  it('quinze lots, de 01 à 15', () => {
    expect(Object.keys(REGISTRES).sort()).toEqual(Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, '0')));
  });

  it('clés de modules disjointes entre elles, avec le socle et avec le chat', () => {
    const cles = Object.values(REGISTRES).flatMap((r) => Object.keys(r ?? {}));
    expect(new Set(cles).size).toBe(cles.length);
    expect(Object.keys(contratModules).sort()).toEqual([...cles].sort());
    const autres = new Set([...Object.keys(contratSocle), ...Object.keys(contratChat)]);
    expect(cles.filter((c) => autres.has(c))).toEqual([]);
  });

  it('operationId et couples (méthode, chemin) uniques sur le contrat complet', () => {
    const source = { ...contratSocle, ...contratModules, ...contratChat } as Source;
    const ops = operations(genererOpenapiDe(source));
    expect(new Set(ops.map((o) => o.id)).size).toBe(ops.length);
    expect(new Set(ops.map((o) => `${o.methode} ${o.chemin}`)).size).toBe(ops.length);
  });

  it('un module ajoute POST à côté du GET du socle : les deux restent', () => {
    const socle = genererOpenapiDe({ pieces: { lister: lecture('listerFictives', '/fictives') } });
    const module = genererOpenapiDe({ ajout: { creer: ecriture('creerFictive', '/fictives', true) } });
    const fusion = fusionnerOpenapi([socle, module]) as { paths: Record<string, Record<string, unknown>> };
    expect(Object.keys(fusion.paths['/fictives'] ?? {}).sort()).toEqual(['get', 'post']);
  });

  it('une méthode en double sur un même chemin est une erreur', () => {
    const a = genererOpenapiDe({ a: { lister: lecture('listerA', '/fictives') } });
    const b = genererOpenapiDe({ b: { lister: lecture('listerB', '/fictives') } });
    expect(() => fusionnerOpenapi([a, b])).toThrow(/méthode en double GET \/fictives/);
  });

  it('une route d’écriture de module sans en-tête Idempotency-Key est détectée', () => {
    const contratFictif = { moduleFictif: { sans: ecriture('ecrireSansCleFictive', '/fictives', false), avec: ecriture('ecrireAvecCleFictive', '/fictives-ok', true) } };
    expect(routesEcritureSansEnTete(contratFictif)).toEqual(['ecrireSansCleFictive']);
  });
});
