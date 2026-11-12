import { oc } from '@orpc/contract';
import { z } from 'zod';

const DateJour = z.iso.date();

/** Champs de genererSources (L14-T29). Commune à Axion : aucune donnée client. */
export const EtatSources = z
  .object({
    veille: z.object({ etat: z.enum(['ok', 'alerte']), dernierBalayage: DateJour, depotAutomatiqueAutorise: z.boolean() }),
    connecteurs: z.array(z.object({ connecteur: z.string().min(1), etat: z.enum(['ok', 'degrade', 'panne']), dernierOk: DateJour.nullable() })),
  })
  .refine((e) => !(e.veille.etat === 'alerte' && e.veille.depotAutomatiqueAutorise), { message: 'alerte implique dépôt automatique interdit', path: ['veille', 'depotAutomatiqueAutorise'] });
export type EtatSources = z.infer<typeof EtatSources>;
export const ReponseEtatSources = z.object({ body: EtatSources });

/** Lecture seule : l'interface lit l'état, elle ne le calcule pas. */
export const lireEtatSources = oc
  .route({ method: 'GET', path: '/sources/etat', inputStructure: 'detailed', operationId: 'lireEtatSources' })
  .input(z.object({}))
  .output(ReponseEtatSources);

export const sources = { lireEtatSources };
