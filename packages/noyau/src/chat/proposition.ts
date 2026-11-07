// Proposition du chat : fonctions pures, horloge en argument (ISO). Seul le geste d'une personne applique.
import type { Centimes } from '../argent/index.js';
import { ErreurChat, type EtatProposition, type Niveau } from './types.js';

export type Proposition = {
  readonly id: string;
  readonly outil: string;
  readonly niveau: Niveau;
  readonly cibles: readonly string[];
  readonly avant: unknown;
  readonly apres: unknown;
  readonly montantTotal?: Centimes;
  readonly nombreObjets: number;
  readonly creeLe: string;
  readonly expireLe: string;
  readonly etat: EtatProposition;
  readonly cleApplication?: string;
};

export type EntreeProposition = {
  id: string;
  outil: string;
  niveau: Niveau;
  cibles: readonly string[];
  avant: unknown;
  apres: unknown;
  montantTotal?: Centimes;
  creeLe: string;
  dureeMs: number;
};

export type ContexteApplication = {
  acteur: string;
  cle: string;
  maintenant: string;
  niveauIOuvert: boolean;
};

const invalide = () => new ErreurChat('parametre_invalide');

function instant(iso: string): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) throw invalide();
  return t;
}

export function creerProposition(e: EntreeProposition): Proposition {
  const distinctes = new Set(e.cibles);
  if (e.cibles.length === 0 || distinctes.size !== e.cibles.length) throw invalide();
  if (!Number.isSafeInteger(e.dureeMs) || e.dureeMs <= 0) throw invalide();
  const expireLe = new Date(instant(e.creeLe) + e.dureeMs).toISOString();
  const { id, outil, niveau, avant, apres, creeLe } = e;
  const p: Proposition = { id, outil, niveau, avant, apres, creeLe, cibles: [...e.cibles], nombreObjets: distinctes.size, expireLe, etat: 'proposee' };
  return e.montantTotal === undefined ? p : { ...p, montantTotal: e.montantTotal };
}

export function appliquer(
  p: Proposition,
  c: ContexteApplication,
): { proposition: Proposition; effet: 'applique' | 'deja_applique' } {
  if (c.acteur !== 'personne') throw new ErreurChat('acteur_non_humain');
  if (p.niveau === 'I' && !c.niveauIOuvert) throw new ErreurChat('niveau_ferme');
  if (c.cle === '') throw invalide();
  if (p.etat === 'appliquee') {
    if (p.cleApplication !== c.cle) throw invalide();
    return { proposition: p, effet: 'deja_applique' };
  }
  if (p.etat !== 'proposee') throw new ErreurChat('proposition_inconnue');
  if (instant(c.maintenant) >= instant(p.expireLe)) throw new ErreurChat('proposition_expiree');
  return { proposition: { ...p, etat: 'appliquee', cleApplication: c.cle }, effet: 'applique' };
}

export function refuser(p: Proposition): Proposition {
  if (p.etat !== 'proposee') throw new ErreurChat('proposition_inconnue');
  return { ...p, etat: 'refusee' };
}

export function expirer(p: Proposition, maintenant: string): Proposition {
  if (p.etat !== 'proposee' || instant(maintenant) < instant(p.expireLe)) return p;
  return { ...p, etat: 'expiree' };
}
