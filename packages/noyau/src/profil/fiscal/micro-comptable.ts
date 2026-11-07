import type { Centimes } from '../../argent/index.js';
import { ErreurProfil } from '../types.js';

export type SourceTaille = 'exercice_clos' | 'estimation' | 'je_ne_sais_pas';
export type TailleExercice = {
  totalBilanCentimes: Centimes | null;
  caNetCentimes: Centimes | null;
  effectifMoyen: number | null;
  source: SourceTaille;
};
export type SeuilsMicroComptable = { bilanMax: Centimes; caMax: Centimes; effectifMax: number; criteresRequis: number };
/** Pour chaque critère : vrai = non dépassé, faux = dépassé, null = inconnu. */
export type CriteresMicro = [boolean | null, boolean | null, boolean | null];
export type ResultatMicroComptable = {
  microComptable: boolean | null;
  nonDepasses: number;
  inconnus: number;
  dispensesProposees: boolean;
  regleDureeAVerifier: true;
  criteres: CriteresMicro;
};

const NB_CRITERES = 3;
const SOURCES: readonly string[] = ['exercice_clos', 'estimation', 'je_ne_sais_pas'];

const entier = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;

function invalide(): never {
  throw new ErreurProfil('entree_invalide');
}

const sous = (valeur: number | null, max: number): boolean | null => (valeur === null ? null : valeur <= max);

/** Micro-entreprise au sens comptable : `criteresRequis` seuils non dépassés ; la dispense est seulement proposée. */
export function evaluerMicroComptable(t: TailleExercice, s: SeuilsMicroComptable): ResultatMicroComptable {
  if (!entier(s.bilanMax) || !entier(s.caMax) || !entier(s.effectifMax)) invalide();
  if (!Number.isSafeInteger(s.criteresRequis) || s.criteresRequis < 1 || s.criteresRequis > NB_CRITERES) invalide();
  if (!SOURCES.includes(t.source)) invalide();
  for (const v of [t.totalBilanCentimes, t.caNetCentimes, t.effectifMoyen]) if (v !== null && !entier(v)) invalide();

  const inconnue = t.source === 'je_ne_sais_pas';
  const criteres: CriteresMicro = inconnue
    ? [null, null, null]
    : [sous(t.totalBilanCentimes, s.bilanMax), sous(t.caNetCentimes, s.caMax), sous(t.effectifMoyen, s.effectifMax)];
  const nonDepasses = criteres.filter((c) => c === true).length;
  const inconnus = criteres.filter((c) => c === null).length;
  const microComptable = nonDepasses >= s.criteresRequis ? true : nonDepasses + inconnus >= s.criteresRequis ? null : false;
  return { microComptable, nonDepasses, inconnus, dispensesProposees: microComptable === true, regleDureeAVerifier: true, criteres };
}

/** Vrai si un critère bascule (non dépassé / dépassé) ou si la conclusion change. */
export function confirmationDemandee(precedent: ResultatMicroComptable, actuel: ResultatMicroComptable): boolean {
  if (precedent.microComptable !== actuel.microComptable) return true;
  return precedent.criteres.some((c, i) => c !== null && actuel.criteres[i] !== null && c !== actuel.criteres[i]);
}
