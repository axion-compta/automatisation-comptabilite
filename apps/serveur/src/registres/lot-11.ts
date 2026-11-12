import { implementerFraisLectureIa } from '../domaines/frais-lecture-ia.js';
import type { OptionsModules, OptionsRouteur, OsContrat } from './types.js';

/** Implémentation des modules du lot 11 : lecture du ticket par l'IA (faux fournisseur). */
export function implementerLot11(os: OsContrat, options: OptionsRouteur & OptionsModules) {
  void options;
  return { fraisLectureIa: implementerFraisLectureIa(os) };
}
