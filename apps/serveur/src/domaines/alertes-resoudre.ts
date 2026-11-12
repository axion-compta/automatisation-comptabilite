import type { implement } from '@orpc/server';
import type { contrat } from '../../../../packages/contrat/src/routes.js';
import { actionDeRegle, RESOLUTIONS } from '../../../../packages/contrat/src/domaines/alertes-resoudre.js';
import { creerServiceAlertes, type ServiceAlertesComplet } from '../../../../packages/contrat/src/domaines/alertes-service.js';
import type { AlerteVue } from '../../../../packages/contrat/src/domaines/alertes.js';
import { EXERCICE_FICTIF } from '../../../../packages/contrat/src/domaines/calendrier-service.js';

/** Port de lecture : le vrai service se branchera plus tard sans changer le code appelant. */
export type PortAlertes = { lire: (id: string) => AlerteVue | undefined; permissions: readonly string[]; exerciceConnu?: (exercice: string) => boolean };
export const PERMISSIONS_ESSAI: readonly string[] = ['compta-lire', 'compta-valider'];
const ACTIVES: readonly AlerteVue['etat'][] = ['ouverte', 'reportee'];
export function portDepuis(service: Pick<ServiceAlertesComplet, 'lister'> = creerServiceAlertes(), permissions: readonly string[] = PERMISSIONS_ESSAI): PortAlertes {
  return { lire: (id) => service.lister().body.find((a) => a.id === id), permissions };
}

/** Résolution d'une alerte : lecture seule, rend le lien de l'écran ; l'argent reste une proposition. */
export function implementerAlertesResoudre(os: ReturnType<typeof implement<typeof contrat>>, port: PortAlertes = portDepuis()) {
  const connu = port.exerciceConnu ?? ((e: string) => e === EXERCICE_FICTIF);
  return {
    resoudreAlerte: os.alertesResoudre.resoudreAlerte.handler(({ input, errors }) => {
      if (!connu(input.params.exercice)) throw errors.EXERCICE_INCONNU();
      if (!port.permissions.includes('compta-lire')) throw errors.ROLE_INSUFFISANT();
      const a = port.lire(input.params.id);
      const action = a && actionDeRegle(a.regle);
      const res = action ? RESOLUTIONS[action] : undefined;
      if (!a || !action || !res) throw errors.ALERTE_INCONNUE();
      if (res.mode === 'proposition' && !port.permissions.includes('compta-valider')) throw errors.ROLE_INSUFFISANT();
      if (!ACTIVES.includes(a.etat)) throw errors.ALERTE_INACTIVE();
      if (a.version !== input.body.version) throw errors.CONFLIT_VERSION({ data: { versionActuelle: a.version } });
      return { body: { id: a.id, regle: a.regle, action, mode: res.mode, lien: res.ecran, version: a.version, ...(res.mode === 'proposition' ? { aValider: true as const } : {}) } };
    }),
  };
}
