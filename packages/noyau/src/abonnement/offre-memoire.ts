// Faux service d'offre en mémoire : avance sans la console (données fictives).
import { validerOffre, type Offre, type ServiceOffre } from './offre.js';

export function creerServiceOffreMemoire(initial: Readonly<Record<string, unknown>> = {}): ServiceOffre & {
  definir(clientId: string, offre: unknown): void;
} {
  const offres = new Map<string, Offre>();
  const definir = (clientId: string, offre: unknown): void => { offres.set(clientId, validerOffre(offre)); };
  for (const [id, o] of Object.entries(initial)) definir(id, o);
  return {
    definir,
    lire: (clientId) => Promise.resolve(offres.get(clientId) ?? null),
  };
}
