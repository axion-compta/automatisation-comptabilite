// Dépôt de l'IA : interface et adaptateur en mémoire (la base réelle se branche plus tard, sans changer l'appelant).
import { AppelIa, DecisionIa } from '../../../../packages/contrat/src/chat/journal-ia.js';
import { POLES, estDans, type Pole } from '../../../../packages/noyau/src/chat/types.js';
import { retourArriere, type LigneReglage } from '../../../../packages/noyau/src/agents/changement-modele.js';
import { verifierPropriete, type Propriete } from '../../../../packages/noyau/src/agents/hierarchie.js';

export const PREREGLAGES = ['rapide', 'precis'] as const;
export type Prereglage = (typeof PREREGLAGES)[number];

export type CodeErreurDepotIa = 'invalide' | 'doublon' | 'appel_inconnu' | 'ordre_inverse';
export class ErreurDepotIa extends Error {
  override name = 'ErreurDepotIa';
  constructor(readonly code: CodeErreurDepotIa) { super(code); }
}

export interface DepotIa {
  ecrireAppel(a: AppelIa): void;
  ecrireDecision(d: DecisionIa): void;
  appels(): readonly AppelIa[];
  decisions(): readonly DecisionIa[];
  pourquoi(decisionId: string): { decision: DecisionIa; appel: AppelIa } | undefined;
  regler(prereglage: Prereglage, alias: string, le: string): LigneReglage;
  historique(prereglage: Prereglage): readonly LigneReglage[];
  precedent(prereglage: Prereglage): LigneReglage | null;
  definirPropriete(type: string, pole: Pole): void;
  propriete(): Readonly<Record<string, Pole>>;
  verifierPropriete(typesConnus: readonly string[]): Propriete;
}

const ALIAS = /^[a-z0-9_.-]+$/;
const copie = <T>(v: T): Readonly<T> => Object.freeze(structuredClone(v));
const invalide = (): never => { throw new ErreurDepotIa('invalide'); };
const valider = <T>(s: { safeParse(v: unknown): { success: true; data: T } | { success: false } }, v: unknown): T => {
  const r = s.safeParse(v);
  return r.success ? r.data : invalide();
};
const estDate = (t: string): boolean => /^\d{4}-\d{2}-\d{2}T/.test(t) && !Number.isNaN(Date.parse(t));

export function creerDepotIaMemoire(): DepotIa {
  const appels = new Map<string, AppelIa>();
  const decisions = new Map<string, DecisionIa>();
  const reglages = new Map<Prereglage, LigneReglage[]>(PREREGLAGES.map((p) => [p, []]));
  const proprietes = new Map<string, Pole>();
  const lignes = (p: Prereglage): LigneReglage[] => reglages.get(p) ?? (invalide() as never);

  return {
    ecrireAppel(a) {
      const v = valider(AppelIa, a);
      if (appels.has(v.id)) throw new ErreurDepotIa('doublon');
      appels.set(v.id, copie(v));
    },
    ecrireDecision(d) {
      const v = valider(DecisionIa, d);
      if (decisions.has(v.id)) throw new ErreurDepotIa('doublon');
      if (!appels.has(v.appel_id)) throw new ErreurDepotIa('appel_inconnu');
      decisions.set(v.id, copie(v));
    },
    appels: () => Object.freeze([...appels.values()].map(copie)),
    decisions: () => Object.freeze([...decisions.values()].map(copie)),
    pourquoi(id) {
      const decision = decisions.get(id);
      const appel = decision === undefined ? undefined : appels.get(decision.appel_id);
      return decision === undefined || appel === undefined ? undefined : { decision: copie(decision), appel: copie(appel) };
    },
    regler(prereglage, alias, le) {
      const h = lignes(prereglage);
      if (!ALIAS.test(alias) || !estDate(le)) invalide();
      if (h.some((l) => l.le > le)) throw new ErreurDepotIa('ordre_inverse');
      const ligne = { version: h.length + 1, alias, le };
      h.push(ligne);
      return copie(ligne);
    },
    historique: (p) => Object.freeze(lignes(p).map(copie)),
    precedent: (p) => retourArriere(lignes(p)),
    definirPropriete(type, pole) {
      if (type === '' || !estDans(POLES, pole)) invalide();
      proprietes.set(type, pole);
    },
    propriete: () => Object.freeze(Object.fromEntries(proprietes)),
    verifierPropriete: (types) => verifierPropriete(types, Object.fromEntries(proprietes)),
  };
}
