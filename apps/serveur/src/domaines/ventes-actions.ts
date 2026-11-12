import type { implement } from '@orpc/server';
import type { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceVentesActions, ErreurActions, type ConfigActions } from '../../../../packages/contrat/src/domaines/ventes-actions-service.js';

/** Entier lu dans l'environnement (un seul endroit), sinon valeur d'essai fictive. */
const ESSAI = '60000';
export function configVentesActions(env: NodeJS.ProcessEnv = process.env): ConfigActions {
  const brut = env['VENTES_DELAI_ANNULATION_MS'] ?? ESSAI;
  const delaiAnnulationMs = /^\d+$/.test(brut) ? Number(brut) : Number.NaN;
  if (!Number.isSafeInteger(delaiAnnulationMs) || delaiAnnulationMs < 1) throw new Error('Réglage VENTES_DELAI_ANNULATION_MS invalide : entier positif attendu');
  return { delaiAnnulationMs, maintenant: () => Date.now() };
}

/** Correction et validation d'une vente par une personne (`x-personne` : identité d'essai), sur le service en mémoire. */
export function implementerVentesActions(os: ReturnType<typeof implement<typeof contrat>>, config: ConfigActions = configVentesActions()) {
  const service = creerServiceVentesActions(undefined, config);
  const traduire = <T>(calcul: () => T, erreurs: object): T => {
    const errors = erreurs as Record<string, (o?: { data: unknown }) => Error>;
    try {
      return calcul();
    } catch (e) {
      const fabrique = e instanceof ErreurActions ? errors[e.code] : undefined;
      if (e instanceof ErreurActions && fabrique !== undefined) throw fabrique(e.motif === undefined ? undefined : { data: { motif: e.motif } });
      throw e;
    }
  };
  return {
    corrigerVente: os.ventesActions.corrigerVente.handler(({ input: { params, body, headers: h }, errors }) =>
      traduire(() => ({ body: service.corriger(params.id, body, Number(h['if-match']), h['x-personne'], h['idempotency-key']) }), errors),
    ),
    validerVente: os.ventesActions.validerVente.handler(({ input: { params, headers: h }, errors }) =>
      traduire(() => ({ body: service.valider(params.id, Number(h['if-match']), h['x-personne'], h['idempotency-key']) }), errors),
    ),
  };
}
