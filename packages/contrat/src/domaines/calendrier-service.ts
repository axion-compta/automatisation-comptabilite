import { genererInterface } from '../../../donnees-fictives/src/interface.js';
import { calendrier, constatsDateIntrouvable, type EntreeEcheance } from '../../../noyau/src/alertes/calendrier.js';

export const SOCIETE_FICTIVE = 'soc-fictive';
export const EXERCICE_FICTIF = 'EX2026';
/** Nombre de comptables qui doivent valider un terme avant sa publication. */
export const VALIDATIONS_REQUISES = 3;

export type ModeVocabulaire = 'simple' | 'comptable';

/** Service en mémoire pur : échéances et termes fictifs (L15-T30), calculs du noyau (L15-T19). */
export function creerServiceCalendrier() {
  const profil = genererInterface().profils.pleine;
  const entrees: EntreeEcheance[] = profil.echeances.map((e) => ({
    id: e.id, societeId: SOCIETE_FICTIVE, exerciceId: EXERCICE_FICTIF, type: e.type, faite: e.faite,
    ...(e.dateLimite !== undefined ? { dateLimite: e.dateLimite } : {}),
    ...(e.aVerifier ? { statutParametre: 'a_verifier' as const } : {}),
    ...(e.sourceUrl !== undefined ? { sourceUrl: e.sourceUrl } : {}),
  }));
  return {
    /** `undefined` si l'exercice est inconnu ; lève ErreurCalendrier('ordre_inverse') si `du` > `au`. */
    lire(exercice: string, du: string, au: string) {
      if (exercice !== EXERCICE_FICTIF) return undefined;
      return calendrier(entrees, { societeId: SOCIETE_FICTIVE, exerciceId: exercice, du, au, jour: profil.jourDeReference });
    },
    constatsDateIntrouvable,
    vocabulaire(mode: ModeVocabulaire) {
      return profil.termes.map((t) => {
        const valide = t.validePar >= VALIDATIONS_REQUISES;
        const mot = mode === 'comptable' && valide ? t.comptable : t.simple;
        return mode === 'simple' && valide ? { code: t.code, mot, survol: t.comptable } : { code: t.code, mot };
      });
    },
  };
}
export type ServiceCalendrierComplet = ReturnType<typeof creerServiceCalendrier>;
