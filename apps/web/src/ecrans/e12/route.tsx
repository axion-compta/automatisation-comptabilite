import { e12 } from '../../../../../packages/textes/src/ecrans/e12.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

export const route: DefinitionEcran = {
  id: 'e12',
  chemin: '/banque',
  composant: Ecran,
  groupe: 'menu',
  titre: e12.titre,
};
