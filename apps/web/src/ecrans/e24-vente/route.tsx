import { e24Vente } from '../../../../../packages/textes/src/ecrans/e24-vente.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

export const route: DefinitionEcran = {
  id: 'e24-vente',
  chemin: '/factures/vente',
  composant: Ecran,
  groupe: 'autre',
  titre: e24Vente.titre,
};
