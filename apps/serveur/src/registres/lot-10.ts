import { implementerVentesIndicateurs } from '../domaines/ventes-indicateurs.js';
import type { OptionsModules, OptionsRouteur, OsContrat } from './types.js';

/** Implémentation des modules du lot 10 : indicateurs du mois et suites de numéros des ventes. */
export function implementerLot10(os: OsContrat, options: OptionsRouteur & OptionsModules) {
  void options;
  return { ventesIndicateurs: implementerVentesIndicateurs(os) };
}
