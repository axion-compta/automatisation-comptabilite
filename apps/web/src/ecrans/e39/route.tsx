import { e39 } from '../../../../../packages/textes/src/ecrans/e39.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

export const route: DefinitionEcran = {
  id: 'e39',
  chemin: '/demarrage/recapitulatif',
  composant: Ecran,
  groupe: 'autre',
  titre: e39.titre,
};
