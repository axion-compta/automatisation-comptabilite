import { http, HttpResponse, type HttpHandler } from 'msw';
import { contrat, contratChat } from '../../contrat/src/routes.js';
import { classeDe, classesDesRoutes } from '../../contrat/src/domaines/classes.js';
import { creerServiceAcces } from '../../contrat/src/domaines/acces-service.js';
import { autoriser } from '../../noyau/src/abonnement/garde.js';
import { scenarioDeLaRequete, type OptionsAbonnementFaux } from './domaines/options-abonnement.js';

const STATUT_ETAT_ACCES = 403;

/** Handlers placés AVANT les autres, un par route du contrat : refus 403 ETAT_ACCES, sinon retour vide (les routes hors contrat restent non gérées). */
export function handlersGardeAcces(options: OptionsAbonnementFaux): HttpHandler[] {
  const table = classesDesRoutes({ contrat, contratChat });
  const prefixe = new URL(options.base || '/', 'http://exemple.fr').pathname.replace(/\/$/, '');
  const methodes = { GET: http.get, POST: http.post, PUT: http.put, PATCH: http.patch, DELETE: http.delete } as const;
  return table.flatMap((r) => {
    const fabrique = methodes[r.methode.toUpperCase() as keyof typeof methodes];
    if (!fabrique) return [];
    return [fabrique(options.base + r.chemin.replace(/\{(\w+)\}/g, ':$1'), ({ request }) => {
      const chemin = new URL(request.url).pathname.slice(prefixe.length);
      const etat = creerServiceAcces({ horloge: options.horloge, scenario: scenarioDeLaRequete(request, options) }).lire().etat;
      const d = autoriser(etat, classeDe(table, request.method, chemin));
      if (d.permis) return undefined;
      const data = { etat, raison: d.raison };
      return HttpResponse.json({ defined: true, code: 'ETAT_ACCES', status: STATUT_ETAT_ACCES, message: 'ETAT_ACCES', data }, { status: STATUT_ETAT_ACCES });
    })];
  });
}
