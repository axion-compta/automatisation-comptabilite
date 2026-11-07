// Montant provisoire d'un trajet IK : tranche du cumul annuel avant le trajet, coupure à chaque borne.
// Unités entières : km en dixièmes, taux en millièmes d'euro par km, produit en dix-millièmes d'euro.
import { centimes, pourcentage, type Centimes } from '../argent/index.js';
import type { PuissanceIk } from './bareme-ik.js';
import { ErreurFrais } from './types.js';

export interface EntreeProvisoire {
  kmRetenusDixiemes: number;
  cumulAvantDixiemes: number;
  ligne: PuissanceIk;
  majorationPourcent: number;
  electrique: boolean;
}

export interface PartTrajet {
  kmDixiemes: number;
  tauxMilliemes: number;
}

export interface MontantProvisoire {
  montant: Centimes;
  parts: PartTrajet[];
}

const BASE_POURCENT = 100;

function invalide(message: string): ErreurFrais {
  return new ErreurFrais('entree_invalide', message);
}

function entierSur(n: number, nom: string): void {
  if (!Number.isSafeInteger(n)) throw invalide(nom + ' : entier attendu.');
}

function controler(e: EntreeProvisoire): void {
  entierSur(e.kmRetenusDixiemes, 'Kilomètres');
  entierSur(e.cumulAvantDixiemes, 'Cumul');
  entierSur(e.majorationPourcent, 'Majoration');
  if (e.kmRetenusDixiemes <= 0) throw invalide('Kilomètres : strictement positifs.');
  if (e.cumulAvantDixiemes < 0) throw invalide('Cumul : positif ou nul.');
  if (e.majorationPourcent < 0) throw invalide('Majoration : positive ou nulle.');
  entierSur(e.kmRetenusDixiemes + e.cumulAvantDixiemes, 'Cumul après trajet');
}

/** Parts du trajet : une par tranche traversée, coupées à chaque borne ; la partie fixe n'intervient pas. */
function decouper(km: number, cumul: number, ligne: PuissanceIk): PartTrajet[] {
  const parts: PartTrajet[] = [];
  let debut = cumul;
  let reste = km;
  for (const t of ligne.tranches) {
    if (reste === 0) break;
    if (t.jusquaKmDixiemes !== null && debut >= t.jusquaKmDixiemes) continue;
    const place = t.jusquaKmDixiemes === null ? reste : t.jusquaKmDixiemes - debut;
    const pris = Math.min(reste, place);
    parts.push({ kmDixiemes: pris, tauxMilliemes: t.tauxMilliemes });
    debut += pris;
    reste -= pris;
  }
  return parts;
}

export function montantProvisoire(e: EntreeProvisoire): MontantProvisoire {
  controler(e);
  const parts = decouper(e.kmRetenusDixiemes, e.cumulAvantDixiemes, e.ligne);
  const produit = parts.reduce((s, p) => s + p.kmDixiemes * p.tauxMilliemes, 0);
  entierSur(produit, 'Produit');
  // Un seul arrondi, à la fin : produit exact (dix-millièmes) × (100 + majoration) ÷ 10 000, demi vers le haut.
  const facteur = BASE_POURCENT + (e.electrique ? e.majorationPourcent : 0);
  try {
    return { montant: pourcentage(centimes(produit), facteur, 'demi-superieur'), parts };
  } catch {
    throw invalide('Montant hors limites.');
  }
}
