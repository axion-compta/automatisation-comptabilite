// Qualification d'un écart de rapprochement : proposition seulement, aucune écriture créée ici.
import { centimes, type Centimes } from '../../argent/index.js';

export class ErreurEcart extends Error {
  override name = 'ErreurEcart';
  constructor(readonly code: 'montant_invalide' | 'reglage_invalide') {
    super(code);
  }
}

export type NatureEcart = 'arrondi' | 'frais_bancaires' | 'escompte' | 'inconnu';
export type EntreeEcart = {
  montantPiece: Centimes;
  montantPaye: Centimes;
  enDevise: boolean;
  libelleFrais: boolean;
  escompteMentionne: boolean;
};
export type ReglageEcart = {
  seuilCentimes: number;
  seuilPb: number;
  seuilArrondi: number;
  comptes: Record<'arrondi' | 'frais_bancaires' | 'escompte', string>;
};
export type Qualification =
  | { type: 'aucun' }
  | { type: 'petit_ecart'; ecart: Centimes; nature: NatureEcart; comptePropose?: string }
  | { type: 'trop_percu'; ecart: Centimes }
  | { type: 'partiel'; reste: Centimes };

const BASE_PB = 10_000;
const entierPositif = (n: number): boolean => Number.isSafeInteger(n) && n >= 0;

function nature(e: EntreeEcart, abs: number, r: ReglageEcart): NatureEcart {
  if (abs <= r.seuilArrondi) return 'arrondi';
  if (e.enDevise || e.libelleFrais) return 'frais_bancaires';
  return e.escompteMentionne ? 'escompte' : 'inconnu';
}

export function qualifierEcart(entree: EntreeEcart, reglage: ReglageEcart): Qualification {
  if (!entierPositif(entree.montantPiece) || !entierPositif(entree.montantPaye)) throw new ErreurEcart('montant_invalide');
  const { seuilCentimes, seuilPb, seuilArrondi } = reglage;
  if (![seuilCentimes, seuilPb, seuilArrondi].every(entierPositif)) throw new ErreurEcart('reglage_invalide');
  const ecart = centimes(entree.montantPaye - entree.montantPiece);
  if (ecart === 0) return { type: 'aucun' };
  const abs = Math.abs(ecart);
  const petit = abs <= seuilCentimes && abs * BASE_PB <= seuilPb * entree.montantPiece;
  if (!petit) return ecart > 0 ? { type: 'trop_percu', ecart } : { type: 'partiel', reste: centimes(abs) };
  const n = nature(entree, abs, reglage);
  return n === 'inconnu'
    ? { type: 'petit_ecart', ecart, nature: n }
    : { type: 'petit_ecart', ecart, nature: n, comptePropose: reglage.comptes[n] };
}
