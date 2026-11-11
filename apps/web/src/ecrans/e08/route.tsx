import { e08 } from '../../../../../packages/textes/src/ecrans/e08.js';
import type { DefinitionEcran } from '../../socle/ecrans.js';
import { Ecran } from './Ecran.js';

/** Écran E08 : « Fiche d'une pièce » ; l'identifiant est lu dans le paramètre de recherche `id`. */
export const route: DefinitionEcran = {
  id: 'e08',
  chemin: '/documents/piece',
  composant: Ecran,
  groupe: 'autre',
  titre: e08.titre,
};
