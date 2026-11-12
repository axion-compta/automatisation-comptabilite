import type { HttpHandler } from 'msw';
import { handlersFraisActions } from '../domaines/frais-actions.js';
import type { ContexteFaux } from './types.js';
export function handlersLot11(ctx: ContexteFaux): HttpHandler[] {
  return [...handlersFraisActions(ctx)];
}
