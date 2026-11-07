// Garde par classe d'action : on ne coupe jamais l'accès aux données, seulement le travail des agents.
import { CLASSES_ACTION, ETATS_ACCES } from './types.js';
import type { ClasseAction, EtatAcces, EtatVoulu } from './types.js';

export type Decision =
  | { permis: true }
  | { permis: false; code: 'etat_acces'; raison: 'etat' | 'fonction_non_permise' | 'valeur_inconnue' };

const ETATS_ECRITURE: readonly EtatAcces[] = ['ESSAI', 'ACTIF', 'DELAI_DE_GRACE'];
const CLASSES_BORNEES: readonly ClasseAction[] = ['lecture', 'ecriture', 'agent'];
const CLASSES_ETAT: readonly ClasseAction[] = ['ecriture', 'agent'];

const refus = (raison: 'etat' | 'fonction_non_permise' | 'valeur_inconnue'): Decision => ({
  permis: false,
  code: 'etat_acces',
  raison,
});

export function autoriser(
  etat: EtatAcces,
  classe: ClasseAction,
  fonction?: string,
  droitsUsage?: readonly string[],
): Decision {
  if (!ETATS_ACCES.includes(etat) || !CLASSES_ACTION.includes(classe)) return refus('valeur_inconnue');
  if (CLASSES_ETAT.includes(classe) && !ETATS_ECRITURE.includes(etat)) return refus('etat');
  if (
    fonction !== undefined &&
    Array.isArray(droitsUsage) &&
    CLASSES_BORNEES.includes(classe) &&
    !droitsUsage.includes(fonction)
  ) {
    return refus('fonction_non_permise');
  }
  return { permis: true };
}

// Fermé par défaut : seul un booléen faux autorise l'envoi.
export function envoiPermis(voulu: EtatVoulu): boolean {
  return voulu.arretEnvois === false;
}
