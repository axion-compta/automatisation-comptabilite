import { z } from 'zod';
import { contrat, contratChat, contratSocle } from './routes.js';
import { REGISTRES } from './registres/index.js';

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

const DESCRIPTIONS: Record<number, string> = { 403: 'Interdit', 409: 'Conflit de version', 412: 'Version périmée', 422: 'Refusé', 423: 'Fermé' };

/** Source de routes : domaines nommés, chacun un objet de routes. */
export type Source = Record<string, Record<string, unknown>>;
const complet = (): Source => ({ ...contrat, ...contratChat }) as Source;

function definitions(source: Source = complet()): Def[] {
  return Object.values(source).flatMap((domaine) => Object.values(domaine)).map((r) => {
    const d = (r as unknown as { '~orpc': { route: { method: string; path: string; operationId: string; tags?: string[]; successStatus?: number }; inputSchema: Sch; errorMap: Record<string, { status: number }> } })['~orpc'];
    return { ...d.route, inputSchema: d.inputSchema, errors: d.errorMap ?? {} };
  });
}

const forme = (s: Sch): { shape: Record<string, Sch> } => s as unknown as { shape: Record<string, Sch> };

/** Routes qui lisent en POST (le texte est dans le corps) : seule exemption d'Idempotency-Key. */
export function routesLectureParPost(source?: Source): string[] {
  return definitions(source).filter((d) => d.tags?.includes('lecture-par-post')).map((d) => d.operationId);
}

/** Une route d'écriture (hors GET) sans en-tête Idempotency-Key est une anomalie. */
export function routesEcritureSansEnTete(source?: Source): string[] {
  return definitions(source)
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
  return document(definitions({ ...contratSocle, ...contratChat } as Source));
}

type Paths = Record<string, Record<string, unknown>>;

/** Document OpenAPI d'un seul lot (registre du lot). */
export function genererOpenapiLot(nn: string): object {
  return document(definitions({ ...(REGISTRES[nn] as Source | undefined) }));
}

/** Socle, chat et tous les lots : fusion par chemin puis par méthode ; une méthode en double est une erreur. */
export function genererOpenapiComplet(): object {
  return fusionnerOpenapi([genererOpenapi(), ...Object.keys(REGISTRES).sort().map(genererOpenapiLot)]);
}

/** Document OpenAPI d'une source quelconque (utile aux tests et aux fragments). */
export function genererOpenapiDe(source: Source): object {
  return document(definitions(source));
}

/** Fusion par chemin puis par méthode ; une méthode en double sur un chemin est une erreur. */
export function fusionnerOpenapi(documents: object[]): object {
  const docs = documents as Array<{ paths: Paths }>;
  const paths: Paths = {};
  for (const doc of docs) {
    for (const [chemin, ops] of Object.entries(doc.paths)) {
      for (const [methode, op] of Object.entries(ops)) {
        const cible = (paths[chemin] ??= {});
        if (methode in cible) throw new Error(`OpenAPI : méthode en double ${methode.toUpperCase()} ${chemin}`);
        cible[methode] = op;
      }
    }
  }
  return { openapi: '3.1.0', info: { title: 'Contrat Axion', version: '0.0.0' }, paths: Object.fromEntries(Object.entries(paths).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) };
}

/** Un corps qui porte un fichier (format binary) est un corps multipart. */
const corpsMultipart = (corps: Sch): boolean => JSON.stringify(z.toJSONSchema(corps, { io: 'input', unrepresentable: 'any' })).includes('"format":"binary"');
const schemaCorps = (corps: Sch): unknown => (corpsMultipart(corps) ? z.toJSONSchema(corps, { io: 'input', unrepresentable: 'any' }) : z.toJSONSchema(corps));

function document(defs: Def[]): object {
  const paths: Paths = {};
  for (const d of defs) {
    const s = forme(d.inputSchema).shape;
    const parametres: unknown[] = [];
    if (s['headers']) parametres.push({ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', minLength: 8, maxLength: 128 } });
    for (const nom of ['if-match', 'x-personne']) if (s['headers'] && nom in forme(s['headers']).shape) parametres.push({ name: nom, in: 'header', required: true, schema: { type: 'string' } });
    if (d.method === 'GET') {
      parametres.push(...parametresRequete(s['query']));
    }
    for (const m of d.path.matchAll(/\{(\w+)\}/g)) parametres.push({ name: m[1], in: 'path', required: true, schema: { type: 'string', minLength: 1 } });
    const chemin = d.path;
    const reponses: Record<string, unknown> = { [String(d.successStatus ?? 200)]: { description: d.successStatus === 201 ? 'Créé' : 'OK' } };
    for (const e of Object.values(d.errors)) reponses[String(e.status)] = { description: DESCRIPTIONS[e.status] ?? 'Introuvable' };
    if (d.tags?.includes('flux:evenements')) reponses['200'] = { description: 'Flux d\'événements', content: { 'text/event-stream': { schema: { type: 'string' } } } };
    (paths[chemin] ??= {})[d.method.toLowerCase()] = {
      operationId: d.operationId,
      ...(d.tags ? { tags: d.tags } : {}),
      parameters: parametres,
      ...(s['body'] ? { requestBody: { required: true, content: { [corpsMultipart(s['body']) ? 'multipart/form-data' : 'application/json']: { schema: schemaCorps(s['body']) } } } } : {}),
      responses: reponses,
    };
  }
  return { openapi: '3.1.0', info: { title: 'Contrat Axion', version: '0.0.0' }, paths };
}
