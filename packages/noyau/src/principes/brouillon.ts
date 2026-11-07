// Brouillon d'abord et réponse unique à la modification d'une écriture validée (V3-PRI-005, V3-PRI-015).
// Codes seulement : aucune phrase ici.
import type { StatutEcriture } from '../ecritures/modele.js';

export const CANAUX = ['clic', 'chat', 'voix', 'import', 'assistant', 'expert', 'api'] as const;
export type Canal = (typeof CANAUX)[number];

const STATUTS: readonly string[] = ['brouillon', 'propose', 'valide'];
const STATUTS_EXERCICE: readonly string[] = ['ouvert', 'cloture'];

export class ErreurBrouillon extends Error {
  override name = 'ErreurBrouillon';
}

export type VerdictCreation = { ok: true } | { ok: false; statutHttp: 422; code: 'statut_initial_interdit' };

export type VerdictModification =
  | { ok: true }
  | {
      ok: false;
      statutHttp: 409;
      code: 'ecriture_validee';
      proposition: 'contre_passation';
      route: string;
    }
  | {
      ok: false;
      statutHttp: 423;
      code: 'periode_cloturee';
      proposition: 'contre_passation_periode_ouverte';
    };

function verifierStatut(statut: string): void {
  if (!STATUTS.includes(statut)) throw new ErreurBrouillon('Statut d’écriture inconnu : ' + String(statut));
}

/** Une écriture naît brouillon ou proposée, quel que soit le canal. */
export function statutCreationAutorise(statut: StatutEcriture): VerdictCreation {
  verifierStatut(statut);
  if (statut === 'valide') return { ok: false, statutHttp: 422, code: 'statut_initial_interdit' };
  return { ok: true };
}

/** Réponse unique à une modification : le canal ne la change jamais ; la clôture est prioritaire (423). */
export function reponseModification(
  ecriture: { id: string; statut: StatutEcriture },
  exercice: { statut: 'ouvert' | 'cloture' },
  canal: Canal,
): VerdictModification {
  if (typeof ecriture.id !== 'string' || ecriture.id === '') throw new ErreurBrouillon('Identifiant d’écriture vide');
  verifierStatut(ecriture.statut);
  if (!STATUTS_EXERCICE.includes(exercice.statut)) throw new ErreurBrouillon('Statut d’exercice inconnu');
  if (!CANAUX.includes(canal)) throw new ErreurBrouillon('Canal inconnu : ' + String(canal));
  if (ecriture.statut !== 'valide') return { ok: true };
  if (exercice.statut === 'cloture') {
    return { ok: false, statutHttp: 423, code: 'periode_cloturee', proposition: 'contre_passation_periode_ouverte' };
  }
  return {
    ok: false,
    statutHttp: 409,
    code: 'ecriture_validee',
    proposition: 'contre_passation',
    route: '/ecritures/' + encodeURIComponent(ecriture.id) + '/corriger',
  };
}
