import { implement, type ORPCError } from '@orpc/server';
import { contrat } from '../../../../packages/contrat/src/routes.js';
import { creerServiceAlertes, ErreurService, type ServiceAlertesComplet } from '../../../../packages/contrat/src/domaines/alertes-service.js';

/** Le branchement commun (app.ts) passe `{}` par défaut : dans ce cas, un service en mémoire neuf est créé. */
export type ServiceAlertes = Partial<ServiceAlertesComplet>;

/** Routes des alertes et des compteurs (lecture), branchées sur le service en mémoire. */
export function routesAlertes(fourni: ServiceAlertes = {}) {
  const service = typeof fourni.lister === 'function' && typeof fourni.reporter === 'function' && typeof fourni.compteurs === 'function' && typeof fourni.exerciceConnu === 'function' ? (fourni as ServiceAlertesComplet) : creerServiceAlertes();
  const os = implement(contrat.alertes);
  type Erreurs = Record<string, (o?: { data: { versionActuelle: number } }) => ORPCError<string, unknown>>;
  const CODES: Record<string, string> = { role_lecture: 'ROLE_INSUFFISANT', version_perimee: 'CONFLIT_VERSION' };
  /** Traduit l'échec du service en erreur déclarée au contrat. */
  const agir = <T>(errors: Erreurs, exercice: string, fait: () => T): T => {
    if (!service.exerciceConnu(exercice)) throw errors['EXERCICE_INCONNU']!();
    try {
      return fait();
    } catch (e) {
      if (!(e instanceof ErreurService)) throw e;
      const nom = CODES[e.code] ?? e.code.toUpperCase();
      throw e.versionActuelle !== undefined ? errors[nom]!({ data: { versionActuelle: e.versionActuelle } }) : errors[nom]!();
    }
  };
  return {
    reporterAlerte: os.reporterAlerte.handler(({ input, errors }) =>
      agir(errors as unknown as Erreurs, input.params.exercice, () => service.reporter(input.headers['idempotency-key'], input.params.id, input.body.jours, input.body.version))),
    ignorerAlerte: os.ignorerAlerte.handler(({ input, errors }) =>
      agir(errors as unknown as Erreurs, input.params.exercice, () => service.ignorer(input.headers['idempotency-key'], input.params.id, input.body.motif, input.body.version))),
    annulerAlerte: os.annulerAlerte.handler(({ input, errors }) =>
      agir(errors as unknown as Erreurs, input.params.exercice, () => service.annuler(input.headers['idempotency-key'], input.params.id, input.body.version))),
    listerAlertes: os.listerAlertes.handler(({ input, errors }) => {
      if (!service.exerciceConnu(input.params.exercice)) throw errors.EXERCICE_INCONNU();
      const q = input.query;
      return service.lister({ etat: q?.etat, entree: q?.entree, limite: q?.limite, decalage: q?.decalage });
    }),
    lireCompteurs: os.lireCompteurs.handler(({ input, errors }) => {
      if (!service.exerciceConnu(input.params.exercice)) throw errors.EXERCICE_INCONNU();
      return service.compteurs();
    }),
  };
}
