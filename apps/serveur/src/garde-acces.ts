import { contrat, contratChat } from '../../../packages/contrat/src/routes.js';
import { classeDe, classesDesRoutes } from '../../../packages/contrat/src/domaines/classes.js';
import { creerServiceAcces } from '../../../packages/contrat/src/domaines/acces-service.js';
import { autoriser } from '../../../packages/noyau/src/abonnement/garde.js';
import type { ErreurEtatAcces } from '../../../packages/contrat/src/domaines/acces.js';

export const STATUT_ETAT_ACCES = 403;

/** Corps de réponse du refus : le même dans le vrai serveur et le faux serveur. */
export const corpsEtatAcces = (data: ErreurEtatAcces) => ({
  defined: true,
  code: 'ETAT_ACCES',
  status: STATUT_ETAT_ACCES,
  message: 'ETAT_ACCES',
  data,
});

/** Table des classes construite une fois au démarrage ; une étiquette invalide lève ici. */
export function creerGardeAcces(options: { horloge: () => string; scenario?: string | null | undefined }) {
  const table = classesDesRoutes({ contrat, contratChat });
  return (methode: string, chemin: string): ErreurEtatAcces | null => {
    const etat = creerServiceAcces({ horloge: options.horloge, scenario: options.scenario ?? null }).lire().etat;
    const d = autoriser(etat, classeDe(table, methode, chemin));
    return d.permis ? null : { etat, raison: d.raison };
  };
}
