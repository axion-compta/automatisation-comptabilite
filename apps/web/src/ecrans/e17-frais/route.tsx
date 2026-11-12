import { e17Frais } from '../../../../../packages/textes/src/ecrans/e17-frais.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

export const route: DefinitionEcran = {
  id: 'e17-frais',
  chemin: '/factures/frais/detail',
  composant: Ecran,
  groupe: 'autre',
  titre: e17Frais.titre,
};
