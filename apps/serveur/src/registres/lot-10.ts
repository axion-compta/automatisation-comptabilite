import { implementerClients } from '../domaines/clients.js';
import { implementerVentesIndicateurs } from '../domaines/ventes-indicateurs.js';
import type { OptionsModules, OptionsRouteur, OsContrat } from './types.js';

/** Implémentation des modules du lot 10 : indicateurs du mois, suites de numéros des ventes et fiche client. */
export function implementerLot10(os: OsContrat, options: OptionsRouteur & OptionsModules) {
  void options;
  return { ventesIndicateurs: implementerVentesIndicateurs(os), clients: implementerClients(os) };
}
