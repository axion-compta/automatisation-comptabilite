import { implementerDepot } from '../domaines/depot.js';
import type { OptionsModules, OptionsRouteur, OsContrat } from './types.js';

/** Implémentation des modules du lot 04 : dépôt de pièces (état en mémoire, pièces fictives). */
export function implementerLot04(os: OsContrat, options: OptionsRouteur & OptionsModules) {
  void options;
  return { depot: implementerDepot(os) };
}
