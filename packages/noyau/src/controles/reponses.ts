// Traduction du garde-fou en réponses (statut et codes). Aucun texte affiché ici.
import type { RefusEcart, ResultatEcart, TraceEcartee, VerdictGardeFou } from './garde-fou.js';
import type { Gravite } from './moteur.js';

export interface BloquantReponse {
  regleId: string;
  objetId: string;
  messageCode: string;
}

export interface Reponse409 {
  statut: 409;
  corps: { code: 'controle_bloquant_ouvert'; bloquants: BloquantReponse[] };
}

export type CodeRefus = 'controle_non_ecartable' | RefusEcart;

export type ReponseEcart =
  | { statut: 200; corps: { trace: TraceEcartee } }
  | { statut: 401 | 403 | 422; corps: { code: CodeRefus } };

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** `null` si l'action est autorisée ; sinon 409 avec une entrée par bloquant, triée, sans doublon. */
export function reponseGardeFou(verdict: VerdictGardeFou): Reponse409 | null {
  if (verdict.autorise) return null;
  const uniques = new Map<string, BloquantReponse>();
  for (const b of verdict.bloquants) {
    uniques.set(JSON.stringify([b.regleId, b.objetId]), {
      regleId: b.regleId,
      objetId: b.objetId,
      messageCode: 'controle.' + b.regleId,
    });
  }
  const bloquants = [...uniques.values()].sort((a, b) => compare(a.regleId, b.regleId) || compare(a.objetId, b.objetId));
  return { statut: 409, corps: { code: 'controle_bloquant_ouvert', bloquants } };
}

export function reponseEcart(resultat: ResultatEcart): ReponseEcart {
  if (resultat.ok) return { statut: 200, corps: { trace: resultat.trace } };
  switch (resultat.code) {
    case 'non_ecartable':
      return { statut: 422, corps: { code: 'controle_non_ecartable' } };
    case 'permission_manquante':
      return { statut: 403, corps: { code: resultat.code } };
    case 'reauthentification_requise':
      return { statut: 401, corps: { code: resultat.code } };
    case 'motif_obligatoire':
    case 'auteur_obligatoire':
    case 'horodatage_anterieur':
      return { statut: 422, corps: { code: resultat.code } };
  }
}

/** Une décision par lot (règles C1 à C6) ne lève jamais un contrôle B. */
export function decisionParLotPeutLever(regleGravite: Gravite): boolean {
  return regleGravite !== 'B';
}
