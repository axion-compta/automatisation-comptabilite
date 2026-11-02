import registreJson from './registre.json' with { type: 'json' };

export type Action = {
  id: string;
  interrupteur: string;
  outil?: string;
  exclusion?: string;
};

export type Registre = {
  roles: string[];
  interrupteurs: string[];
  outils: string[];
  actions: Action[];
  matrice: Record<string, string[]>;
};

export const registre: Registre = registreJson;

/** Vrai si le rôle peut utiliser l'outil. Tout ce qui n'est pas déclaré est refusé. */
export function roleAutorise(r: Registre, role: string, outil: string): boolean {
  return r.matrice[role]?.includes(outil) ?? false;
}

/** Vrai si le rôle peut exécuter l'action (action avec outil déclaré et outil permis). */
export function peutAgir(r: Registre, role: string, actionId: string): boolean {
  const action = r.actions.find((a) => a.id === actionId);
  if (!action?.outil) return false;
  return roleAutorise(r, role, action.outil);
}
