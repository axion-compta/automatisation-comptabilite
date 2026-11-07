import type { z } from 'zod';

export interface RouteLue {
  chemin: string;
  methode: string;
  operationId: string;
  tags: string[];
  entree: z.ZodType | undefined;
}

type Forme = { shape?: Record<string, z.ZodType> };
type Proc = { route?: { method?: string; path?: string; operationId?: string; tags?: string[] }; inputSchema?: z.ZodType };

const estObjet = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Parcourt tout l'objet `contrat` (tous niveaux) et lit `~orpc` de chaque procédure. */
export function listerRoutes(contrat: unknown): RouteLue[] {
  const sortie: RouteLue[] = [];
  const visiter = (n: unknown, vus: Set<unknown>): void => {
    if (!estObjet(n) && typeof n !== 'function') return;
    if (vus.has(n)) return;
    vus.add(n);
    const p = (n as Record<string, unknown>)['~orpc'] as Proc | undefined;
    if (estObjet(p) && estObjet(p.route)) {
      const r = p.route;
      sortie.push({
        chemin: r.path ?? '',
        methode: (r.method ?? 'POST').toUpperCase(),
        operationId: r.operationId ?? '',
        tags: r.tags ?? [],
        entree: p.inputSchema,
      });
      return;
    }
    if (estObjet(n)) for (const v of Object.values(n)) visiter(v, vus);
  };
  visiter(contrat, new Set());
  return sortie;
}

function exigeCle(entree: z.ZodType | undefined): boolean {
  const headers = (entree as unknown as Forme | undefined)?.shape?.['headers'];
  const cle = (headers as unknown as Forme | undefined)?.shape?.['idempotency-key'];
  if (!headers || !cle) return false;
  return !cle.safeParse(undefined).success;
}

/** Routes d'écriture sans `Idempotency-Key` exigée. `sans-effet` n'exempte que les POST. */
export function ecrituresSansCle(routes: readonly RouteLue[]): RouteLue[] {
  return routes.filter((r) => {
    if (r.methode === 'GET') return false;
    if (r.methode === 'POST' && r.tags.includes('sans-effet')) return false;
    return !exigeCle(r.entree);
  });
}

const FRAGMENTS = ['inscri', 'register', 'signup', 'sign-up', 'mot-de-passe', 'password', 'oubli'];
const normaliser = (t: string): string => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function routesDInscription(routes: readonly RouteLue[]): RouteLue[] {
  return routes.filter((r) =>
    [r.chemin, r.operationId].some((t) => FRAGMENTS.some((f) => normaliser(t).includes(f))),
  );
}
