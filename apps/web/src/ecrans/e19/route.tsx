import { e19 } from '../../../../../packages/textes/src/ecrans/e19.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

export const route: DefinitionEcran = {
  id: 'e19',
  chemin: '/declarations/tva',
  composant: Ecran,
  groupe: 'menu',
  titre: e19.titre,
};
