// À-nouveaux de l'exercice N+1 : calculés depuis les soldes de N, provisoires tant que N est ouvert.
// Montants en centimes entiers ; solde = débit moins crédit. Règles pures, rien n'est enregistré.
import type { StatutExercice } from '../documents/mention.js';
import { classeDe } from '../plan/comptes.js';

export type CodeErreurANouveaux =
  | 'montant_invalide'
  | 'compte_hors_plan'
  | 'compte_invalide'
  | 'balance_desequilibree'
  | 'a_nouveaux_definitifs'
  | 'statut_inconnu'
  | 'exercices_non_consecutifs';

export class ErreurANouveaux extends Error {
  override name = 'ErreurANouveaux';
  readonly code: CodeErreurANouveaux;
  constructor(code: CodeErreurANouveaux) {
    super(code);
    this.code = code;
  }
}

export interface SoldeCompte {
  compte: string;
  solde: number;
}
export interface LigneANouveau {
  compte: string;
  debit: number;
  credit: number;
}
export interface ANouveaux {
  statut: 'provisoire' | 'definitif';
  lignes: LigneANouveau[];
  totalDebit: number;
  totalCredit: number;
}
export type CauseRecalcul = 'ecriture_validee_en_n' | 'ecriture_modifiee_en_n';
export interface DifferenceANouveau {
  compte: string;
  avant: { debit: number; credit: number };
  apres: { debit: number; credit: number };
}
export interface ResultatRecalcul {
  modifie: boolean;
  differences: DifferenceANouveau[];
  trace: { avant: { totalDebit: number; totalCredit: number }; apres: { totalDebit: number; totalCredit: number }; cause: CauseRecalcul };
  nouveau: ANouveaux;
}
export type ResultatFecOfficiel = { ok: true } | { ok: false; code: 'exercice_precedent_ouvert' };

const STATUTS: readonly string[] = ['ouvert', 'en_cloture', 'cloture', 'rouvert'];
const COMPTE_BENEFICE = '120000';
const COMPTE_PERTE = '129000';

const statutConnu = (statut: string): void => {
  if (!STATUTS.includes(statut)) throw new ErreurANouveaux('statut_inconnu');
};

function classeOuErreur(compte: string): number {
  try {
    return classeDe(compte);
  } catch {
    throw new ErreurANouveaux('compte_invalide');
  }
}

/** Comptes de bilan (classes 1 à 5) repris en à-nouveaux ; le résultat de N (classes 6 et 7) va au compte 120000 ou 129000. */
export function aNouveauxProvisoires(soldesN: readonly SoldeCompte[], plan: readonly string[]): ANouveaux {
  const parCompte = new Map<string, number>();
  let resultat = 0;
  let total = 0;
  for (const { compte, solde } of soldesN) {
    if (!Number.isSafeInteger(solde)) throw new ErreurANouveaux('montant_invalide');
    if (!plan.includes(compte)) throw new ErreurANouveaux('compte_hors_plan');
    const classe = classeOuErreur(compte);
    total += solde;
    if (classe >= 1 && classe <= 5) parCompte.set(compte, (parCompte.get(compte) ?? 0) + solde);
    else if (classe === 6 || classe === 7) resultat += solde;
    else throw new ErreurANouveaux('compte_invalide');
  }
  if (!Number.isSafeInteger(total) || total !== 0) throw new ErreurANouveaux('balance_desequilibree');
  if (resultat !== 0) {
    const c = resultat < 0 ? COMPTE_BENEFICE : COMPTE_PERTE;
    parCompte.set(c, (parCompte.get(c) ?? 0) + resultat);
  }
  const lignes: LigneANouveau[] = [...parCompte.entries()]
    .filter(([, solde]) => solde !== 0)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([compte, solde]) => ({ compte, debit: solde > 0 ? solde : 0, credit: solde < 0 ? -solde : 0 }));
  const totalDebit = lignes.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lignes.reduce((s, l) => s + l.credit, 0);
  if (totalDebit !== totalCredit) throw new ErreurANouveaux('balance_desequilibree');
  return { statut: 'provisoire', lignes, totalDebit, totalCredit };
}

/** Les à-nouveaux deviennent définitifs seulement quand N est clôturé. */
export function definitifSiCloture(aNouveaux: ANouveaux, statutN: StatutExercice): ANouveaux {
  statutConnu(statutN);
  return { ...aNouveaux, statut: statutN === 'cloture' ? 'definitif' : 'provisoire' };
}

/** Différence entre deux calculs des à-nouveaux et trace (avant, après, cause). Refusé quand les anciens sont définitifs. */
export function recalculer(ancien: ANouveaux, nouveau: ANouveaux, cause: CauseRecalcul = 'ecriture_validee_en_n'): ResultatRecalcul {
  if (ancien.statut === 'definitif') throw new ErreurANouveaux('a_nouveaux_definitifs');
  const avant = new Map(ancien.lignes.map((l) => [l.compte, l]));
  const apres = new Map(nouveau.lignes.map((l) => [l.compte, l]));
  const montants = (l: LigneANouveau | undefined) => ({ debit: l?.debit ?? 0, credit: l?.credit ?? 0 });
  const differences = [...new Set([...avant.keys(), ...apres.keys()])]
    .sort()
    .map((compte) => ({ compte, avant: montants(avant.get(compte)), apres: montants(apres.get(compte)) }))
    .filter((d) => d.avant.debit !== d.apres.debit || d.avant.credit !== d.apres.credit);
  return {
    modifie: differences.length > 0,
    differences,
    trace: {
      avant: { totalDebit: ancien.totalDebit, totalCredit: ancien.totalCredit },
      apres: { totalDebit: nouveau.totalDebit, totalCredit: nouveau.totalCredit },
      cause,
    },
    nouveau,
  };
}

/** Le FEC officiel de N+1 est refusé tant que l'exercice précédent N n'est pas clôturé. */
export function fecOfficielAutorise(
  exerciceN1: { debut: string; statut: StatutExercice },
  exerciceN: { fin: string; statut: StatutExercice } | undefined,
): ResultatFecOfficiel {
  statutConnu(exerciceN1.statut);
  if (exerciceN === undefined) return { ok: true };
  statutConnu(exerciceN.statut);
  if (exerciceN.fin >= exerciceN1.debut) throw new ErreurANouveaux('exercices_non_consecutifs');
  return exerciceN.statut === 'cloture' ? { ok: true } : { ok: false, code: 'exercice_precedent_ouvert' };
}
