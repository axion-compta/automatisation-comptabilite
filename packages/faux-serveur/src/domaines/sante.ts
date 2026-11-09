import { http, HttpResponse, type HttpHandler } from 'msw';
import type { OptionsExploitationFaux } from './options-exploitation.js';
import { versionDuServeur } from '../../../../apps/serveur/src/domaines/sante-exploitation.js';
import { creerServiceSanteExploitation } from '../../../contrat/src/domaines/sante-exploitation-service.js';
import type { Verification } from '../../../noyau/src/exploitation/sante.js';
import { creerServiceSante } from '../../../contrat/src/domaines/sante-service.js';

/** Santé des contrôles : lecture seule, servie par le service en mémoire du contrat (mêmes données fictives, même graine). */
export function creerHandlersSante(base: string, attendre: () => Promise<void>): HttpHandler[] {
  const service = creerServiceSante();
  return [
    http.get(base + '/controles/sante', async () => {
      await attendre();
      return HttpResponse.json({ body: service.lire() });
    }),
  ];
}

const PANNES_SANTE: Record<string, Partial<Verification>> = { degrade: { file: false }, panne: { base: false } };

/** Santé d'exploitation : même service que le serveur en mémoire ; `x-panne-sante: degrade | panne` simule une panne. */
export function handlersSante(options: OptionsExploitationFaux): HttpHandler[] {
  const version = versionDuServeur();
  return [
    http.get(options.base + '/sante', async ({ request }) => {
      await options.attendre();
      const verification = PANNES_SANTE[request.headers.get('x-panne-sante') ?? ''];
      return HttpResponse.json({ body: creerServiceSanteExploitation({ version, ...(verification ? { verification } : {}) }).lire() });
    }),
  ];
}
