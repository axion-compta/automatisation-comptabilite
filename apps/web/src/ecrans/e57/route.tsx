import { e57 } from '../../../../../packages/textes/src/ecrans/e57.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

export const route: DefinitionEcran = {
  id: 'e57',
  chemin: '/documents/controles',
  composant: Ecran,
  groupe: 'menu',
  titre: e57.titre,
};
