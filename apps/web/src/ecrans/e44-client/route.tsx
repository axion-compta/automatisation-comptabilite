import { e44Client } from '../../../../../packages/textes/src/ecrans/e44-client.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

export const route: DefinitionEcran = {
  id: 'e44-client',
  chemin: '/reglages/entreprise/client',
  composant: Ecran,
  groupe: 'reglages',
  titre: e44Client.titre,
};
