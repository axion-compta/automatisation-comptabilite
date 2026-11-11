import { implementerCorrection } from '../domaines/correction.js';
import { implementerDepot } from '../domaines/depot.js';
import type { OptionsModules, OptionsRouteur, OsContrat } from './types.js';

/** Implémentation des modules du lot 04 : dépôt et correction de pièces (état en mémoire, pièces fictives). */
export function implementerLot04(os: OsContrat, options: OptionsRouteur & OptionsModules) {
  void options;
  return { depot: implementerDepot(os), correction: implementerCorrection(os) };
}
