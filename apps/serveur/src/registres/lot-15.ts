import { implementerAlertesResoudre, portDepuis, type PortAlertes } from '../domaines/alertes-resoudre.js';
import type { OptionsModules, OptionsRouteur, OsContrat } from './types.js';

declare module './types.js' {
  interface OptionsModules { alertesResoudre?: PortAlertes }
}

/** Implémentation des modules du lot 15 : résolution d'une alerte en un clic (lecture seule). */
export function implementerLot15(os: OsContrat, options: OptionsRouteur & OptionsModules) {
  return { alertesResoudre: implementerAlertesResoudre(os, options.alertesResoudre ?? portDepuis()) };
}
