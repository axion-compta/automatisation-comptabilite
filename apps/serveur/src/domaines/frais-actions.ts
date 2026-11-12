import { implement } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import type { ContexteProfil } from './profil.js';
import { exigerDroit } from './frais.js';
import { creerServiceFraisActions, ErreurActions } from '../../../../packages/contrat/src/domaines/frais-actions-service.js';

/** Trace d'une saisie faite par un rôle habilité pour une autre personne. */
export type TraceSaisie = { societeId: string; acteur: string; pour: string; action: 'creerFrais' };
/** Saisies pour autrui de ce processus (en mémoire, données fictives). */
export const saisiesTracees: TraceSaisie[] = [];

/** Routes d'écriture des frais (créer, compléter), sur le service en mémoire. Identité = session ; `compta-deposer` : pour soi ; `compta-saisir` : pour autrui, tracé. */
export function routesFraisActions(service: ReturnType<typeof creerServiceFraisActions> = creerServiceFraisActions(), tracer: (t: TraceSaisie) => void = (t) => void saisiesTracees.push(t)) {
  const os = implement(contrat.fraisActions).$context<ContexteProfil>();
  const traduire = <T>(calcul: () => T, errors: Record<string, () => Error>): T => {
    try {
      return calcul();
    } catch (e) {
      const fabrique = e instanceof ErreurActions ? errors[e.code] : undefined;
      if (fabrique !== undefined) throw fabrique();
      throw e;
    }
  };
  return {
    creerFrais: os.creerFrais.handler(({ input: { params, body, headers: h }, errors, context }) =>
      traduire(() => {
        const s = exigerDroit(context, params.s, 'compta-deposer', 'compta-saisir');
        const pourAutrui = body.personneId !== s.personneId && s.permissions.includes('compta-saisir');
        if (pourAutrui) tracer({ societeId: params.s, acteur: s.personneId, pour: body.personneId, action: 'creerFrais' });
        return { body: service.creer(body, pourAutrui ? body.personneId : s.personneId, h['idempotency-key']) };
      }, errors),
    ),
    completerFrais: os.completerFrais.handler(({ input: { params, body, headers: h }, errors, context }) =>
      traduire(() => ({ body: service.completer(params.id, body, Number(h['if-match']), exigerDroit(context, params.s, 'compta-deposer', 'compta-saisir').personneId, h['idempotency-key']) }), errors),
    ),
  };
}
