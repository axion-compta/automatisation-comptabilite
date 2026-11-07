import { estDans, NIVEAUX, type CodeErreur, type Niveau } from './types.js';

// Gardien de sortie : après l'appel, l'outil demandé doit être permis à l'agent ET au rôle.
// Le niveau de l'outil vient du registre, jamais du modèle. Le rôle est un argument.
export const SORTES_AGENT = ['chat', 'specialiste', 'chef_pole', 'directeur', 'lecteur'] as const;
export type SorteAgent = (typeof SORTES_AGENT)[number];

const NIVEAUX_PAR_SORTE: Record<SorteAgent, readonly Niveau[]> = {
  chat: ['L', 'B'],
  specialiste: ['L', 'B'],
  chef_pole: ['L'],
  directeur: ['L'],
  lecteur: [],
};

/** Niveaux d'outil directs ; M ne passe que par une proposition. Sorte inconnue : aucun. */
export function niveauxPermisAgent(sorte: SorteAgent): readonly Niveau[] {
  return estDans(SORTES_AGENT, sorte) ? NIVEAUX_PAR_SORTE[sorte] : [];
}

export interface EntreeOutil {
  outil: string;
  niveauOutil: Niveau;
  sorteAgent: SorteAgent;
  outilsPermisAgent: readonly string[];
  roleLectureSeule: boolean;
}
export type SortieOutil = { permis: true } | { permis: false; code: Extract<CodeErreur, 'outil_hors_liste' | 'droit_insuffisant'> };

const HORS_LISTE = { permis: false, code: 'outil_hors_liste' } as const;
const DROIT = { permis: false, code: 'droit_insuffisant' } as const;

export function verifierOutil(e: EntreeOutil): SortieOutil {
  const outil = typeof e.outil === 'string' ? e.outil : '';
  if (outil.trim().toLowerCase() === 'appliquer') return HORS_LISTE;
  if (!estDans(NIVEAUX, e.niveauOutil) || e.niveauOutil === 'I') return HORS_LISTE;
  if (!Array.isArray(e.outilsPermisAgent) || !e.outilsPermisAgent.includes(outil)) return HORS_LISTE;
  if (!niveauxPermisAgent(e.sorteAgent).includes(e.niveauOutil)) return DROIT;
  if (typeof e.roleLectureSeule !== 'boolean') return DROIT;
  if (e.roleLectureSeule && e.niveauOutil !== 'L') return DROIT;
  return { permis: true };
}
