import { e07 } from '../../../../../packages/textes/src/ecrans/e07.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

export const route: DefinitionEcran = {
  id: 'e07',
  chemin: '/documents',
  composant: Ecran,
  groupe: 'menu',
  titre: e07.titre,
};
