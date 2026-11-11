import type { HttpHandler } from 'msw';
import { handlersPieces } from '../domaines/pieces.js';
import type { ContexteFaux } from './types.js';
export function handlersLot04(ctx: ContexteFaux): HttpHandler[] {
  return [...handlersPieces(ctx)];
}
