// Prévision de fin de mois : une estimation, jamais un engagement. Aucun montant ici.
import { finDeMois } from '../dates/civiles.js';
import { ajouterJours, ecartJours, verifierDate, verifierEntier } from './types.js';

const MINIMUM_NUL = 0;
const MINIMUM_UN = 1;

// Division entière en BigInt (même méthode que `diviser` dans argent/index.ts), d >= 1 et n >= 0.
function quotientInferieur(n: bigint, d: bigint): bigint {
  // eslint-disable-next-line no-restricted-syntax
  return n / d;
}

export function joursRestantsDuMois(aujourdhui: string): number {
  verifierDate(aujourdhui);
  return ecartJours(aujourdhui, finDeMois(aujourdhui));
}

export function prevoirFinDeMois(p: {
  utilise: number;
  piecesParJour: ReadonlyMap<string, number>;
  aujourdhui: string;
  fenetreJours: number;
}): number {
  verifierEntier(p.utilise, MINIMUM_NUL);
  verifierEntier(p.fenetreJours, MINIMUM_UN);
  verifierDate(p.aujourdhui);
  for (const [jour, n] of p.piecesParJour) {
    verifierDate(jour);
    verifierEntier(n, MINIMUM_NUL);
  }
  const debut = ajouterJours(p.aujourdhui, MINIMUM_UN - p.fenetreJours);
  let somme = 0n;
  for (const [jour, n] of p.piecesParJour) {
    if (jour >= debut && jour <= p.aujourdhui) somme += BigInt(n);
  }
  const ajout = quotientInferieur(somme * BigInt(joursRestantsDuMois(p.aujourdhui)), BigInt(p.fenetreJours));
  return Number(BigInt(p.utilise) + ajout);
}
