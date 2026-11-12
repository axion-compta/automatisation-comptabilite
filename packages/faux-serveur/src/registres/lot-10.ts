import type { HttpHandler } from 'msw';
import { handlersClients } from '../domaines/clients.js';
import { handlersVentes } from '../domaines/ventes.js';
import { handlersVentesIndicateurs } from '../domaines/ventes-indicateurs.js';
import type { ContexteFaux } from './types.js';
export function handlersLot10(ctx: ContexteFaux): HttpHandler[] {
  // Les routes fixes passent avant GET /ventes/:id, sinon /ventes/series serait lu comme un identifiant.
  return [...handlersVentesIndicateurs(ctx), ...handlersVentes(ctx), ...handlersClients(ctx)];
}
