// Pas-à-pas de saisie : cases non nulles dans l'ordre du millésime, ou déclaration « néant ».
import type { Centimes } from '../argent/index.js';
import type { CaseDeclaration } from './cases.js';

export type CodeErreurPasAPas = 'ligne_absente' | 'case_hors_ordre' | 'ordre_en_double' | 'montant_invalide';

export class ErreurPasAPas extends Error {
  override name = 'ErreurPasAPas';
  readonly code: CodeErreurPasAPas;
  constructor(code: CodeErreurPasAPas, message: string) {
    super(message);
    this.code = code;
  }
}

export type CaseAvecBase = CaseDeclaration & { base?: Centimes };

export interface EtapeSaisie {
  rang: number;
  code: string;
  montant: Centimes;
  base?: Centimes;
  sources: number;
}

export function pasAPas(
  cases: readonly CaseAvecBase[],
  ordreDeSaisie: readonly string[],
): { neant: boolean; etapes: EtapeSaisie[] } {
  if (new Set(ordreDeSaisie).size !== ordreDeSaisie.length) {
    throw new ErreurPasAPas('ordre_en_double', "Un code est en double dans l'ordre de saisie.");
  }
  for (const x of cases) {
    if (x.montant < 0) throw new ErreurPasAPas('montant_invalide', `La case « ${x.code} » est négative.`);
  }
  const parCode = new Map(cases.map((x) => [x.code, x]));
  const etapes: EtapeSaisie[] = [];
  for (const code of ordreDeSaisie) {
    const x = parCode.get(code);
    if (x === undefined) throw new ErreurPasAPas('ligne_absente', `La case « ${code} » est absente.`);
    if (x.montant === 0) continue;
    const etape: EtapeSaisie = { rang: etapes.length + 1, code, montant: x.montant, sources: x.sources.length };
    if (x.base !== undefined) etape.base = x.base;
    etapes.push(etape);
  }
  const rangees = new Set(ordreDeSaisie);
  const cachee = cases.find((x) => x.montant !== 0 && !rangees.has(x.code));
  if (cachee !== undefined) {
    throw new ErreurPasAPas('case_hors_ordre', `La case « ${cachee.code} » a un montant mais n'est pas dans l'ordre de saisie.`);
  }
  return { neant: etapes.length === 0, etapes };
}
