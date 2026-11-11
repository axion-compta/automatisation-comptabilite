import type { HttpHandler } from 'msw';
import { handlersVentes } from '../domaines/ventes.js';
import type { ContexteFaux } from './types.js';
export function handlersLot10(ctx: ContexteFaux): HttpHandler[] {
  return [...handlersVentes(ctx)];
}
