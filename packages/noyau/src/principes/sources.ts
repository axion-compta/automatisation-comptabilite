// Pas de source, pas de constat : sans source, une décision est une hypothèse.
import { proportionPointsDeBase } from '../argent/index.js';

export type Source =
  | { readonly type: 'piece'; readonly pieceId: string; readonly page: number; readonly zone: string; readonly archivee?: boolean }
  | { readonly type: 'regle'; readonly code: string; readonly version: string }
  | { readonly type: 'historique'; readonly ecritureId: string }
  | { readonly type: 'parametre'; readonly cle: string; readonly dateEffet: string };

export type Confiance = 'sur' | 'probable' | 'a_verifier';

export class ErreurSource extends Error {
  override name = 'ErreurSource';
  readonly code = 'source_invalide';
}

const texte = (v: unknown): boolean => typeof v === 'string' && v.trim() !== '';

function valide(s: unknown): boolean {
  if (typeof s !== 'object' || s === null) return false;
  const o = s as Record<string, unknown>;
  switch (o.type) {
    case 'piece':
      return texte(o.pieceId) && texte(o.zone) && Number.isSafeInteger(o.page) && (o.page as number) >= 1;
    case 'regle':
      return texte(o.code) && texte(o.version);
    case 'historique':
      return texte(o.ecritureId);
    case 'parametre':
      return texte(o.cle) && texte(o.dateEffet);
    default:
      return false;
  }
}

function aUneSource(sources: readonly Source[]): boolean {
  if (!sources.every(valide)) throw new ErreurSource('Source mal formée.');
  return sources.length > 0;
}

export function qualifierDecision(d: { readonly sources: readonly Source[]; readonly confiance: Confiance }): {
  hypothese: boolean;
  confiance: Confiance;
  lotVertPermis: boolean;
} {
  const hypothese = !aUneSource(d.sources);
  const confiance: Confiance = hypothese ? 'a_verifier' : d.confiance;
  return { hypothese, confiance, lotVertPermis: !hypothese && confiance !== 'a_verifier' };
}

/** Mode `inferieur` : la part affichée ne dépasse jamais la part réelle (pas de surestimation). */
export function indicateurSources(decisions: readonly { readonly id: string; readonly sources: readonly Source[] }[]): {
  total: number;
  avecSource: number;
  hypotheses: string[];
  proportionPointsDeBase: number | null;
} {
  const hypotheses = decisions.filter((d) => !aUneSource(d.sources)).map((d) => d.id).sort();
  const total = decisions.length;
  const avecSource = total - hypotheses.length;
  return { total, avecSource, hypotheses, proportionPointsDeBase: proportionPointsDeBase(avecSource, total, 'inferieur') };
}
