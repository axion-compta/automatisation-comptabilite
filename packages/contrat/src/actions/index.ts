import registreJson from './registre.json' with { type: 'json' };

export type Action = {
  id: string;
  interrupteur: string;
  outil?: string;
  exclusion?: string;
};

export type Registre = {
  roles: { id: string; lecture_seule?: boolean }[];
  interrupteurs: Record<string, { actif_par_defaut: boolean }>;
  outils: { id: string; niveau: 'L' | 'E' }[];
  actions: Action[];
  matrice: Record<string, string[]>;
};

export const registre = registreJson as Registre;

/** Vrai si le rôle peut utiliser l'outil. Tout ce qui n'est pas déclaré est refusé. */
export function roleAutorise(r: Registre, role: string, outil: string): boolean {
  return Object.hasOwn(r.matrice, role) && Array.isArray(r.matrice[role]) && r.matrice[role].includes(outil);
}

/**
 * Vrai si le rôle peut exécuter l'action : outil déclaré et permis, et interrupteur de l'action actif.
 * Fermé par défaut (V3-PRI-013) : sans interrupteur dans `actifs`, tout est refusé.
 */
export function peutAgir(
  r: Registre,
  role: string,
  actionId: string,
  actifs: ReadonlySet<string> = new Set(),
): boolean {
  const action = r.actions.find((a) => a.id === actionId);
  if (!action?.outil) return false;
  if (!Object.hasOwn(r.interrupteurs, action.interrupteur)) return false;
  if (!actifs.has(action.interrupteur)) return false;
  return roleAutorise(r, role, action.outil);
}
