import { e03 } from '../../../../../packages/textes/src/ecrans/e03.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

export const route: DefinitionEcran = {
  id: 'e03',
  chemin: '/documents/deposer',
  composant: Ecran,
  groupe: 'autre',
  titre: e03.titre,
};
