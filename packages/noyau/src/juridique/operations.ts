// Opérations juridiques détectées (capital, cession de titres, siège, statuts, dissolution) : la table des indices est un argument.
export type Operation = 'capital' | 'cession_titres' | 'siege' | 'statuts' | 'dissolution';
const ORDRE: readonly Operation[] = ['capital', 'cession_titres', 'siege', 'statuts', 'dissolution'];

export interface RegleIndice {
  operation: Operation;
  libelles: string[];
  /** Préfixes de comptes. */
  comptes: string[];
}
export interface IndiceOperation {
  source: 'banque' | 'piece' | 'ecriture';
  ref: string;
  libelle?: string;
  compte?: string;
}
export interface ActeDepose {
  operation: Operation;
  ref: string;
}
export interface Constat {
  operation: Operation;
  gravite: 'bloquant';
  indices: string[];
}

const nonVide = (t: string): boolean => t.trim() !== '';

function correspond(i: IndiceOperation, r: RegleIndice): boolean {
  const libelle = i.libelle?.toLowerCase();
  const parLibelle = libelle !== undefined && r.libelles.filter(nonVide).some((l) => libelle.includes(l.trim().toLowerCase()));
  const parCompte = i.compte !== undefined && r.comptes.filter(nonVide).some((c) => i.compte?.startsWith(c.trim()) === true);
  return parLibelle || parCompte;
}

/** Constat bloquant par opération suspectée, tant qu'aucun acte déposé n'est rattaché à cette opération. */
export function detecterOperations(entree: { indices: readonly IndiceOperation[]; actes: readonly ActeDepose[] }, table: readonly RegleIndice[]): Constat[] {
  const constats: Constat[] = [];
  for (const operation of ORDRE) {
    if (entree.actes.some((a) => a.operation === operation)) continue;
    const regles = table.filter((r) => r.operation === operation);
    const refs = entree.indices.filter((i) => regles.some((r) => correspond(i, r))).map((i) => i.ref);
    if (refs.length > 0) constats.push({ operation, gravite: 'bloquant', indices: [...new Set(refs)].sort() });
  }
  return constats;
}
