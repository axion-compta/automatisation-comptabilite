import type { ComponentType } from 'react';

export type DefinitionEcran = {
  id: string;
  chemin: string;
  composant: ComponentType;
  groupe: 'menu' | 'reglages' | 'autre';
  titre: string;
};

/** Lève une erreur si un id ou un chemin est en double, ou si un chemin ne commence pas par « / ». */
export function verifierEcrans(liste: readonly DefinitionEcran[]): void {
  const ids = new Set<string>();
  const chemins = new Set<string>();
  for (const e of liste) {
    if (!e.chemin.startsWith('/')) throw new Error('chemin invalide (doit commencer par /) : ' + e.chemin);
    if (ids.has(e.id)) throw new Error('id en double : ' + e.id);
    if (chemins.has(e.chemin)) throw new Error('chemin en double : ' + e.chemin);
    ids.add(e.id);
    chemins.add(e.chemin);
  }
}

/** Écrans déclarés dans apps/web/src/ecrans/<id>/route.tsx (chaque module exporte `route`). Sans écran : liste vide. */
export function ecransDecouverts(): DefinitionEcran[] {
  const modules = import.meta.glob<{ route: DefinitionEcran }>('../ecrans/*/route.tsx', { eager: true });
  const liste = Object.values(modules).map((m) => m.route);
  verifierEcrans(liste);
  return liste;
}
