import { useQuery, type QueryClient } from '@tanstack/react-query';
import { ErreurLecture, lire, type EtatLecture, type SchemaLecture } from '../api.js';

/** Réglage d'interface : tableau de bord relu toutes les 30 secondes (TB-R9). */
export const INTERVALLE_TABLEAU_DE_BORD_MS = 30_000;

/** Comme `useLecture` (même clé), relue à intervalle régulier ; rien tant que l'onglet est caché. */
export function useLectureInterrogee<T>(
  chemin: string,
  schema: SchemaLecture<T>,
  options: { intervalleMs: number },
): EtatLecture<T> {
  const { intervalleMs } = options;
  if (typeof intervalleMs !== 'number' || !Number.isFinite(intervalleMs) || intervalleMs <= 0) {
    throw new RangeError('intervalleMs doit être un nombre fini strictement positif');
  }
  const q = useQuery({
    queryKey: ['lecture', chemin],
    queryFn: ({ signal }) => lire(chemin, schema, signal),
    refetchInterval: intervalleMs,
    refetchIntervalInBackground: false,
  });
  if (q.isError) return { etat: 'erreur', erreur: q.error as ErreurLecture };
  if (q.data === undefined) return { etat: 'chargement' };
  const total = (q.data as { total?: unknown }).total;
  return { etat: total === 0 ? 'vide' : 'pret', donnees: q.data };
}

/** Après une action : relit les lectures dont le chemin commence par un des préfixes. */
export function relireApresAction(client: QueryClient, prefixes: string[]): Promise<void> {
  const utiles = prefixes.filter((p) => p !== '');
  return client.invalidateQueries({
    predicate: (requete) => {
      const [nature, chemin] = requete.queryKey;
      return nature === 'lecture' && typeof chemin === 'string' && utiles.some((p) => chemin.startsWith(p));
    },
  });
}
