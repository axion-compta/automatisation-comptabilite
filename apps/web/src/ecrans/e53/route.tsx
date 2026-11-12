import { e53 } from '../../../../../packages/textes/src/ecrans/e53.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

/** Écran E53 : « Mon abonnement ». */
export const route: DefinitionEcran = {
  id: 'e53',
  chemin: '/reglages/abonnement',
  composant: Ecran,
  groupe: 'reglages',
  titre: e53.titre,
};
