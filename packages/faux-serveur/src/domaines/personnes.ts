import type { HttpHandler } from 'msw';
import { handlersNonImplementesExploitation, type OptionsExploitationFaux } from './options-exploitation.js';

/** Personnes : la recherche est déclarée avant les routes `/personnes/demandes/{id}/…` ; 501 en attendant L08-T37. */
export const handlersPersonnes = (options: OptionsExploitationFaux): HttpHandler[] =>
  handlersNonImplementesExploitation(options, [
    ['get', '/personnes/recherche'],
    ['get', '/personnes/demandes'],
    ['post', '/personnes/demandes'],
    ['post', '/personnes/demandes/:id/traitement'],
  ]);
