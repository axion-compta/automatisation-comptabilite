// Décision d'une action : permission du jeton, matrice, séparation des tâches, mode, personnel Axion.
// Le premier refus trouvé gagne (ordre fixe).
import { caseMatrice } from './matrice.js';
import {
  ACTIONS_ECRITURE, ErreurSecurite, PERMISSION_DE_L_ACTION, estAction, estRole,
  type Action, type Raison, type Role,
} from './types.js';

export type ContexteAutorisation = {
  role: Role;
  permissions: readonly string[];
  demande5: boolean;
  separationTaches: boolean;
  personneId: string;
  mode?: { id: string; actionsRetirees: readonly Action[]; raison: Raison };
  perimetreRespecte?: boolean;
};
export type ObjetAutorisation = { auteurId?: string; gravite?: 'majeur' | 'bloquant' };
export type Decision = { permis: true } | { permis: false; raison: Raison };

const refus = (raison: Raison): Decision => ({ permis: false, raison });

export function autoriser(contexte: ContexteAutorisation, action: Action, objet?: ObjetAutorisation): Decision {
  if (contexte === null || typeof contexte !== 'object' || !estRole(contexte.role) || !estAction(action)) {
    throw new ErreurSecurite('argument_invalide');
  }
  if (!Array.isArray(contexte.permissions) || typeof contexte.demande5 !== 'boolean') {
    throw new ErreurSecurite('argument_invalide');
  }
  const { role } = contexte;
  const effective: Action = action === 'lever_majeur' && objet?.gravite === 'bloquant' ? 'lever_bloquant' : action;
  const refusRole: Raison = role === 'lecture' ? 'role_lecture' : 'role_insuffisant';

  if (role === 'personnel_axion' && ACTIONS_ECRITURE.includes(effective)) {
    return refus('personnel_axion_lecture_seule');
  }
  if (!contexte.permissions.includes(PERMISSION_DE_L_ACTION[effective])) return refus(refusRole);
  const c = caseMatrice(role, effective, { demande5: contexte.demande5 });
  if (c === 'N') return refus(refusRole);
  if (c === 'M' && contexte.perimetreRespecte !== true) return refus('perimetre_expert');
  if (c === 'sep' && contexte.separationTaches && objet?.auteurId === contexte.personneId) {
    return refus('separation_taches');
  }
  if (contexte.mode?.actionsRetirees.includes(effective)) return refus(contexte.mode.raison);
  return { permis: true };
}
