import { genererCompta } from '../../../donnees-fictives/src/compta.js';
import type { CompteDuPlan, Exercice } from './plan.js';

type Page<T> = { body: T[]; decalage: number; total: number };
export interface OptionsPlan {
  classe?: number | undefined;
  q?: string | undefined;
  limite?: number | undefined;
  decalage?: number | undefined;
}

/** Minuscules sans accents, pour la recherche. */
export const normaliser = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

function tranche<T>(tout: T[], decalage = 0, limite?: number): Page<T> {
  const fin = limite === undefined ? undefined : decalage + limite;
  return { body: tout.slice(decalage, fin), decalage, total: tout.length };
}

/** Service en mémoire pur, bâti sur le jeu fictif (profil pleine). */
export function creerServicePlan() {
  const societe = genererCompta().societes.find((s) => s.profil === 'pleine');
  if (!societe) throw new Error('PROFIL_PLEINE_ABSENT');
  const exercices: Exercice[] = [...societe.exercices].sort((a, b) => (a.debut < b.debut ? 1 : a.debut > b.debut ? -1 : 0));

  return {
    exercices: (): Page<Exercice> => tranche(exercices),
    /** `undefined` si l'exercice est inconnu. */
    plan(idExercice: string, options: OptionsPlan = {}): Page<CompteDuPlan> | undefined {
      const ex = exercices.find((e) => e.id === idExercice);
      if (!ex) return undefined;
      const soldes = new Map<string, number>();
      for (const e of societe.ecritures) {
        if (e.statut !== 'validee' || e.date < ex.debut || e.date > ex.fin) continue;
        for (const l of e.lignes) soldes.set(l.compte, (soldes.get(l.compte) ?? 0) + l.debitCentimes - l.creditCentimes);
      }
      const q = normaliser(options.q ?? '');
      const comptes = societe.plan
        .filter((c) => options.classe === undefined || c.classe === options.classe)
        .filter((c) => q === '' || normaliser(c.numero).includes(q) || normaliser(c.libelle).includes(q))
        .map((c) => ({ numero: c.numero, libelle: c.libelle, classe: c.classe, soldeCentimes: soldes.get(c.numero) ?? 0 }));
      return tranche(comptes, options.decalage, options.limite);
    },
  };
}
