import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import type { Capacite } from '../../../../packages/contrat/src/domaines/capacites.js';
import { capacites } from '../../../../packages/noyau/src/securite/capacites.js';
import { securite } from '../../../../packages/textes/src/ecrans/securite.js';
import type { OptionsSecurite } from '../securite/index.js';

/** Capacités de la session injectée par `securite.session` (essais) ; aucun en-tête n'est lu. */
export function routesCapacites(options: { securite?: OptionsSecurite } = {}) {
  const os = implement(contrat.capacites);
  return {
    lireCapacites: os.lireCapacites.handler(({ errors }) => {
      const session = options.securite?.session;
      if (!session) throw errors.NON_AUTHENTIFIE();
      let lignes;
      try {
        lignes = capacites(session);
      } catch {
        throw errors.NON_AUTHENTIFIE();
      }
      const body: Capacite[] = lignes.map(({ action, permis, raison }) =>
        permis || raison === undefined
          ? { action, permis: true }
          : { action, permis: false, raison_code: raison, raison_texte: securite.raisons[raison] ?? securite.capaciteInconnue },
      );
      return { body };
    }),
  };
}
