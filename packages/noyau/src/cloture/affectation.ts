// Affectation du résultat : réserve proposée, sommes distribuables, dividende plafonné.
import { ajouter, centimes, pourcentage, soustraire, type Arrondi, type Centimes } from '../argent/index.js';

export class ErreurAffectation extends Error {
  override name = 'ErreurAffectation';
}

export interface EntreeAffectation {
  resultat: Centimes;
  capital: Centimes;
  reserveActuelle: Centimes;
  reportANouveau: Centimes;
  dividendeDemande: Centimes;
  reservesDisponibles?: Centimes;
}

export interface ParametresAffectation {
  fractionDotationPointsDeBase: number;
  plafondReservePointsDeBase: number;
  arrondi: Arrondi;
}

export type ResultatAffectation =
  | { ok: true; reserveProposee: Centimes; apurementPertes: Centimes; distribuable: Centimes; dividende: Centimes }
  | { ok: false; code: 'dividende_superieur_distribuable'; distribuable: Centimes }
  | { ok: false; code: 'perte_aucun_dividende' };

function verifierFraction(nom: string, valeur: number): void {
  if (!Number.isSafeInteger(valeur) || valeur < 0 || valeur > 10000) {
    throw new ErreurAffectation(nom + ' doit être un entier de 0 à 10000 : ' + String(valeur));
  }
}

function positifOuNul(a: Centimes, b: Centimes): Centimes {
  return a > b ? a : b;
}

export function affecterResultat(
  entree: EntreeAffectation,
  params: ParametresAffectation,
): ResultatAffectation {
  verifierFraction('La fraction de dotation', params.fractionDotationPointsDeBase);
  verifierFraction('Le plafond de réserve', params.plafondReservePointsDeBase);
  if (entree.dividendeDemande < 0) throw new ErreurAffectation('Le dividende demandé ne peut pas être négatif.');
  if (entree.capital < 0) throw new ErreurAffectation('Le capital ne peut pas être négatif.');
  if (
    entree.reservesDisponibles !== undefined &&
    (!Number.isSafeInteger(entree.reservesDisponibles) || entree.reservesDisponibles < 0)
  ) {
    throw new ErreurAffectation('Les réserves disponibles doivent être un entier de centimes positif ou nul.');
  }
  if (entree.reserveActuelle < 0) throw new ErreurAffectation('La réserve actuelle ne peut pas être négative.');

  const zero = centimes(0);
  if (entree.resultat <= 0) {
    if (entree.dividendeDemande > 0) return { ok: false, code: 'perte_aucun_dividende' };
    return { ok: true, reserveProposee: zero, apurementPertes: zero, distribuable: zero, dividende: zero };
  }

  const pertes = entree.reportANouveau < 0 ? soustraire(zero, entree.reportANouveau) : zero;
  const creditEnReport = entree.reportANouveau > 0 ? entree.reportANouveau : zero;
  const base = positifOuNul(soustraire(entree.resultat, pertes), zero);
  const dotation = pourcentage(base, params.fractionDotationPointsDeBase, params.arrondi);
  const plafond = pourcentage(entree.capital, params.plafondReservePointsDeBase, params.arrondi);
  const marge = positifOuNul(soustraire(plafond, entree.reserveActuelle), zero);
  const reserveProposee = dotation < marge ? dotation : marge;
  const apurementPertes = pertes < entree.resultat ? pertes : entree.resultat;
  const apres = soustraire(soustraire(entree.resultat, pertes), reserveProposee);
  const brut = ajouter(ajouter(apres, creditEnReport), entree.reservesDisponibles ?? zero);
  const distribuable = positifOuNul(brut, zero);
  if (entree.dividendeDemande > distribuable) {
    return { ok: false, code: 'dividende_superieur_distribuable', distribuable };
  }
  return { ok: true, reserveProposee, apurementPertes, distribuable, dividende: entree.dividendeDemande };
}
