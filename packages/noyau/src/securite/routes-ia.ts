import { ErreurSecurite } from './types.js';

export interface RouteIA {
  readonly fournisseur: string;
  readonly region: string;
  readonly mode: string;
  readonly decision: string;
  readonly ajouteeLe: string;
}

export interface DemandeRoute {
  readonly fournisseur: string;
  readonly region: string;
  readonly mode: string;
}

export type ResultatRoute =
  | { readonly autorisee: true }
  | { readonly autorisee: false; readonly evenement: { readonly type: 'ia.route_refusee' } & DemandeRoute };

const CHAMPS = ['fournisseur', 'region', 'mode', 'decision', 'ajouteeLe'] as const;
const FORME_DECISION = /^D[0-9]+$/;

function refuser(detail: string): never {
  throw new ErreurSecurite('argument_invalide', detail);
}

function dateValide(texte: string): boolean {
  const d = new Date(`${texte}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texte;
}

function cle(r: DemandeRoute): string {
  return JSON.stringify([r.fournisseur.toLowerCase(), r.region.toLowerCase(), r.mode.toLowerCase()]);
}

export function validerListeRoutes(donnee: unknown): readonly RouteIA[] {
  if (donnee === null || typeof donnee !== 'object') refuser('forme inattendue');
  const routes = (donnee as { routes?: unknown }).routes;
  if (!Array.isArray(routes)) refuser('routes : liste attendue');
  const vues = new Set<string>();
  return routes.map((brut: unknown, i: number) => {
    if (brut === null || typeof brut !== 'object') refuser(`routes[${i}] : objet attendu`);
    const o = brut as Record<string, unknown>;
    for (const champ of CHAMPS) {
      const v = o[champ];
      if (typeof v !== 'string' || v.trim() === '') refuser(`routes[${i}].${champ} : chaîne non vide attendue`);
    }
    const route = o as unknown as RouteIA;
    if (!FORME_DECISION.test(route.decision)) refuser(`routes[${i}].decision : forme D et chiffres attendue`);
    if (!dateValide(route.ajouteeLe)) refuser(`routes[${i}].ajouteeLe : date AAAA-MM-JJ attendue`);
    const k = cle(route);
    if (vues.has(k)) refuser(`routes[${i}] : doublon`);
    vues.add(k);
    return { fournisseur: route.fournisseur, region: route.region, mode: route.mode, decision: route.decision, ajouteeLe: route.ajouteeLe };
  });
}

export function routeAutorisee(liste: readonly RouteIA[], demande: DemandeRoute): ResultatRoute {
  const k = cle(demande);
  if (liste.some((r) => cle(r) === k)) return { autorisee: true };
  return {
    autorisee: false,
    evenement: { type: 'ia.route_refusee', fournisseur: demande.fournisseur, region: demande.region, mode: demande.mode },
  };
}
