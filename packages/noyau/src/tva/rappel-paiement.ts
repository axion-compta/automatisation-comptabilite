// Carte de paiement de la TVA et rappels avancés au jour ouvré. Le logiciel ne paie jamais.
// Aucun numéro de compte : le montant arrive déjà calculé.

export type CodeErreurRappelTva =
  | 'pieces_invalides'
  | 'montant_invalide'
  | 'trace_invalide'
  | 'date_invalide'
  | 'jours_invalides'
  | 'recul_invalide'
  | 'calendrier_sans_jour_ouvre';

export class ErreurRappelTva extends Error {
  override name = 'ErreurRappelTva';
  readonly code: CodeErreurRappelTva;
  constructor(code: CodeErreurRappelTva, detail = '') {
    super(detail === '' ? code : `${code} : ${detail}`);
    this.code = code;
  }
}

export interface Calendrier {
  ajouterJours(date: string, n: number): string;
  estOuvre(date: string): boolean;
}

export interface PaiementTva {
  par: string;
  le: string;
  origine: 'rapprochement' | 'coche';
}

export interface EntreeCarteTva {
  declaration: { statut: 'preparee' | 'validee'; aDecaisserCentimes: number } | null;
  piecesEnDoute: number;
  paiement: PaiementTva | null;
}

export type CarteTva =
  | { etat: 'bloquee'; pieces: number }
  | { etat: 'a_confirmer' }
  | { etat: 'montant'; centimes: number }
  | { etat: 'payee'; par: string; le: string; origine: 'rapprochement' | 'coche' };

function verifierDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ErreurRappelTva('date_invalide', date);
  const t = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))));
  if (t.toISOString().slice(0, 10) !== date) throw new ErreurRappelTva('date_invalide', date);
}

function verifierPaiement(p: PaiementTva): void {
  if (p.par.trim() === '') throw new ErreurRappelTva('trace_invalide', 'par');
  verifierDate(p.le);
}

/** Ordre : pièces en doute, puis paiement, puis statut de la déclaration. Jamais de montant estimé. */
export function carteTva(entree: EntreeCarteTva): CarteTva {
  const { declaration, piecesEnDoute, paiement } = entree;
  if (!Number.isSafeInteger(piecesEnDoute) || piecesEnDoute < 0) {
    throw new ErreurRappelTva('pieces_invalides', String(piecesEnDoute));
  }
  if (declaration !== null && !Number.isSafeInteger(declaration.aDecaisserCentimes)) {
    throw new ErreurRappelTva('montant_invalide', String(declaration.aDecaisserCentimes));
  }
  if (paiement !== null) verifierPaiement(paiement);

  if (piecesEnDoute > 0) return { etat: 'bloquee', pieces: piecesEnDoute };
  if (paiement !== null) return { etat: 'payee', par: paiement.par, le: paiement.le, origine: paiement.origine };
  if (declaration === null || declaration.statut !== 'validee') return { etat: 'a_confirmer' };
  return { etat: 'montant', centimes: declaration.aDecaisserCentimes };
}

/** Dates triées de rappel : chacune reculée jour par jour tant qu'elle n'est pas ouvrée ; doublons fusionnés. */
export function datesDeRappel(
  dateLimite: string,
  joursAvant: readonly number[],
  cal: Calendrier,
  maxRecul: number,
): string[] {
  verifierDate(dateLimite);
  if (!Number.isSafeInteger(maxRecul) || maxRecul < 0) throw new ErreurRappelTva('recul_invalide', String(maxRecul));
  for (const j of joursAvant) {
    if (!Number.isSafeInteger(j) || j < 0) throw new ErreurRappelTva('jours_invalides', String(j));
  }
  const dates = new Set<string>();
  for (const j of joursAvant) {
    let date = cal.ajouterJours(dateLimite, -j);
    let recul = 0;
    while (!cal.estOuvre(date)) {
      if (recul >= maxRecul) throw new ErreurRappelTva('calendrier_sans_jour_ouvre', date);
      date = cal.ajouterJours(date, -1);
      recul += 1;
    }
    dates.add(date);
  }
  return [...dates].sort();
}

/** Un paiement (rapprochement ou case cochée) supprime tous les rappels. */
export function rappelsRestants(dates: readonly string[], paiement: PaiementTva | null): string[] {
  return paiement === null ? [...dates] : [];
}
