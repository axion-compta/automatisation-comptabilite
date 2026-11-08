import { e56 } from '../../../../../packages/textes/src/ecrans/e56.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

export const route: DefinitionEcran = {
  id: 'e56',
  chemin: '/activite',
  composant: Ecran,
  groupe: 'menu',
  titre: e56.titre,
};
