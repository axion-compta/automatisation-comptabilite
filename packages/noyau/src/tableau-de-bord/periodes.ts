// Périodes des trois vues et comparaison à l'exercice précédent (TB-R2). Codes seulement, aucun texte affiché.
import { ajouterJours, comparerDates, dateValide, joursEntre } from '../interface/dates.js';
import { estVue, type Periode, type Vue } from '../interface/types.js';

export type CodeErreurPeriode =
  | 'date_invalide'
  | 'jour_hors_exercice'
  | 'ordre_inverse'
  | 'hors_exercice'
  | 'vue_inconnue';

export class ErreurPeriode extends Error {
  readonly code: CodeErreurPeriode;
  constructor(code: CodeErreurPeriode) {
    super(code);
    this.name = 'ErreurPeriode';
    this.code = code;
  }
}

export interface ExerciceBorne {
  id: string;
  debut: string;
  fin: string;
}

export type Comparaison =
  | { debut: string; fin: string; tronquee?: true }
  | { vide: 'pas_d_exercice_precedent' | 'precedent_trop_court' };

const PREMIER_JOUR = '-01';
const PREMIER_MOIS = '-01-01';
const MOIS_DECEMBRE = 12;

function verifier(...dates: string[]): void {
  for (const d of dates) if (!dateValide(d)) throw new ErreurPeriode('date_invalide');
}

function verifierExercice(e: ExerciceBorne): void {
  verifier(e.debut, e.fin);
}

const avant = (a: string, b: string): boolean => comparerDates(a, b) < 0;

function finDuMois(jour: string): string {
  const a = Number(jour.slice(0, 4));
  const m = Number(jour.slice(5, 7));
  const suivant =
    m === MOIS_DECEMBRE
      ? String(a + 1) + PREMIER_MOIS
      : jour.slice(0, 5) + String(m + 1).padStart(2, '0') + PREMIER_JOUR;
  return ajouterJours(suivant, -1);
}

function plusTard(a: string, b: string): string {
  return avant(a, b) ? b : a;
}

function plusTot(a: string, b: string): string {
  return avant(a, b) ? a : b;
}

export function periodeDeVue(vue: Vue, exercice: ExerciceBorne, jour: string): Periode {
  verifierExercice(exercice);
  verifier(jour);
  if (!estVue(vue)) throw new ErreurPeriode('vue_inconnue');
  if (avant(jour, exercice.debut) || avant(exercice.fin, jour)) throw new ErreurPeriode('jour_hors_exercice');
  if (vue === 'exercice') return { debut: exercice.debut, fin: exercice.fin };
  if (vue === 'depuis_debut') return { debut: exercice.debut, fin: jour };
  const debutMois = jour.slice(0, 8) + PREMIER_JOUR.slice(1);
  return {
    debut: plusTard(debutMois, exercice.debut),
    fin: plusTot(finDuMois(jour), exercice.fin),
  };
}

export function periodeLibre(debut: string, fin: string, exercice: ExerciceBorne): Periode {
  verifierExercice(exercice);
  verifier(debut, fin);
  if (avant(fin, debut)) throw new ErreurPeriode('ordre_inverse');
  if (avant(debut, exercice.debut) || avant(exercice.fin, fin)) throw new ErreurPeriode('hors_exercice');
  return { debut, fin };
}

export function periodeComparaison(periode: Periode, exercice: ExerciceBorne, precedent?: ExerciceBorne): Comparaison {
  verifierExercice(exercice);
  verifier(periode.debut, periode.fin);
  if (avant(periode.fin, periode.debut)) throw new ErreurPeriode('ordre_inverse');
  if (precedent === undefined) return { vide: 'pas_d_exercice_precedent' };
  verifierExercice(precedent);
  const decalage = joursEntre(exercice.debut, periode.debut);
  const duree = joursEntre(periode.debut, periode.fin);
  const debut = ajouterJours(precedent.debut, decalage);
  if (avant(precedent.fin, debut)) return { vide: 'precedent_trop_court' };
  const fin = ajouterJours(debut, duree);
  if (avant(precedent.fin, fin)) return { debut, fin: precedent.fin, tronquee: true };
  return { debut, fin };
}
