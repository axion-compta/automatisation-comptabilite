// Périodes de déclaration de TVA d'un exercice et statuts d'une période. Aucun montant, aucune date légale.
import { ajouterJours, ajouterMois, comparerDates, estDateValide, finDeMois } from '../dates/civiles.js';
import { regimeAuJour } from './regime.js';
import type { PeriodeRegime } from './regime.js';

export type CodeErreurPeriodeTva = 'exercice_invalide' | 'transition_interdite' | 'accuse_manquant' | 'periode_deposee';

export class ErreurPeriodeTva extends Error {
  override name = 'ErreurPeriodeTva';
  readonly code: CodeErreurPeriodeTva;
  constructor(code: CodeErreurPeriodeTva) {
    super(code);
    this.code = code;
  }
}

export type StatutPeriodeTva = 'ouverte' | 'preparee' | 'validee' | 'deposee_par_client' | 'verrouillee';
export type PeriodeDeclaration = { debut: string; fin: string; periodicite: PeriodeRegime['periodicite']; formulaire: string };
export type PeriodeTva = PeriodeDeclaration & { statut: StatutPeriodeTva; accusePieceId?: string };

const MOIS_PAR_TRIMESTRE = 3;

const SUIVANTS: Readonly<Record<StatutPeriodeTva, readonly StatutPeriodeTva[]>> = {
  ouverte: ['preparee'],
  preparee: ['validee', 'ouverte'],
  validee: ['deposee_par_client'],
  deposee_par_client: ['verrouillee'],
  verrouillee: [],
};

/** Fin de la période qui commence à `debut`, avant coupure : fin du mois, ou du trimestre civil. */
function finNaturelle(debut: string, periodicite: PeriodeRegime['periodicite'], finSegment: string): string {
  if (periodicite === 'annuelle') return finSegment;
  const mois = Number(debut.slice(5, 7));
  const reste = periodicite === 'mensuelle' ? 0 : (MOIS_PAR_TRIMESTRE - (mois % MOIS_PAR_TRIMESTRE)) % MOIS_PAR_TRIMESTRE;
  const fin = finDeMois(ajouterMois(debut, reste));
  return comparerDates(fin, finSegment) > 0 ? finSegment : fin;
}

export function periodesTva(exercice: { debut: string; fin: string }, historiqueRegime: readonly PeriodeRegime[]): PeriodeDeclaration[] {
  if (!estDateValide(exercice.debut) || !estDateValide(exercice.fin) || comparerDates(exercice.debut, exercice.fin) > 0) {
    throw new ErreurPeriodeTva('exercice_invalide');
  }
  const liste: PeriodeDeclaration[] = [];
  let courant = exercice.debut;
  while (comparerDates(courant, exercice.fin) <= 0) {
    const r = regimeAuJour(historiqueRegime, courant);
    const finRegime = r.effetFin === null ? exercice.fin : ajouterJours(r.effetFin, -1);
    const finSegment = comparerDates(finRegime, exercice.fin) < 0 ? finRegime : exercice.fin;
    let debut = courant;
    while (r.regime !== 'franchise' && r.regime !== 'non_assujetti' && comparerDates(debut, finSegment) <= 0) {
      const fin = finNaturelle(debut, r.periodicite, finSegment);
      liste.push({ debut, fin, periodicite: r.periodicite, formulaire: r.formulaire });
      debut = ajouterJours(fin, 1);
    }
    courant = ajouterJours(finSegment, 1);
  }
  return liste;
}

export function changerStatut(periode: PeriodeTva, vers: StatutPeriodeTva, opts: { accusePieceId?: string | undefined }): PeriodeTva {
  const permis = SUIVANTS[periode.statut] as readonly StatutPeriodeTva[] | undefined;
  if (permis === undefined || !permis.includes(vers)) {
    const depose = periode.statut === 'deposee_par_client' || periode.statut === 'verrouillee';
    throw new ErreurPeriodeTva(depose && vers === 'ouverte' ? 'periode_deposee' : 'transition_interdite');
  }
  if (vers !== 'deposee_par_client') return { ...periode, statut: vers };
  const accuse = opts.accusePieceId;
  if (accuse === undefined || accuse.trim() === '') throw new ErreurPeriodeTva('accuse_manquant');
  return { ...periode, statut: vers, accusePieceId: accuse };
}
