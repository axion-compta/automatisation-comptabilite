import { z } from 'zod';
import { contrat, contratChat } from './routes.js';

type Sch = z.ZodType;
interface Def {
  method: string;
  path: string;
  operationId: string;
  tags?: string[];
  successStatus?: number;
  inputSchema: Sch;
  errors: Record<string, { status: number }>;
}

function definitions(): Def[] {
  return Object.values({ ...contrat, ...contratChat }).flatMap((domaine) => Object.values(domaine)).map((r) => {
    const d = (r as unknown as { '~orpc': { route: { method: string; path: string; operationId: string; tags?: string[]; successStatus?: number }; inputSchema: Sch; errorMap: Record<string, { status: number }> } })['~orpc'];
    return { ...d.route, inputSchema: d.inputSchema, errors: d.errorMap ?? {} };
  });
}

const forme = (s: Sch): { shape: Record<string, Sch> } => s as unknown as { shape: Record<string, Sch> };

/** Routes qui lisent en POST (le texte est dans le corps) : seule exemption d'Idempotency-Key. */
export function routesLectureParPost(): string[] {
  return definitions().filter((d) => d.tags?.includes('lecture-par-post')).map((d) => d.operationId);
}

/** Une route d'écriture (hors GET) sans en-tête Idempotency-Key est une anomalie. */
export function routesEcritureSansEnTete(): string[] {
  return definitions()
    .filter((d) => d.method !== 'GET' && !d.tags?.includes('lecture-par-post'))
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
    for (const m of d.path.matchAll(/\{(\w+)\}/g)) parametres.push({ name: m[1], in: 'path', required: true, schema: { type: 'string', minLength: 1 } });
    const chemin = d.path;
    const reponses: Record<string, unknown> = { [String(d.successStatus ?? 200)]: { description: d.successStatus === 201 ? 'Créé' : 'OK' } };
    for (const e of Object.values(d.errors)) reponses[String(e.status)] = { description: e.status === 409 ? 'Conflit de version' : e.status === 422 ? 'Refusé' : 'Introuvable' };
    if (d.tags?.includes('flux:evenements')) reponses['200'] = { description: 'Flux d\'événements', content: { 'text/event-stream': { schema: { type: 'string' } } } };
    (paths[chemin] ??= {})[d.method.toLowerCase()] = {
      operationId: d.operationId,
      ...(d.tags ? { tags: d.tags } : {}),
      parameters: parametres,
      ...(s['body'] ? { requestBody: { required: true, content: { 'application/json': { schema: z.toJSONSchema(s['body']) } } } } : {}),
      responses: reponses,
    };
  }
  return { openapi: '3.1.0', info: { title: 'Contrat Axion', version: '0.0.0' }, paths };
}
