// Contrôles CC-T09 (achat hors UE ou importation) et CC-T14 (TVA d'un autre État de l'UE).
// La liste des États de l'UE est un argument daté ; aucun montant d'autoliquidation calculé. Codes seulement.
import type { Centimes } from '../../argent/index.js';
import { soustraire } from '../../argent/index.js';
import type { Declencheur, RegleControle, SortieRegle } from '../moteur.js';
import { ErreurControle, alerte, exigerCentimes, ok } from './commun.js';

export interface OrigineAchat {
  /** Code ISO à 2 lettres. */
  paysVendeur: string;
  tvaFrancaise: boolean;
  declarationDouane: boolean;
  numeroIoss: boolean;
  tvaFacturee: Centimes;
  ttc: Centimes;
}

export type CodeOrigine = 'A_VERIFIER' | 'NON_DEDUCTIBLE_ETRANGERE' | 'NATIONAL';

export interface QualificationOrigine {
  code: CodeOrigine;
  deduit: Centimes;
  charge: Centimes;
}

export interface EntreeOrigine {
  origine: OrigineAchat;
  etatsUe: readonly string[];
  paysSociete: string;
}

const CODE_PAYS = /^[A-Z]{2}$/;
const DECLENCHEURS: Declencheur[] = ['arrivee', 'continu', 'avant_tva', 'a_la_demande'];

function exigerPays(p: string): string {
  if (typeof p !== 'string' || !CODE_PAYS.test(p)) throw new ErreurControle('entree_invalide');
  return p;
}

function exigerPositif(n: Centimes): Centimes {
  if (exigerCentimes(n) < 0) throw new ErreurControle('entree_invalide');
  return n;
}

export function qualifierOrigine(
  o: OrigineAchat,
  etatsUe: readonly string[],
  paysSociete: string,
): QualificationOrigine {
  const pays = exigerPays(o.paysVendeur);
  const societe = exigerPays(paysSociete);
  const tva = exigerPositif(o.tvaFacturee);
  const ttc = exigerPositif(o.ttc);
  if (tva > ttc) throw new ErreurControle('entree_invalide');
  const zero = exigerCentimes(soustraire(tva, tva));
  if (o.declarationDouane || o.numeroIoss || !etatsUe.includes(pays)) {
    return { code: 'A_VERIFIER', deduit: zero, charge: zero };
  }
  if (pays === societe || o.tvaFrancaise || tva === zero) {
    return { code: 'NATIONAL', deduit: zero, charge: zero };
  }
  return { code: 'NON_DEDUCTIBLE_ETRANGERE', deduit: zero, charge: ttc };
}

function regle(id: string, gravite: 'B' | 'M', code: CodeOrigine): RegleControle<EntreeOrigine> {
  return {
    id,
    version: 1,
    gravite,
    bloque: gravite === 'B' ? ['tva'] : [],
    declencheurs: DECLENCHEURS,
    actif: true,
    evaluer({ origine, etatsUe, paysSociete }): SortieRegle {
      const q = qualifierOrigine(origine, etatsUe, paysSociete);
      return q.code === code ? alerte(undefined, code) : ok();
    },
  };
}

/** CC-T09 : achat hors UE ou importation = toujours à vérifier, blocage de la préparation de la TVA. */
export const regleCCT09 = regle('CC-T09', 'B', 'A_VERIFIER');
/** CC-T14 : TVA d'un autre État de l'UE facturée = non déductible. */
export const regleCCT14 = regle('CC-T14', 'M', 'NON_DEDUCTIBLE_ETRANGERE');
