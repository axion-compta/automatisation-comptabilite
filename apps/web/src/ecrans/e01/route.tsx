import { e01 } from '../../../../../packages/textes/src/ecrans/e01.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

export const route: DefinitionEcran = {
  id: 'e01',
  chemin: '/mois',
  composant: Ecran,
  groupe: 'menu',
  titre: e01.titre,
};
