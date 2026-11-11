import { e24Ventes } from '../../../../../packages/textes/src/ecrans/e24-ventes.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

export const route: DefinitionEcran = {
  id: 'e24-ventes',
  chemin: '/factures/ventes',
  composant: Ecran,
  groupe: 'autre',
  titre: e24Ventes.titre,
};
