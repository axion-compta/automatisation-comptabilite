// Mémoire de correction par société : une règle n'est proposée qu'après `seuil` corrections concordantes.
export interface CorrectionClassement {
  societeId: string;
  fournisseurId: string;
  libelle: string;
  ancienCompte: string;
  nouveauCompte: string;
  canal: string;
  ecritureId: string;
  date: string;
}

export type CodeErreurMemoire = 'seuil_invalide';

export class ErreurMemoire extends Error {
  override name = 'ErreurMemoire';
  readonly code: CodeErreurMemoire;
  constructor(code: CodeErreurMemoire, message: string) {
    super(message);
    this.code = code;
  }
}

export interface EtatRegle {
  statut: 'aucune' | 'proposee' | 'eteinte';
  compte?: string;
  nbConcordantes: number;
}

export function cleMotif(fournisseurId: string, libelle: string): string {
  const net = libelle
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return JSON.stringify([fournisseurId, net]);
}

function avant(a: CorrectionClassement, b: CorrectionClassement): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.ecritureId !== b.ecritureId) return a.ecritureId < b.ecritureId ? -1 : 1;
  return 0;
}

export function etatRegle(
  corrections: readonly CorrectionClassement[],
  societeId: string,
  cle: string,
  seuil: number,
): EtatRegle {
  if (!Number.isSafeInteger(seuil) || seuil < 1) {
    throw new ErreurMemoire('seuil_invalide', 'Le seuil doit être un entier sûr supérieur ou égal à 1.');
  }
  const retenues = corrections
    .filter((c) => c.societeId === societeId && cleMotif(c.fournisseurId, c.libelle) === cle)
    .sort(avant);
  let compte: string | undefined;
  let nb = 0;
  let eteinte = false;
  for (const c of retenues) {
    if (c.nouveauCompte === compte) {
      nb += 1;
    } else {
      if (nb >= seuil) eteinte = true;
      compte = c.nouveauCompte;
      nb = 1;
    }
  }
  if (nb >= seuil && compte !== undefined) return { statut: 'proposee', compte, nbConcordantes: nb };
  return { statut: eteinte ? 'eteinte' : 'aucune', nbConcordantes: nb };
}

export function regleApplicable(etat: EtatRegle, periodeCloturee: boolean): boolean {
  return etat.statut === 'proposee' && !periodeCloturee;
}
