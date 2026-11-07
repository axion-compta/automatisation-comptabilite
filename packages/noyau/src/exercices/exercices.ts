// Exercices comptables et périodes mensuelles. Dates en chaînes AAAA-MM-JJ, sans fuseau horaire.
// Les bornes de durée sont des valeurs légales : elles sont toujours passées en argument.

export interface Exercice {
  id: string;
  debut: string;
  fin: string;
}

export interface BornesDuree {
  minMois: number;
  maxMois: number;
}

export interface PeriodeMensuelle {
  debut: string;
  fin: string;
  cle: string;
}

export type MotifRefusExercice = 'fin_avant_debut' | 'duree_hors_bornes';

export interface ResultatCreationExercice {
  resultat: 'accepte' | 'refuse' | 'a_verifier';
  exercice?: Exercice;
  motif?: MotifRefusExercice | 'dates_non_alignees';
}

export interface EtatVerrou {
  periodesVerrouillees: string[];
  exerciceCloture: boolean;
}

interface Jma {
  a: number;
  m: number;
  j: number;
}

function decouper(date: string): Jma {
  const [a, m, j] = date.split('-').map(Number);
  return { a: a as number, m: m as number, j: j as number };
}

function bissextile(a: number): boolean {
  return (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
}

function joursDuMois(a: number, m: number): number {
  if (m === 2) return bissextile(a) ? 29 : 28;
  return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

function deux(n: number): string {
  return String(n).padStart(2, '0');
}

function dateDe(a: number, m: number, j: number): string {
  return `${String(a).padStart(4, '0')}-${deux(m)}-${deux(j)}`;
}

/** Nombre de mois civils couverts, et vrai si debut est un premier du mois et fin un dernier jour du mois. */
export function dureeEnMois(debut: string, fin: string): { mois: number; aligne: boolean } {
  const d = decouper(debut);
  const f = decouper(fin);
  const mois = (f.a * 12 + f.m) - (d.a * 12 + d.m) + 1;
  const aligne = d.j === 1 && f.j === joursDuMois(f.a, f.m);
  return { mois, aligne };
}

export function creerExercice(
  demande: Exercice,
  bornes: BornesDuree,
): ResultatCreationExercice {
  if (demande.fin < demande.debut) return { resultat: 'refuse', motif: 'fin_avant_debut' };
  const { mois, aligne } = dureeEnMois(demande.debut, demande.fin);
  if (mois < bornes.minMois || mois > bornes.maxMois) {
    return { resultat: 'refuse', motif: 'duree_hors_bornes' };
  }
  if (!aligne) return { resultat: 'a_verifier', motif: 'dates_non_alignees' };
  return { resultat: 'accepte', exercice: { id: demande.id, debut: demande.debut, fin: demande.fin } };
}

export function periodesMensuelles(exercice: Exercice): PeriodeMensuelle[] {
  const d = decouper(exercice.debut);
  const { mois } = dureeEnMois(exercice.debut, exercice.fin);
  const liste: PeriodeMensuelle[] = [];
  for (let i = 0; i < mois; i++) {
    const indice = d.a * 12 + (d.m - 1) + i;
    const a = Math.floor(indice / 12);
    const m = (indice % 12) + 1;
    liste.push({
      debut: dateDe(a, m, 1),
      fin: dateDe(a, m, joursDuMois(a, m)),
      cle: `${String(a).padStart(4, '0')}-${deux(m)}`,
    });
  }
  return liste;
}

/** Clé AAAA-MM de la période contenant la date, ou undefined hors exercice. */
export function periodeDe(date: string, exercice: Exercice): string | undefined {
  if (date < exercice.debut || date > exercice.fin) return undefined;
  return date.slice(0, 7);
}

export function estVerrouillee(date: string, etat: EtatVerrou): boolean {
  return etat.exerciceCloture || etat.periodesVerrouillees.includes(date.slice(0, 7));
}
