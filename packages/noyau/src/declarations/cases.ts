// Alimentation des cases d'un formulaire depuis les écritures validées, avec leurs sources.
// La table du millésime est une donnée : aucun code de ligne ni numéro de compte n'est écrit ici.
import { ajouter, centimes, soustraire, type Centimes } from '../argent/index.js';
import type { Ecriture } from '../ecritures/modele.js';

export type CodeErreurDeclaration = 'ligne_sans_regle' | 'ligne_en_double' | 'prefixe_vide' | 'periode_invalide';

export class ErreurDeclaration extends Error {
  override name = 'ErreurDeclaration';
  readonly code: CodeErreurDeclaration;
  constructor(code: CodeErreurDeclaration, message: string) {
    super(message);
    this.code = code;
  }
}

export type SensAlimentation = 'debit' | 'credit' | 'solde_debiteur' | 'solde_crediteur';

export interface LigneFormulaire {
  code: string;
  alimentation?: { comptes: readonly string[]; sens: SensAlimentation };
  formule?: string;
  base?: boolean;
}

export interface TableFormulaire {
  formulaire: string;
  millesime: string;
  lignes: readonly LigneFormulaire[];
}

export interface SourceCase {
  ecritureId: string;
  ligneIndex: number;
}

export interface CaseDeclaration {
  code: string;
  montant: Centimes;
  sources: SourceCase[];
  aCalculer: boolean;
}

function dateValide(date: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return false;
  const [annee, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  return d.getUTCFullYear() === annee && d.getUTCMonth() === mois - 1 && d.getUTCDate() === jour;
}

function comparer(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function verifierTable(table: TableFormulaire): void {
  const vus = new Set<string>();
  for (const l of table.lignes) {
    if (vus.has(l.code)) throw new ErreurDeclaration('ligne_en_double', `Code de ligne en double : « ${l.code} ».`);
    vus.add(l.code);
    if (l.alimentation === undefined && l.formule === undefined) {
      throw new ErreurDeclaration('ligne_sans_regle', `La ligne « ${l.code} » n'a ni alimentation ni formule.`);
    }
    const a = l.alimentation;
    if (a !== undefined && (a.comptes.length === 0 || a.comptes.some((p) => p === ''))) {
      throw new ErreurDeclaration('prefixe_vide', `La ligne « ${l.code} » a un préfixe de compte vide.`);
    }
  }
}

/** Montants de chaque case de la période, avec les lignes d'écriture validées qui les composent. */
export function alimenterCases(
  table: TableFormulaire,
  ecritures: readonly Ecriture[],
  periode: { debut: string; fin: string },
): CaseDeclaration[] {
  if (!dateValide(periode.debut) || !dateValide(periode.fin) || periode.debut > periode.fin) {
    throw new ErreurDeclaration('periode_invalide', 'La période doit avoir deux dates AAAA-MM-JJ, début avant fin.');
  }
  verifierTable(table);

  const retenues = ecritures
    .filter((e) => e.statut === 'valide' && e.date >= periode.debut && e.date <= periode.fin)
    .sort((a, b) => comparer(a.id, b.id));

  return table.lignes.map((l): CaseDeclaration => {
    const a = l.alimentation;
    if (a === undefined) return { code: l.code, montant: centimes(0), sources: [], aCalculer: true };
    let debit = centimes(0);
    let credit = centimes(0);
    const sources: SourceCase[] = [];
    for (const e of retenues) {
      e.lignes.forEach((ligne, ligneIndex) => {
        if (!a.comptes.some((p) => ligne.compte.startsWith(p))) return;
        const compte = a.sens === 'debit' ? ligne.debit > 0 : a.sens === 'credit' ? ligne.credit > 0 : ligne.debit > 0 || ligne.credit > 0;
        if (!compte) return;
        debit = ajouter(debit, ligne.debit);
        credit = ajouter(credit, ligne.credit);
        sources.push({ ecritureId: e.id, ligneIndex });
      });
    }
    const solde = soustraire(debit, credit);
    const montant =
      a.sens === 'debit'
        ? debit
        : a.sens === 'credit'
          ? credit
          : a.sens === 'solde_debiteur'
            ? centimes(Math.max(0, solde))
            : centimes(Math.max(0, -solde));
    return { code: l.code, montant, sources, aCalculer: false };
  });
}
