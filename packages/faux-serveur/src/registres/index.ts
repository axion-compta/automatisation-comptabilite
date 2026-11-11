import type { HttpHandler } from 'msw';
import type { ContexteFaux } from './types.js';
import { handlersLot01 } from './lot-01.js';
import { handlersLot02 } from './lot-02.js';
import { handlersLot03 } from './lot-03.js';
import { handlersLot04 } from './lot-04.js';
import { handlersLot05 } from './lot-05.js';
import { handlersLot06 } from './lot-06.js';
import { handlersLot07 } from './lot-07.js';
import { handlersLot08 } from './lot-08.js';
import { handlersLot09 } from './lot-09.js';
import { handlersLot10 } from './lot-10.js';
import { handlersLot11 } from './lot-11.js';
import { handlersLot12 } from './lot-12.js';
import { handlersLot13 } from './lot-13.js';
import { handlersLot14 } from './lot-14.js';
import { handlersLot15 } from './lot-15.js';

/** Réunit les handlers des quinze lots, dans l'ordre des lots. */
export function handlersModules(ctx: ContexteFaux): HttpHandler[] {
  return [
    handlersLot01, handlersLot02, handlersLot03, handlersLot04, handlersLot05,
    handlersLot06, handlersLot07, handlersLot08, handlersLot09, handlersLot10,
    handlersLot11, handlersLot12, handlersLot13, handlersLot14, handlersLot15,
  ].flatMap((f) => f(ctx));
}
