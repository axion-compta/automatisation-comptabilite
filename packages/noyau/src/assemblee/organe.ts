// Organe d'approbation des comptes et modes de décision par forme. Les règles (datées, sourcées) viennent en argument.
import { comparerDates, estDateValide } from '../dates/civiles.js';
import type { Forme } from '../profil/types.js';

export type Organe = 'exploitant' | 'associe_unique' | 'assemblee_generale' | 'collectivite_associes' | 'gerant';
export type ModeApprobation =
  | 'assemblee'
  | 'consultation_ecrite'
  | 'acte_unanime'
  | 'visioconference'
  | 'decision_associe_unique'
  | 'rapport_gerant';
export type CasRegle = 'defaut' | 'associe_unique_dirigeant' | 'associe_unique_non_dirigeant' | 'sans_ag' | 'avec_ag';

export interface RegleOrgane {
  forme: Forme;
  cas: CasRegle;
  organe: Organe;
  modes: ModeApprobation[];
  selonStatuts: boolean;
  depotVautApprobation: boolean;
  valableAPartir: string;
  source: string;
}
export interface SocieteOrgane {
  forme: Forme;
  nbAssocies: number;
  /** Vrai seulement si l'associé unique est une personne physique, seul dirigeant (gérant ou président). */
  dirigeantAssocie?: boolean;
  dateReference: string;
}
export interface StatutsOrgane {
  modesPrevus?: ModeApprobation[];
  agPrevue?: boolean;
  visioconference?: boolean;
}
export interface ResultatOrgane {
  organe: Organe;
  modes: ModeApprobation[];
  depotVautApprobation: boolean;
  source: string;
}
export class ErreurOrgane extends Error {
  readonly code: 'entree_invalide' | 'regle_non_sourcee' | 'regle_absente';
  constructor(code: ErreurOrgane['code']) {
    super(code);
    this.name = 'ErreurOrgane';
    this.code = code;
  }
}

function casDe(s: SocieteOrgane, st: StatutsOrgane): CasRegle {
  if (s.forme === 'SCI') return st.agPrevue === true ? 'avec_ag' : 'sans_ag';
  if (s.forme === 'EI') return 'defaut';
  if (s.nbAssocies === 1) return s.dirigeantAssocie === true ? 'associe_unique_dirigeant' : 'associe_unique_non_dirigeant';
  return 'defaut';
}

export function organeApprobation(societe: SocieteOrgane, statuts: StatutsOrgane, regles: readonly RegleOrgane[]): ResultatOrgane {
  const n = societe.nbAssocies;
  const unipersonnelle = societe.forme === 'EURL' || societe.forme === 'SASU';
  if (!Number.isSafeInteger(n) || n < 1 || (unipersonnelle && n !== 1) || !estDateValide(societe.dateReference)) {
    throw new ErreurOrgane('entree_invalide');
  }
  for (const g of regles) {
    if (g.source.trim() === '' || !estDateValide(g.valableAPartir)) throw new ErreurOrgane('regle_non_sourcee');
  }
  const cas = casDe(societe, statuts);
  const regle = regles
    .filter((g) => g.forme === societe.forme && g.cas === cas && comparerDates(g.valableAPartir, societe.dateReference) <= 0)
    .sort((a, b) => comparerDates(b.valableAPartir, a.valableAPartir))[0];
  if (regle === undefined) throw new ErreurOrgane('regle_absente');
  const prevus = statuts.modesPrevus ?? [];
  const modes = regle.modes.filter((m) => !regle.selonStatuts || prevus.includes(m));
  if (statuts.visioconference === true && modes.includes('assemblee')) modes.push('visioconference');
  return { organe: regle.organe, modes, depotVautApprobation: regle.depotVautApprobation, source: regle.source };
}
