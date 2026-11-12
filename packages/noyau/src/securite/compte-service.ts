// Profil « prestataire IA » d'un compte de service : lire et déposer seulement (V3-ROL-007).
// Fonctions pures : la liste fermée décide, jamais les permissions du jeton. Non branché.
import type { Session } from '../session/port.js';
import { ErreurSecurite, type Raison } from './types.js';

export const OPERATIONS_PRESTATAIRE_IA: readonly string[] = Object.freeze(['lire', 'deposer']);

export type LigneCompteServiceRefuse = {
  evenement: 'securite.compte_service_refuse';
  compte: string;
  operation: string;
  horodatage: string;
};
export type DecisionPrestataireIa =
  | { permis: true }
  | { permis: false; raison: Extract<Raison, 'role_insuffisant'>; ligne: LigneCompteServiceRefuse };

export function decisionPrestataireIa(
  session: Pick<Session, 'nature' | 'personneId'>, operation: string, horodatage: string,
): DecisionPrestataireIa {
  if (session === null || typeof session !== 'object' || session.nature !== 'service') {
    throw new ErreurSecurite('argument_invalide');
  }
  if (typeof operation === 'string' && OPERATIONS_PRESTATAIRE_IA.includes(operation)) return { permis: true };
  return {
    permis: false,
    raison: 'role_insuffisant',
    ligne: {
      evenement: 'securite.compte_service_refuse', compte: session.personneId, operation, horodatage,
    },
  };
}

const MASQUE = 'masque';

function copier(v: unknown, champs: ReadonlySet<string>): unknown {
  if (Array.isArray(v)) return v.map((x) => copier(x, champs));
  if (v !== null && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, champs.has(k) ? MASQUE : copier(x, champs)]),
    );
  }
  return v;
}

/** Copie profonde où chaque champ listé (à tout niveau) vaut « masque » ; l'objet reçu n'est jamais modifié. */
export function masquerPourPrestataire<T>(objet: T, champsSensibles: readonly string[]): T {
  return copier(objet, new Set(champsSensibles)) as T;
}
