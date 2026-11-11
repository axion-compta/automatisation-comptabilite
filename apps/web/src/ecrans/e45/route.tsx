import { e45 } from '../../../../../packages/textes/src/ecrans/e45.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

/** Écran E45 : « Mon entreprise ». */
export const route: DefinitionEcran = {
  id: 'e45',
  chemin: '/reglages/entreprise',
  composant: Ecran,
  groupe: 'reglages',
  titre: e45.titre,
};
