// Mois de rattachement d'une pièce : modifiable, avec une ligne de journal par changement.
// Aucun recalcul de montant ici : la fonction rend les périodes à recalculer.

export type CodeErreurRattachement =
  | 'mois_invalide'
  | 'mois_identique'
  | 'trace_invalide'
  | 'date_invalide'
  | 'piece_inconnue'
  | 'periode_deposee'
  | 'rattachement_ambigu';

export class ErreurRattachement extends Error {
  override name = 'ErreurRattachement';
  readonly code: CodeErreurRattachement;
  constructor(code: CodeErreurRattachement, detail = '') {
    super(detail === '' ? code : `${code} : ${detail}`);
    this.code = code;
  }
}

export interface Rattachement {
  pieceId: string;
  /** AAAA-MM */
  mois: string;
}

export interface LigneJournalRattachement {
  pieceId: string;
  ancienMois: string;
  nouveauMois: string;
  par: string;
  le: string;
}

export interface DemandeDeplacement {
  pieceId: string;
  nouveauMois: string;
  par: string;
  le: string;
}

export interface ResultatDeplacement {
  rattachements: Rattachement[];
  journal: LigneJournalRattachement;
  periodesARecalculer: readonly [string, string];
}

function verifierMois(mois: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mois)) throw new ErreurRattachement('mois_invalide', mois);
}

function verifierDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ErreurRattachement('date_invalide', date);
  const t = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))));
  if (t.toISOString().slice(0, 10) !== date) throw new ErreurRattachement('date_invalide', date);
}

/** Déplace une pièce vers un autre mois. L'entrée n'est jamais modifiée ; une période déposée ne se modifie pas. */
export function deplacerPiece(
  rattachements: readonly Rattachement[],
  demande: DemandeDeplacement,
  periodesDeposees: readonly string[],
): ResultatDeplacement {
  if (demande.pieceId.trim() === '') throw new ErreurRattachement('trace_invalide', 'pieceId');
  if (demande.par.trim() === '') throw new ErreurRattachement('trace_invalide', 'par');
  verifierMois(demande.nouveauMois);
  verifierDate(demande.le);
  const vus = new Set<string>();
  for (const r of rattachements) {
    verifierMois(r.mois);
    if (vus.has(r.pieceId)) throw new ErreurRattachement('rattachement_ambigu', r.pieceId);
    vus.add(r.pieceId);
  }
  const actuel = rattachements.find((r) => r.pieceId === demande.pieceId);
  if (actuel === undefined) throw new ErreurRattachement('piece_inconnue', demande.pieceId);
  if (actuel.mois === demande.nouveauMois) throw new ErreurRattachement('mois_identique', demande.nouveauMois);
  for (const periode of [actuel.mois, demande.nouveauMois]) {
    if (periodesDeposees.includes(periode)) throw new ErreurRattachement('periode_deposee', periode);
  }
  const { pieceId, nouveauMois, par, le } = demande;
  return {
    rattachements: rattachements.map((r) => (r.pieceId === pieceId ? { pieceId, mois: nouveauMois } : { ...r })),
    journal: { pieceId, ancienMois: actuel.mois, nouveauMois, par, le },
    periodesARecalculer: [actuel.mois, nouveauMois],
  };
}
