import { pagesPubliques } from '../../../../../packages/textes/src/ecrans/pages-publiques.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

/** Pages publiques « Informations », accessibles sans connexion. */
export const route: DefinitionEcran = {
  id: 'informations',
  chemin: '/informations',
  composant: Ecran,
  groupe: 'autre',
  titre: pagesPubliques.titre,
};
