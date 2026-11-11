import { e50 } from '../../../../../packages/textes/src/ecrans/e50.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

export const route: DefinitionEcran = {
  id: 'e50',
  chemin: '/reglages/donnees',
  composant: Ecran,
  groupe: 'reglages',
  titre: e50.titre,
};
