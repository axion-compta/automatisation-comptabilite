import { genererDeclarations, type JeuDeclarations } from '../../../donnees-fictives/src/declarations.js';
import type { DeclarationTva, EstimationTva, PeriodeTva } from './tva.js';

export interface OptionsPeriodes {
  limite?: number | undefined;
  decalage?: number | undefined;
}

const MENTION = 'prepare_par_ia' as const;
const comparer = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Service pur en mémoire, bâti sur `genererDeclarations()` (L03-T31). Lecture seulement. */
export function creerServiceTva(jeu: JeuDeclarations = genererDeclarations()) {
  const periodes: PeriodeTva[] = jeu.periodesTva.map((p) => ({ ...p })).sort((a, b) => comparer(a.debut, b.debut) || comparer(a.id, b.id));
  const exercices = new Set([...periodes.map((p) => p.exerciceId), ...jeu.estimations.map((e) => e.exerciceId)]);
  const controles: DeclarationTva['controles'] = [];
  for (const t of jeu.traces) {
    const existant = controles.find((c) => c.regleId === t.regleId);
    if (!existant) controles.push({ regleId: t.regleId, resultat: t.resultat });
    else if (t.resultat === 'ecart') existant.resultat = 'ecart';
  }
  controles.sort((a, b) => comparer(a.regleId, b.regleId));

  return {
    /** `undefined` si l'exercice est inconnu. */
    periodes(exercice: string, options: OptionsPeriodes = {}): { body: PeriodeTva[]; decalage: number; total: number } | undefined {
      if (!exercices.has(exercice)) return undefined;
      const choisies = periodes.filter((p) => p.exerciceId === exercice);
      const decalage = options.decalage ?? 0;
      const fin = options.limite === undefined ? undefined : decalage + options.limite;
      return { body: choisies.slice(decalage, fin), decalage, total: choisies.length };
    },
    /** Sans montant quand l'état est `non_calculee`. `undefined` si l'exercice est inconnu. */
    estimation(exercice: string): EstimationTva | undefined {
      const e = jeu.estimations.find((x) => x.exerciceId === exercice);
      if (!e) return undefined;
      if (e.etat === 'calculee') return { exerciceId: e.exerciceId, etat: 'calculee', collecteeCentimes: e.collecteeCentimes ?? 0, deductibleCentimes: e.deductibleCentimes ?? 0 };
      return {
        exerciceId: e.exerciceId,
        etat: 'non_calculee',
        motif: e.motif ?? 'tva_en_doute',
        ...(e.piecesARegarder !== undefined ? { piecesARegarder: e.piecesARegarder } : {}),
      };
    },
    declaration(id: string): DeclarationTva | undefined {
      const d = jeu.declarations.find((x) => x.id === id);
      if (!d) return undefined;
      return {
        id: d.id,
        periodeId: d.periodeId,
        formulaire: d.formulaire,
        millesime: d.millesime,
        mention: MENTION,
        versionPaquet: d.versionPaquet,
        statut: d.statut,
        validePar: d.validePar,
        valideLe: d.valideLe,
        cases: d.cases.map((c) => ({ code: c.code, montantCentimes: c.montantCentimes, baseCentimes: c.baseCentimes, sources: c.sources.map((s) => ({ ...s })) })),
        controles: controles.map((c) => ({ ...c })),
      };
    },
  };
}
export type ServiceTva = ReturnType<typeof creerServiceTva>;
