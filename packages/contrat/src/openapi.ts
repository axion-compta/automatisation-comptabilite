import { z } from 'zod';
import { contrat } from './routes.js';

type Sch = z.ZodType;
interface Def {
  method: string;
  path: string;
  operationId: string;
  inputSchema: Sch;
  errors: Record<string, { status: number }>;
}

function definitions(): Def[] {
  return Object.values(contrat.ecritures).map((r) => {
    const d = (r as unknown as { '~orpc': { route: { method: string; path: string; operationId: string }; inputSchema: Sch; errorMap: Record<string, { status: number }> } })['~orpc'];
    return { ...d.route, inputSchema: d.inputSchema, errors: d.errorMap ?? {} };
  });
}

const forme = (s: Sch): { shape: Record<string, Sch> } => s as unknown as { shape: Record<string, Sch> };

/** Une route d'écriture (hors GET) sans en-tête Idempotency-Key est une anomalie. */
export function routesEcritureSansEnTete(): string[] {
  return definitions()
    .filter((d) => d.method !== 'GET')
    .filter((d) => {
      const h = forme(d.inputSchema).shape['headers'];
      return !h || !('idempotency-key' in forme(h).shape);
    })
    .map((d) => d.operationId);
}

/** Paramètres de requête (query) tirés du schéma Zod : nom, obligatoire ou non, schéma JSON. */
export function parametresRequete(schema: Sch | undefined): unknown[] {
  if (!schema) return [];
  const objet = (schema instanceof z.ZodOptional ? schema.unwrap() : schema) as unknown as { shape?: Record<string, Sch> };
  return Object.entries(objet.shape ?? {}).map(([name, champ]) => {
    const json = z.toJSONSchema(champ) as Record<string, unknown>;
    delete json['$schema'];
    return { name, in: 'query', required: !champ.safeParse(undefined).success, schema: json };
  });
}

/** Document OpenAPI 3.1 déterministe (clés triées par construction). */
export function genererOpenapi(): object {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const d of definitions()) {
    const s = forme(d.inputSchema).shape;
    const parametres: unknown[] = [];
    if (s['headers']) parametres.push({ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', minLength: 8, maxLength: 128 } });
    if (d.method === 'GET') {
      parametres.push(...parametresRequete(s['query']));
    }
    if (d.path.includes('{id}')) parametres.push({ name: 'id', in: 'path', required: true, schema: { type: 'string', minLength: 1 } });
    const chemin = d.path;
    const reponses: Record<string, unknown> = { '200': { description: 'OK' } };
    for (const e of Object.values(d.errors)) reponses[String(e.status)] = { description: 'Conflit de version' };
    (paths[chemin] ??= {})[d.method.toLowerCase()] = {
      operationId: d.operationId,
      parameters: parametres,
      ...(s['body'] ? { requestBody: { required: true, content: { 'application/json': { schema: z.toJSONSchema(s['body']) } } } } : {}),
      responses: reponses,
    };
  }
  return { openapi: '3.1.0', info: { title: 'Contrat Axion', version: '0.0.0' }, paths };
}
