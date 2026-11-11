import { n08 } from '../../../../../packages/textes/src/ecrans/n08.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

/** Écran N08 : « Chercher ou demander » (recherche seulement). */
export const route: DefinitionEcran = {
  id: 'n08',
  chemin: '/recherche',
  composant: Ecran,
  groupe: 'menu',
  titre: n08.titre,
};
