import { n04 } from '../../../../../packages/textes/src/ecrans/n04.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

export const route: DefinitionEcran = {
  id: 'n04',
  chemin: '/reglages/entreprise/comptes',
  composant: Ecran,
  groupe: 'reglages',
  titre: n04.titre,
};
