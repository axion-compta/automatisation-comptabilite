// Capacités de la personne : une ligne par action, avec le code de raison de chaque refus (MOD-004).
import { autoriser, type ContexteAutorisation } from './autoriser.js';
import { ACTIONS, ErreurSecurite, type Action, type Raison } from './types.js';

export type Capacite = { action: Action; permis: boolean; raison?: Raison };

export function capacites(contexte: ContexteAutorisation): Capacite[] {
  return ACTIONS.map((action) => {
    const d = autoriser(contexte, action);
    if (d.permis) return { action, permis: true };
    if (!d.raison) throw new ErreurSecurite('argument_invalide');
    return { action, permis: false, raison: d.raison };
  });
}
