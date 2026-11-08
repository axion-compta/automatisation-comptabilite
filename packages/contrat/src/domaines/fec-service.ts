import { genererDeclarations, type JeuDeclarations } from '../../../donnees-fictives/src/declarations.js';
import type { FecProduit } from './fec.js';

/** Service pur en mémoire sur `genererDeclarations()`. Lecture seulement, aucun lien de téléchargement. */
export function creerServiceFec(jeu: JeuDeclarations = genererDeclarations()) {
  const vers = (f: JeuDeclarations['fec'][number]): FecProduit => ({ ...f, controles: f.controles.map((c) => ({ ...c })), mention: 'prepare_par_ia', telechargementAutorise: f.statut === 'definitif' });
  const exercices = new Set([...jeu.fec.map((f) => f.exerciceId), ...jeu.periodesTva.map((p) => p.exerciceId), ...jeu.estimations.map((e) => e.exerciceId)]);
  return {
    /** Version la plus récente d'abord, remplacés inclus. `undefined` si l'exercice est inconnu. */
    historique: (exercice: string): FecProduit[] | undefined =>
      exercices.has(exercice) ? jeu.fec.filter((f) => f.exerciceId === exercice).map(vers).sort((a, b) => b.version - a.version || (a.id < b.id ? -1 : 1)) : undefined,
    lire: (id: string): FecProduit | undefined => jeu.fec.filter((f) => f.id === id).map(vers)[0],
  };
}
export type ServiceFec = ReturnType<typeof creerServiceFec>;
