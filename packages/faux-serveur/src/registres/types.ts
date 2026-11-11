import type { HttpResponse } from 'msw';
import type { OptionsAbonnementFaux } from '../domaines/options-abonnement.js';
import type { OptionsExploitationFaux } from '../domaines/options-exploitation.js';
import type { OptionsFauxServeur } from '../handlers.js';

/** Contexte donné à chaque registre de lot : tout ce qu'un handler de module peut utiliser. */
export type ContexteFaux = {
  base: string;
  attendre: () => Promise<void>;
  options: OptionsFauxServeur;
  abonnement: OptionsAbonnementFaux;
  exploitation: OptionsExploitationFaux;
  erreur: (code: string, status: number, data?: unknown) => ReturnType<typeof HttpResponse.json>;
};
