import { http, HttpResponse, type HttpHandler } from 'msw';
import { JEU_SECURITE } from '../../../donnees-fictives/src/securite.js';
import { capacites } from '../../../noyau/src/securite/capacites.js';
import type { ContexteAutorisation } from '../../../noyau/src/securite/autoriser.js';
import type { Role } from '../../../noyau/src/securite/types.js';
import { securite } from '../../../textes/src/ecrans/securite.js';
import { lireCapacites, type Capacite } from '../../../contrat/src/domaines/capacites.js';

/** Personne simulée par défaut quand l'en-tête est absent (mode simulé seulement). */
const PERSONNE_PAR_DEFAUT = 'dir-a';
const ENTETE_ROLE = 'x-scenario-role';

/** Contexte d'autorisation d'une personne du jeu fictif ; `undefined` si l'identifiant est inconnu. */
export function contexteDePersonne(id: string): ContexteAutorisation | undefined {
  const p = JEU_SECURITE.personnes.find((x) => x.id === id);
  if (!p) return undefined;
  return { role: p.role as Role, permissions: p.permissions, demande5: false, separationTaches: false, personneId: p.id };
}

const nonAuthentifie = () => HttpResponse.json({ defined: true, code: 'NON_AUTHENTIFIE', status: 401, message: 'NON_AUTHENTIFIE' }, { status: 401 });

/** Capacités de la personne simulée : même calcul et mêmes phrases que le vrai serveur ; l'en-tête n'est lu qu'ici. */
export function creerHandlersCapacites(base: string, attendre: () => Promise<void>): HttpHandler[] {
  const chemin = (lireCapacites['~orpc'].route.path as string).replace('{s}', ':s');
  return [
    http.get(base + chemin, async ({ request }) => {
      await attendre();
      const contexte = contexteDePersonne(request.headers.get(ENTETE_ROLE) ?? PERSONNE_PAR_DEFAUT);
      if (!contexte) return nonAuthentifie();
      const body: Capacite[] = capacites(contexte).map(({ action, permis, raison }) =>
        permis || raison === undefined
          ? { action, permis: true }
          : { action, permis: false, raison_code: raison, raison_texte: securite.raisons[raison] ?? securite.capaciteInconnue },
      );
      return HttpResponse.json({ body });
    }),
  ];
}
