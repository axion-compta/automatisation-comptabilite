import { e44 } from '../../../../../packages/textes/src/ecrans/e44.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

export const route: DefinitionEcran = {
  id: 'e44',
  chemin: '/reglages/entreprise/tiers',
  composant: Ecran,
  groupe: 'reglages',
  titre: e44.titre,
};
