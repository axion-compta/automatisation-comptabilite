// Instantanés du tableau de bord (TB-R8) : fonctions pures, aucune horloge, jamais de chiffre périmé.
import { comparerDates, estDateValide } from '../dates/civiles.js';
import type { CodeBloc, Periode } from '../interface/types.js';

export interface Instantane {
  periode: Periode;
  bloc: CodeBloc;
  versionEcritures: number;
  invalide: boolean;
}

export type EvenementEcriture = 'validee' | 'corrigee' | 'contre_passee' | 'validation_annulee';
const EVENEMENTS: readonly string[] = ['validee', 'corrigee', 'contre_passee', 'validation_annulee'];

function exigerDate(date: string): void {
  if (typeof date !== 'string' || !estDateValide(date)) throw new Error('date_invalide');
}

const contient = (p: Periode, date: string): boolean => comparerDates(p.debut, date) <= 0 && comparerDates(date, p.fin) <= 0;

export function doitRecalculer(instantane: Instantane, versionCourante: number): boolean {
  if (!Number.isSafeInteger(versionCourante) || versionCourante < 0) throw new Error('version_invalide');
  return instantane.invalide || instantane.versionEcritures !== versionCourante;
}

export function appliquerEvenement(
  instantanes: readonly Instantane[],
  evenement: { type: EvenementEcriture; date: string },
): Instantane[] {
  if (!EVENEMENTS.includes(evenement.type)) throw new Error('evenement_inconnu');
  exigerDate(evenement.date);
  return instantanes.map((i) => (contient(i.periode, evenement.date) ? { ...i, invalide: true } : i));
}

export function carteAntidatee(date: string, periodesDeclarees: readonly Periode[]): boolean {
  exigerDate(date);
  return periodesDeclarees.some((p) => contient(p, date));
}
