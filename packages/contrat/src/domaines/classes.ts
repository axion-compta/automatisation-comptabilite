import { CLASSES_ACTION, type ClasseAction } from '../../../noyau/src/abonnement/types.js';

export type RouteClassee = { methode: string; chemin: string; operationId: string; classe: ClasseAction };
type Route = { method?: string; path?: string; operationId?: string; tags?: readonly string[] };

const PREFIXE = 'acces:';

function classeDeLaRoute(route: Route): ClasseAction {
  const etiquettes = (route.tags ?? []).filter((t) => t.startsWith(PREFIXE));
  if (etiquettes.length > 1) throw new Error('etiquette_acces_multiple:' + (route.operationId ?? route.path));
  const [e] = etiquettes;
  if (e === undefined) return route.method === undefined || route.method === 'GET' ? 'lecture' : 'ecriture';
  const classe = e.slice(PREFIXE.length);
  if (!(CLASSES_ACTION as readonly string[]).includes(classe)) throw new Error('etiquette_acces_inconnue:' + e);
  return classe as ClasseAction;
}

/** Classe de chaque route du contrat (récursif). Sans étiquette : GET lecture, autres méthodes écriture. */
export function classesDesRoutes(contrat: unknown): RouteClassee[] {
  const sortie: RouteClassee[] = [];
  const parcourir = (n: unknown): void => {
    if (n === null || typeof n !== 'object') return;
    const interne = (n as { '~orpc'?: { route?: Route } })['~orpc'];
    if (interne?.route) {
      const r = interne.route;
      sortie.push({ methode: r.method ?? 'GET', chemin: r.path ?? '', operationId: r.operationId ?? '', classe: classeDeLaRoute(r) });
      return;
    }
    Object.values(n).forEach(parcourir);
  };
  parcourir(contrat);
  return sortie;
}

const segments = (c: string) => c.split('/').filter((s) => s !== '');

function correspond(modele: string, chemin: string): boolean {
  const a = segments(modele);
  const b = segments(chemin);
  return a.length === b.length && a.every((s, i) => (s.startsWith('{') && s.endsWith('}') ? true : s === b[i]));
}

/** Classe d'une requête ; route inconnue = `ecriture` (fermé par défaut). Les paramètres `{id}` sont reconnus. */
export function classeDe(liste: readonly RouteClassee[], methode: string, chemin: string): ClasseAction {
  const m = methode.toUpperCase();
  const trouvee = liste.find((r) => r.methode.toUpperCase() === m && correspond(r.chemin, chemin));
  return trouvee?.classe ?? 'ecriture';
}
