// Paiement partiel en devise : part soldée au taux d'origine, reliquat au dernier paiement, écart, surplus.
import { appliquerFraction, centimes, type Arrondi } from '../argent/index.js';
import type { SensEcart } from './explication.js';
import { ErreurChange } from './taux.js';

const ECHELLE = 100_000_000;

export interface PieceDevise {
  montantDevise: number;
  tauxE8: number;
  montantEuros: number;
}
export interface DejaSolde {
  devise: number;
  euros: number;
}
export interface PaiementDevise {
  montantDevise: number;
  eurosPayes: number;
  frais: number;
}
export interface ResultatPaiementPartiel {
  partEuros: number;
  /** Centimes, signé : positif = perte. */
  ecart: number;
  sens: SensEcart;
  deviseImputee: number;
  eurosImputes: number;
  surplusDevise: number;
  eurosSurplus: number;
  dernier: boolean;
}

function entier(v: number, minimum: number): void {
  if (!Number.isSafeInteger(v) || v < minimum) throw new ErreurChange('parametre_invalide');
}

export function paiementPartiel(
  piece: PieceDevise,
  deja: DejaSolde,
  paiement: PaiementDevise,
  mode: Arrondi,
): ResultatPaiementPartiel {
  if (!Number.isSafeInteger(piece.tauxE8) || piece.tauxE8 <= 0) throw new ErreurChange('taux_invalide');
  entier(piece.montantDevise, 0);
  entier(piece.montantEuros, 0);
  entier(deja.devise, 0);
  entier(deja.euros, 0);
  entier(paiement.montantDevise, 1);
  entier(paiement.eurosPayes, 0);
  entier(paiement.frais, 0);
  const reliquatDevise = piece.montantDevise - deja.devise;
  const reliquatEuros = piece.montantEuros - deja.euros;
  if (reliquatDevise <= 0 || reliquatEuros < 0) throw new ErreurChange('parametre_invalide');

  const dernier = paiement.montantDevise >= reliquatDevise;
  const deviseImputee = Math.min(paiement.montantDevise, reliquatDevise);
  const surplusDevise = paiement.montantDevise - deviseImputee;
  const eurosImputes =
    surplusDevise === 0
      ? paiement.eurosPayes
      : appliquerFraction(centimes(paiement.eurosPayes), deviseImputee, paiement.montantDevise, mode);
  const partEuros = dernier
    ? reliquatEuros
    : Math.min(appliquerFraction(centimes(deviseImputee), piece.tauxE8, ECHELLE, mode), reliquatEuros);
  const ecart = eurosImputes - paiement.frais - partEuros;
  const sens: SensEcart = ecart > 0 ? 'perte' : ecart < 0 ? 'gain' : 'aucun';
  return {
    partEuros,
    ecart,
    sens,
    deviseImputee,
    eurosImputes,
    surplusDevise,
    eurosSurplus: paiement.eurosPayes - eurosImputes,
    dernier,
  };
}
