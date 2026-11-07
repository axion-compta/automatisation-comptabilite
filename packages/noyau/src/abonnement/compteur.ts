// Compteur mensuel des pièces traitées et cumul de la consommation d'IA (coût en micro-centimes entiers).
import { ErreurAbonnement, verifierEntier, verifierHorodatage } from './types.js';

export type EvenementPiece = {
  pieceId: string; societe: string; type: 'proposition_prete' | 'relecture' | 'doublon_refuse' | 'antivirus_refuse'; horodatage: string;
};
export type LigneConsommation = {
  societe: string; pieceId: string | null; action: string; modele: string;
  jetonsEntree: number; jetonsSortie: number; coutMicroCentimes: number; horodatage: string;
};
export type Consommation = { jetonsEntree: number; jetonsSortie: number; coutMicroCentimes: number };

const FORME_MOIS = /^\d{4}-(0[1-9]|1[0-2])$/;
const verifierMois = (m: string): void => {
  if (typeof m !== 'string' || !FORME_MOIS.test(m)) throw new ErreurAbonnement('date_invalide');
};

export function moisDe(horodatage: string): string {
  verifierHorodatage(horodatage);
  return horodatage.slice(0, 7);
}

export function compterPiecesTraitees(evenements: readonly EvenementPiece[], mois: string): ReadonlyMap<string, number> {
  verifierMois(mois);
  const pieces = new Map<string, { societe: string; premiere: string | null; refusee: boolean }>();
  for (const e of evenements) {
    verifierHorodatage(e.horodatage);
    const cle = JSON.stringify([e.societe, e.pieceId]);
    const p = pieces.get(cle) ?? { societe: e.societe, premiere: null, refusee: false };
    if (e.type === 'proposition_prete') {
      if (p.premiere === null || Date.parse(e.horodatage) < Date.parse(p.premiere)) p.premiere = e.horodatage;
    } else if (e.type !== 'relecture') p.refusee = true;
    pieces.set(cle, p);
  }
  const compteur = new Map<string, number>();
  for (const p of pieces.values()) {
    if (p.refusee || p.premiere === null || p.premiere.slice(0, 7) !== mois) continue;
    compteur.set(p.societe, (compteur.get(p.societe) ?? 0) + 1);
  }
  return compteur;
}

function ajouter(a: number, b: number): number {
  const s = a + b;
  if (!Number.isSafeInteger(s)) throw new ErreurAbonnement('depassement_entier');
  return s;
}

export function cumulerConsommation(lignes: readonly LigneConsommation[], mois: string): ReadonlyMap<string, Consommation> {
  verifierMois(mois);
  const cumul = new Map<string, Consommation>();
  for (const l of lignes) {
    verifierEntier(l.jetonsEntree, 0);
    verifierEntier(l.jetonsSortie, 0);
    verifierEntier(l.coutMicroCentimes, 0);
    if (moisDe(l.horodatage) !== mois) continue;
    const c = cumul.get(l.societe) ?? { jetonsEntree: 0, jetonsSortie: 0, coutMicroCentimes: 0 };
    cumul.set(l.societe, {
      jetonsEntree: ajouter(c.jetonsEntree, l.jetonsEntree),
      jetonsSortie: ajouter(c.jetonsSortie, l.jetonsSortie),
      coutMicroCentimes: ajouter(c.coutMicroCentimes, l.coutMicroCentimes),
    });
  }
  return cumul;
}
