import { ErreurSecurite, type Action } from './types.js';

export type AccesExpert = {
  societeId: string;
  personneId: string;
  perimetre: { exercices: string[]; journaux: string[]; comptesBancaires: string[] };
  mode: 'lecture_commentaire';
  expireLe: string;
  revoqueLe?: string;
};
export type DemandeExpert = { action: Action; exercice?: string; journal?: string; compteBancaire?: string };
export type VerdictExpert =
  | { permis: true }
  | { permis: false; raison: 'acces_revoque' | 'acces_expire' | 'perimetre_expert'; evenement?: 'securite.acces_expert_expire' };

const ACTIONS_EXPERT: readonly Action[] = ['lire', 'exporter', 'commenter'];

const invalide = (m: string): never => {
  throw new ErreurSecurite('argument_invalide', m);
};

const instant = (s: unknown): number => {
  const ok = typeof s === 'string' && s.endsWith('Z') && s.charAt(4) === '-' && s.charAt(10) === 'T';
  const ms = ok ? Date.parse(s) : NaN;
  return Number.isFinite(ms) ? ms : invalide('instant ISO 8601 UTC attendu');
};

const entierPositif = (n: unknown): number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 ? n : invalide('entier positif ou nul attendu');

const estRevoque = (a: AccesExpert, t: number): boolean =>
  a.revoqueLe !== undefined && instant(a.revoqueLe) <= t;

export function verifierAccesExpert(acces: AccesExpert, demande: DemandeExpert, maintenant: string): VerdictExpert {
  const t = instant(maintenant);
  if (estRevoque(acces, t)) return { permis: false, raison: 'acces_revoque' };
  if (t >= instant(acces.expireLe)) {
    return { permis: false, raison: 'acces_expire', evenement: 'securite.acces_expert_expire' };
  }
  const p = acces.perimetre;
  const hors =
    !ACTIONS_EXPERT.includes(demande.action) ||
    (demande.exercice !== undefined && !p.exercices.includes(demande.exercice)) ||
    (demande.journal !== undefined && !p.journaux.includes(demande.journal)) ||
    (demande.compteBancaire !== undefined && !p.comptesBancaires.includes(demande.compteBancaire));
  return hors ? { permis: false, raison: 'perimetre_expert' } : { permis: true };
}

export function prolonger(acces: AccesExpert, maintenant: string, dureeMs: number): AccesExpert {
  const t = instant(maintenant);
  const ajout = entierPositif(dureeMs);
  if (estRevoque(acces, t)) throw new ErreurSecurite('acces_revoque');
  return { ...acces, perimetre: { ...acces.perimetre }, expireLe: new Date(t + ajout).toISOString() };
}

export function doitAvertir(acces: AccesExpert, maintenant: string, preavisMs: number, dejaAverti: boolean): boolean {
  const t = instant(maintenant);
  const preavis = entierPositif(preavisMs);
  if (dejaAverti || estRevoque(acces, t)) return false;
  const fin = instant(acces.expireLe);
  return t < fin && fin - t <= preavis;
}
