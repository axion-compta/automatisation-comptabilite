import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ErreurLecture, lire, type EtatLecture, type UseLecture } from '../api.js';

export type { EtatLecture };

/** Pas de nouvelle tentative sur une erreur 4xx ; une seule sur les autres. */
export function creerClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (n, e) => !(e instanceof ErreurLecture && e.statut >= 400 && e.statut < 500) && n < 1,
        retryDelay: 200,
      },
    },
  });
}

/** Fournit le client de lecture aux écrans. */
export function FournisseurDonnees({ children, client }: { children: ReactNode; client?: QueryClient }) {
  const [c] = useState(() => client ?? creerClient());
  return <QueryClientProvider client={c}>{children}</QueryClientProvider>;
}

/** Lit une route ; `vide` si l'enveloppe a `total === 0`. */
export const useLecture: UseLecture = (chemin, schema) => {
  const q = useQuery({ queryKey: ['lecture', chemin], queryFn: ({ signal }) => lire(chemin, schema, signal) });
  if (q.isError) return { etat: 'erreur', erreur: q.error as ErreurLecture };
  if (q.data === undefined) return { etat: 'chargement' };
  const total = (q.data as { total?: unknown }).total;
  return { etat: total === 0 ? 'vide' : 'pret', donnees: q.data };
};
