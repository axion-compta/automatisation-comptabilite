import { n03 } from '../../../../../packages/textes/src/ecrans/n03.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

/** Écran N03 : « Mes années comptables ». */
export const route: DefinitionEcran = {
  id: 'n03',
  chemin: '/reglages/entreprise/annees',
  composant: Ecran,
  groupe: 'reglages',
  titre: n03.titre,
};
