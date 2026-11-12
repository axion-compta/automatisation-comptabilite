import { genererDeclarations, type JeuDeclarations } from '../../../donnees-fictives/src/declarations.js';
import type { ResultatControle, TraceControle } from './controles.js';

export interface OptionsTraces { resultat?: ResultatControle | undefined; limite?: number | undefined; decalage?: number | undefined }

const RANG: Record<TraceControle['gravite'], number> = { B: 0, M: 1, m: 2, I: 3 };
const comparer = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Tri : non OK d'abord (B, M, m, I), puis horodatage décroissant. IMPOSSIBLE reste un non OK (V3-PRI-007). */
export function trierTraces(traces: TraceControle[]): TraceControle[] {
  return [...traces].sort((a, b) => Number(a.resultat === 'OK') - Number(b.resultat === 'OK') || RANG[a.gravite] - RANG[b.gravite] || comparer(b.horodatage, a.horodatage) || comparer(a.regleId + a.objetId, b.regleId + b.objetId));
}

/** Service pur en mémoire sur `genererDeclarations()` ; `supplementaires` injecte d'autres résultats du moteur. Lecture seulement. */
export function creerServiceControles(jeu: JeuDeclarations = genererDeclarations(), supplementaires: TraceControle[] = []) {
  const traces: TraceControle[] = [
    ...jeu.traces.map((t): TraceControle => ({ ...t, gravite: t.gravite === 'bloquante' ? 'B' : 'I', resultat: t.resultat === 'ok' ? 'OK' : 'ALERTE' })),
    ...supplementaires.map((t) => ({ ...t })),
  ];
  const exercices = new Set([...jeu.fec.map((f) => f.exerciceId), ...jeu.periodesTva.map((p) => p.exerciceId), ...jeu.estimations.map((e) => e.exerciceId)]);
  return {
    /** Exercice d'une trace = année de son horodatage (jeu fictif). `undefined` si l'exercice est inconnu. */
    lister(exercice: string, o: OptionsTraces = {}): { body: TraceControle[]; decalage: number; total: number } | undefined {
      if (!exercices.has(exercice)) return undefined;
      const choisies = trierTraces(traces.filter((t) => `EX${t.horodatage.slice(0, 4)}` === exercice && (o.resultat === undefined || t.resultat === o.resultat)));
      const decalage = o.decalage ?? 0;
      return { body: choisies.slice(decalage, o.limite === undefined ? undefined : decalage + o.limite), decalage, total: choisies.length };
    },
  };
}
export type ServiceControles = ReturnType<typeof creerServiceControles>;
