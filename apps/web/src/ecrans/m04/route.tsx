import { e25 } from '../../../../../packages/textes/src/ecrans/e25.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

/** Écran M04 : « La discussion » en plein écran (téléphone). */
export const route: DefinitionEcran = {
  id: 'm04',
  chemin: '/discussion',
  composant: Ecran,
  groupe: 'autre',
  titre: e25.mobile.titre,
};
