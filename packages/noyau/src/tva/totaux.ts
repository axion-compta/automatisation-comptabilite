// Totaux de TVA d'une période. Une pièce en doute dans la période bloque tout montant (D4).
import { ajouter, centimes, type Centimes } from '../argent/index.js';
import type { TotauxTva } from './liquidation.js';
import type { EffetTraitement } from './traitement.js';

export class ErreurTotauxTva extends Error {
  override name = 'ErreurTotauxTva';
}

export interface LigneTotaux {
  effet: EffetTraitement;
  dateExigibilite?: string;
  dateDeduction?: string;
}

export interface PeriodeTotaux {
  debut: string;
  fin: string;
}

export type TotauxPeriode =
  | { etat: 'calcule'; collectee: Centimes; deductible: Centimes; sousReserve: Centimes; perdue: Centimes; lignesSansDate: number }
  | { etat: 'non_calcule'; motif: 'tva_en_doute'; lignesEnDoute: number };

function verifierDate(date: string): void {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(date);
  const d = new Date(`${date}T00:00:00Z`);
  const ok = m !== null && !Number.isNaN(d.getTime()) && d.toISOString().startsWith(date);
  if (!ok) throw new ErreurTotauxTva(`Date invalide : « ${date} ».`);
}

/** Additionne par période. Les dates ISO se comparent comme du texte, bornes incluses. */
export function totauxPeriode(lignes: readonly LigneTotaux[], periode: PeriodeTotaux): TotauxPeriode {
  verifierDate(periode.debut);
  verifierDate(periode.fin);
  if (periode.debut > periode.fin) throw new ErreurTotauxTva('Période aux bornes inversées.');
  const dans = (d: string | undefined): boolean => d !== undefined && d >= periode.debut && d <= periode.fin;

  let collectee = centimes(0);
  let deductible = centimes(0);
  let sousReserve = centimes(0);
  let perdue = centimes(0);
  let lignesSansDate = 0;
  let lignesEnDoute = 0;

  for (const l of lignes) {
    if (l.dateExigibilite !== undefined) verifierDate(l.dateExigibilite);
    if (l.dateDeduction !== undefined) verifierDate(l.dateDeduction);
    if (l.dateExigibilite === undefined && l.dateDeduction === undefined) {
      lignesSansDate += 1;
      continue;
    }
    const exigible = dans(l.dateExigibilite);
    const deduisible = dans(l.dateDeduction);
    if (l.effet.aVerifier && (exigible || deduisible)) lignesEnDoute += 1;
    if (exigible) collectee = ajouter(collectee, l.effet.collectee);
    if (deduisible) {
      deductible = ajouter(deductible, l.effet.deductible);
      sousReserve = ajouter(sousReserve, l.effet.sousReserve);
      perdue = ajouter(perdue, l.effet.perdue);
    }
  }

  if (lignesEnDoute > 0) return { etat: 'non_calcule', motif: 'tva_en_doute', lignesEnDoute };
  return { etat: 'calcule', collectee, deductible, sousReserve, perdue, lignesSansDate };
}

/** Totaux pour la liquidation ; refus si la période n'est pas calculée. */
export function versTotauxLiquidation(total: TotauxPeriode): TotauxTva {
  if (total.etat !== 'calcule') throw new ErreurTotauxTva('Totaux non calculés : une pièce est en doute.');
  return { collectee: total.collectee, deductible: total.deductible };
}
