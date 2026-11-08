import { t05 } from '../../../../../packages/textes/src/ecrans/t05.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

export const route: DefinitionEcran = {
  id: 't05',
  chemin: '/reglages/preferences',
  composant: Ecran,
  groupe: 'reglages',
  titre: t05.titre,
};
