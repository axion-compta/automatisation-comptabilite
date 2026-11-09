import { e17 } from '../../../../../packages/textes/src/ecrans/e17.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

export const route: DefinitionEcran = {
  id: 'e17',
  chemin: '/factures/frais',
  composant: Ecran,
  groupe: 'autre',
  titre: e17.titre,
};
