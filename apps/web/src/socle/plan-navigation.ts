// Plan de navigation calculé : les écrans viennent de ecrans.ts, les entrées de menu de menu.ts (aucune liste recopiée).
// Un clic = un lien suivi depuis l'accueil. Entrée de la barre du bas ou du menu de bureau : 1 clic ; panneau « Plus » seul : 2 clics.
// Le bouton « Discuter » de la barre du bas mène à la discussion en 1 clic.
// Un écran dont le chemin prolonge celui d'une liste (« /documents » → « /documents/piece ») est atteint par cette liste : +1 clic.
import type { DefinitionEcran } from './ecrans.js';
import { CHEMIN_DISCUSSION } from './Coque.js';
import { BARRE_MOBILE, MENU_BUREAU, MENU_PLUS } from './menu.js';

export type NoeudPlan = {
  chemin: string;
  /** Identifiant de l'écran ou de l'entrée de menu ; null pour l'accueil. */
  id: string | null;
  /** Clics depuis l'accueil ; null = aucun chemin d'accès depuis le menu. */
  distance: number | null;
  /** Chemin du nœud qui mène ici ; null pour l'accueil, les entrées de menu et les écrans hors menu. */
  parent: string | null;
};

export type PlanNavigation = { noeuds: NoeudPlan[]; horsMenu: string[] };

const ACCUEIL = '/';

function parentDe(chemin: string, candidats: readonly string[]): string | null {
  let meilleur: string | null = null;
  for (const c of candidats) {
    if (c !== ACCUEIL && chemin.startsWith(c + '/') && (meilleur === null || c.length > meilleur.length)) meilleur = c;
  }
  return meilleur;
}

export function planNavigation(ecrans: readonly DefinitionEcran[]): PlanNavigation {
  const parChemin = new Map<string, NoeudPlan>();
  parChemin.set(ACCUEIL, { chemin: ACCUEIL, id: null, distance: 0, parent: null });
  const direct = new Set([...BARRE_MOBILE, ...MENU_BUREAU].map((m) => m.chemin));
  for (const m of [...BARRE_MOBILE, ...MENU_BUREAU, ...MENU_PLUS]) {
    if (!parChemin.has(m.chemin)) parChemin.set(m.chemin, { chemin: m.chemin, id: m.id, distance: direct.has(m.chemin) ? 1 : 2, parent: null });
  }
  const discussion = { chemin: CHEMIN_DISCUSSION, id: null, distance: 1, parent: null };
  if (!parChemin.has(CHEMIN_DISCUSSION)) parChemin.set(CHEMIN_DISCUSSION, discussion);
  const ids = new Map<string, string>(ecrans.map((e) => [e.chemin, e.id]));
  for (const [chemin, noeud] of parChemin) {
    const id = ids.get(chemin);
    if (id !== undefined) noeud.id = id;
  }
  // Du chemin le plus court au plus long : le parent est toujours déjà calculé.
  const autres = ecrans.filter((e) => !parChemin.has(e.chemin)).sort((a, b) => a.chemin.length - b.chemin.length);
  const horsMenu: string[] = [];
  for (const e of autres) {
    const parent = parentDe(e.chemin, [...parChemin.keys()]);
    const pere = parent === null ? undefined : parChemin.get(parent);
    const distance = pere?.distance == null ? null : pere.distance + 1;
    parChemin.set(e.chemin, { chemin: e.chemin, id: e.id, distance, parent: distance === null ? null : parent });
  }
  for (const e of ecrans) if (parChemin.get(e.chemin)?.distance == null) horsMenu.push(e.id);
  return { noeuds: [...parChemin.values()], horsMenu };
}

/** Nœuds atteints en plus de `max` clics. Les écrans hors menu (distance inconnue) sont dans `horsMenu`, pas ici. */
export function ecransAuDela(plan: PlanNavigation, max: number): NoeudPlan[] {
  return plan.noeuds.filter((n) => n.distance !== null && n.distance > max);
}
