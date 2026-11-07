// Part société et part personnelle d'une même pièce : somme exacte au centime.
import { centimes, repartir, soustraire, type Centimes } from '../argent/index.js';
import { ErreurFrais, type Payeur } from './types.js';

export interface EntreePiece {
  ttc: Centimes;
  tva: Centimes;
  partPersoTtc: Centimes;
}

export interface RepartitionPiece {
  societe: { ttc: Centimes; ht: Centimes; tva: Centimes };
  perso: { ttc: Centimes };
}

function entier(valeur: number): boolean {
  return Number.isSafeInteger(valeur);
}

export function repartirPiece(entree: EntreePiece): RepartitionPiece {
  const { ttc, tva, partPersoTtc } = entree;
  if (![ttc, tva, partPersoTtc].every(entier)) {
    throw new ErreurFrais('entree_invalide', 'Montants entiers de centimes attendus');
  }
  if (ttc < 0 || partPersoTtc < 0 || partPersoTtc > ttc) {
    throw new ErreurFrais('entree_invalide', 'Part personnelle hors des bornes du TTC');
  }
  if (tva < 0 || tva > ttc) {
    throw new ErreurFrais('entree_invalide', 'TVA hors des bornes du TTC');
  }
  const societeTtc = soustraire(ttc, partPersoTtc);
  // Un TTC nul n'a pas de prorata : la TVA est nécessairement nulle.
  const societeTva = ttc === 0 ? centimes(0) : (repartir(tva, [societeTtc, partPersoTtc])[0] ?? centimes(0));
  return {
    societe: { ttc: societeTtc, ht: soustraire(societeTtc, societeTva), tva: societeTva },
    perso: { ttc: partPersoTtc },
  };
}

/** Seule la part société d'une pièce payée par la personne est remboursable. */
export function partRemboursable(repartition: RepartitionPiece, payeur: Payeur): Centimes {
  return payeur === 'personne' ? repartition.societe.ttc : centimes(0);
}
