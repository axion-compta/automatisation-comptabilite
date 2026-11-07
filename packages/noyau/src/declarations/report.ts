// Report du crédit de la période précédente ; les codes de ligne et le seuil viennent du millésime.
import type { Centimes } from '../argent/index.js';
import type { CaseDeclaration } from './cases.js';

export type CodeErreurReport = 'ligne_absente' | 'montant_invalide' | 'seuil_invalide' | 'codes_identiques';

export class ErreurReport extends Error {
  override name = 'ErreurReport';
  readonly code: CodeErreurReport;
  constructor(code: CodeErreurReport, message: string) {
    super(message);
    this.code = code;
  }
}

function entierPositifOuNul(v: number): boolean {
  return Number.isSafeInteger(v) && v >= 0;
}

/** Case de report = case de crédit de la déclaration précédente (0 si aucune précédente). */
export function reporterCredit(
  precedente: readonly CaseDeclaration[] | null,
  codes: { ligneCredit: string; ligneReport: string },
): CaseDeclaration {
  if (codes.ligneCredit === codes.ligneReport) {
    throw new ErreurReport('codes_identiques', 'Les lignes de crédit et de report doivent différer.');
  }
  const base = { code: codes.ligneReport, aCalculer: false };
  if (precedente === null) return { ...base, montant: 0 as Centimes, sources: [] };
  const source = precedente.find((x) => x.code === codes.ligneCredit);
  if (source === undefined) {
    throw new ErreurReport('ligne_absente', `La déclaration précédente n'a pas la ligne « ${codes.ligneCredit} ».`);
  }
  if (!entierPositifOuNul(source.montant)) {
    throw new ErreurReport('montant_invalide', 'Le crédit à reporter doit être un entier de centimes positif ou nul.');
  }
  return { ...base, montant: source.montant, sources: source.sources.map((s) => ({ ...s })) };
}

/** Remboursement proposé seulement si le crédit dépasse strictement le seuil. */
export function remboursementPropose(credit: Centimes, seuil: Centimes): boolean {
  if (!entierPositifOuNul(seuil)) throw new ErreurReport('seuil_invalide', 'Le seuil doit être un entier de centimes positif ou nul.');
  if (!entierPositifOuNul(credit)) throw new ErreurReport('montant_invalide', 'Le crédit doit être un entier de centimes positif ou nul.');
  return credit > seuil;
}
