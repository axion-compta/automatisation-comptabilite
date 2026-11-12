// Acquisition intracommunautaire (bien ou service) : qualification et proposition d'écriture d'autoliquidation.
// Pur, en centimes. Le calcul vient de `effetTraitement` (aucun second calcul). Les numéros de comptes sont des arguments.
import type { Centimes } from '../argent/index.js';
import { effetTraitement } from './traitement.js';

export interface EntreeAcquisition {
  nature: 'bien' | 'service';
  /** Numéro de TVA du fournisseur ; absent ou vide = à vérifier. */
  numeroTvaFournisseur: string | undefined;
  base: Centimes;
  /** Taux d'autoliquidation en points de base. */
  tauxPdb: number;
}

export type QualificationAcquisition =
  | { code: 'AUTOLIQUIDATION'; collectee: Centimes; deductible: Centimes }
  | { code: 'A_VERIFIER'; collectee: Centimes; deductible: Centimes };

export interface ComptesAutoliquidation {
  /** Compte de TVA collectée. */
  collectee: string;
  /** Compte de TVA déductible sur acquisition intracommunautaire. */
  deductible: string;
}

export interface LigneAutoliquidation {
  compte: string;
  debit: Centimes;
  credit: Centimes;
}

export class ErreurIntracom extends Error {
  override name = 'ErreurIntracom';
  readonly code: 'entree_invalide';
  constructor() {
    super('entree_invalide');
    this.code = 'entree_invalide';
  }
}

/**
 * Qualifie une acquisition faite à un fournisseur de l'UE sans TVA.
 * Sans numéro de TVA du fournisseur : `A_VERIFIER`, rien n'est collecté ni déduit.
 */
export function qualifierAcquisition(e: EntreeAcquisition): QualificationAcquisition {
  if (e.nature !== 'bien' && e.nature !== 'service') throw new ErreurIntracom();
  const nul = 0 as Centimes;
  const numero = typeof e.numeroTvaFournisseur === 'string' ? e.numeroTvaFournisseur.trim() : '';
  if (numero === '') {
    // Les montants sont tout de même contrôlés : une base invalide reste une erreur.
    effetTraitement({ code: 'AUTOLIQUIDATION', sens: 'achat', tvaLue: nul, base: e.base, tauxAutoliquidationPointsDeBase: e.tauxPdb, franchise: false });
    return { code: 'A_VERIFIER', collectee: nul, deductible: nul };
  }
  const effet = effetTraitement({
    code: 'AUTOLIQUIDATION',
    sens: 'achat',
    tvaLue: nul,
    base: e.base,
    tauxAutoliquidationPointsDeBase: e.tauxPdb,
    franchise: false,
  });
  return { code: 'AUTOLIQUIDATION', collectee: effet.collectee, deductible: effet.deductible };
}

/** Lignes équilibrées de l'autoliquidation : débit de la TVA déductible, crédit de la TVA collectée. Rien si à vérifier ou nul. */
export function lignesAutoliquidation(q: QualificationAcquisition, comptes: ComptesAutoliquidation): LigneAutoliquidation[] {
  if (comptes.collectee.trim() === '' || comptes.deductible.trim() === '' || comptes.collectee === comptes.deductible) {
    throw new ErreurIntracom();
  }
  if (q.code !== 'AUTOLIQUIDATION') return [];
  const entier = (n: number): boolean => Number.isSafeInteger(n) && n >= 0;
  // Une autoliquidation a toujours collectée = déductible : sinon les lignes seraient déséquilibrées.
  if (!entier(q.collectee) || !entier(q.deductible) || q.collectee !== q.deductible) throw new ErreurIntracom();
  if (q.collectee === 0) return [];
  return [
    { compte: comptes.deductible, debit: q.deductible, credit: 0 as Centimes },
    { compte: comptes.collectee, debit: 0 as Centimes, credit: q.collectee },
  ];
}
