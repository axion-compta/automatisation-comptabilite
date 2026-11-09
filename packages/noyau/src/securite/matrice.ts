// PROPOSITION de matrice des droits (PLAN_V5_3 §3, D12) : une donnée, pas du code en dur (ROL-013).
// Les cases { siDemande5 } valent N tant que la console n'a pas accepté la demande 5.
import { ErreurSecurite, estAction, estRole, type Action, type Role } from './types.js';

export type Case = 'O' | 'N' | 'M' | 'sep' | 'propose' | 'active' | 'lecture_seule';
export type CaseOuDemande5 = Case | { siDemande5: Case };

const L = (
  administrateur: CaseOuDemande5, utilisateur: CaseOuDemande5, lecture: CaseOuDemande5,
  comptable: CaseOuDemande5, invite_externe: CaseOuDemande5, personnel_axion: CaseOuDemande5,
): Readonly<Record<Role, CaseOuDemande5>> =>
  Object.freeze({ administrateur, utilisateur, lecture, comptable, invite_externe, personnel_axion });
const D = (c: Case): CaseOuDemande5 => ({ siDemande5: c });

export const MATRICE_PROPOSEE: Readonly<Record<Action, Readonly<Record<Role, CaseOuDemande5>>>> = Object.freeze({
  lire: L('O', 'O', 'O', 'O', 'M', 'lecture_seule'),
  voir_piece_sensible: L('O', 'O', 'N', D('O'), 'N', 'N'),
  deposer: L('O', 'O', 'N', D('O'), 'M', 'N'),
  saisir: L('O', 'O', 'N', D('O'), 'M', 'N'),
  valider: L('O', 'sep', 'N', D('sep'), 'M', 'N'),
  lever_majeur: L('O', 'O', 'N', D('O'), 'M', 'N'),
  lever_bloquant: L('O', 'N', 'N', D('O'), 'M', 'N'),
  cloturer: L('O', 'N', 'N', D('O'), 'N', 'N'),
  exporter: L('O', 'O', 'N', 'O', 'M', 'N'),
  parametrer: L('O', 'N', 'N', 'N', 'N', 'N'),
  gerer_equipe: L('O', 'N', 'N', 'N', 'N', 'N'),
  commenter: L('O', 'O', 'N', 'O', 'O', 'N'),
  proposer_actions_automatiques: L('O', 'N', 'N', 'N', 'N', 'N'),
  assimiler_factures_autre_nom: L('propose', 'propose', 'N', 'active', 'N', 'N'),
} satisfies Record<Action, Readonly<Record<Role, CaseOuDemande5>>>);

export function caseMatrice(role: unknown, action: unknown, options: { demande5: boolean }): Case {
  if (!estRole(role) || !estAction(action)) throw new ErreurSecurite('argument_invalide');
  if (options === null || typeof options !== 'object' || typeof options.demande5 !== 'boolean') {
    throw new ErreurSecurite('argument_invalide');
  }
  const c = MATRICE_PROPOSEE[action][role];
  if (typeof c === 'string') return c;
  return options.demande5 ? c.siDemande5 : 'N';
}
