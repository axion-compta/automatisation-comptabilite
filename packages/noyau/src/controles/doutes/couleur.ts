// Règle C1 : la couleur de confiance est plafonnée à JAUNE dans quatre cas.
// Aucun texte affiché ici : seulement des codes. Seuil et nombre de pièces arrivent en argument.

import type { Centimes } from '../../argent/index.js';
import { ErreurControle } from '../regles/commun.js';

export type Couleur = 'VERT' | 'JAUNE' | 'ROUGE';

export interface EntreeCouleur {
  couleurLue: Couleur;
  ttc: Centimes;
  immobilisationPossible: boolean;
  manuscrite: boolean;
  /** 1 = première pièce du fournisseur. */
  rangChezFournisseur: number;
  seuilTtc: Centimes;
  piecesFournisseurNouveau: number;
}

export interface ResultatCouleur {
  couleur: Couleur;
  raisons: string[];
}

export function plafonnerCouleur(e: EntreeCouleur): ResultatCouleur {
  if (!Number.isSafeInteger(e.ttc)) throw new ErreurControle('entree_invalide');
  if (!Number.isSafeInteger(e.rangChezFournisseur) || e.rangChezFournisseur < 1) {
    throw new ErreurControle('entree_invalide');
  }
  if (!Number.isSafeInteger(e.seuilTtc) || e.seuilTtc < 0) throw new ErreurControle('parametre_invalide');
  if (!Number.isSafeInteger(e.piecesFournisseurNouveau) || e.piecesFournisseurNouveau < 0) {
    throw new ErreurControle('parametre_invalide');
  }
  const raisons: string[] = [];
  if (e.ttc >= e.seuilTtc) raisons.push('montant_eleve');
  if (e.immobilisationPossible) raisons.push('immobilisation_possible');
  if (e.manuscrite) raisons.push('manuscrite');
  if (e.rangChezFournisseur <= e.piecesFournisseurNouveau) raisons.push('fournisseur_nouveau');
  raisons.sort();
  if (e.couleurLue === 'VERT' && raisons.length > 0) return { couleur: 'JAUNE', raisons };
  return { couleur: e.couleurLue, raisons };
}
