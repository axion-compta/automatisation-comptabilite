// Offre du client lue depuis la console : le module LIT et obéit, il ne fixe rien d'autre.
import { ErreurAbonnement } from './types.js';

export const MODES_IA = ['axion', 'client_direct'] as const;
export type ModeIa = (typeof MODES_IA)[number];

export type Offre = {
  palier: string;
  quotaCompris: number;
  quotaUtilise: number;
  uniteQuota: string; // paramètre à confirmer (D71), jamais écrit en dur
  libreService: boolean;
  modeIa: ModeIa;
  modesArrivee: readonly string[];
};

export type ActionChangement = 'lien_portail' | 'demande_palier';

export type ServiceOffre = { lire(clientId: string): Promise<Offre | null> };

const CLES = ['palier', 'quotaCompris', 'quotaUtilise', 'uniteQuota', 'libreService', 'modeIa', 'modesArrivee'];
const texte = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const entier = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

export function validerOffre(entree: unknown): Offre {
  if (typeof entree !== 'object' || entree === null || Array.isArray(entree)) throw new ErreurAbonnement('parametre_invalide');
  const o = entree as Record<string, unknown>;
  if (Object.keys(o).some((k) => !CLES.includes(k))) throw new ErreurAbonnement('champ_inconnu');
  if (!texte(o.palier) || !texte(o.uniteQuota)) throw new ErreurAbonnement('parametre_invalide');
  if (!entier(o.quotaCompris) || !entier(o.quotaUtilise)) throw new ErreurAbonnement('entier_invalide');
  if (typeof o.libreService !== 'boolean') throw new ErreurAbonnement('parametre_invalide');
  if (!MODES_IA.includes(o.modeIa as ModeIa)) throw new ErreurAbonnement('parametre_invalide');
  const m = o.modesArrivee;
  if (!Array.isArray(m) || m.length === 0 || !m.every(texte) || new Set(m).size !== m.length) {
    throw new ErreurAbonnement('parametre_invalide');
  }
  return {
    palier: o.palier, quotaCompris: o.quotaCompris, quotaUtilise: o.quotaUtilise, uniteQuota: o.uniteQuota,
    libreService: o.libreService, modeIa: o.modeIa as ModeIa, modesArrivee: [...(m as string[])],
  };
}

// Fermé par défaut : sans offre lue, le client passe par une demande.
export function actionChangement(offre: Offre | null | undefined): ActionChangement {
  return offre?.libreService === true ? 'lien_portail' : 'demande_palier';
}
