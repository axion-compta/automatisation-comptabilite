import { oc } from '@orpc/contract';
import { z } from 'zod';
import { EnTeteEcriture } from '../schemas.js';

const Jour = z.iso.date();
export const DemandeChangement = z.object({ cle: z.string().min(1), valeur: z.json(), effetDebut: Jour, motif: z.string().min(1) }).strict();
export type DemandeChangement = z.infer<typeof DemandeChangement>;

/** Rien n'est enregistré par l'aperçu. `ecrituresValideesTouchees` vaut toujours 0 (littéral). */
export const Apercu = z.object({
  apercuId: z.string().min(1),
  brouillonsRecalcules: z.number().int().min(0),
  declarationsRecalculees: z.array(z.object({ debut: Jour, fin: Jour })),
  echeancesDeplacees: z.array(z.string()),
  ecrituresValideesTouchees: z.literal(0),
});
export type Apercu = z.infer<typeof Apercu>;

export const CorpsConfirmationChangement = z.object({ apercuId: z.string().min(1) }).strict();
export const ChangementConfirme = z.object({ cle: z.string().min(1), valeur: z.json(), effetDebut: Jour, motif: z.string().min(1), confirmeLe: Jour });
export type ChangementConfirme = z.infer<typeof ChangementConfirme>;

const erreurs = { PERIODE_DEPOSEE: { status: 409 }, APERCU_INCONNU: { status: 404 }, APERCU_PERIME: { status: 409 }, CLE_INCONNUE: { status: 404 } } as const;

export const apercuChangement = oc
  .route({ method: 'POST', path: '/profil/changements/apercu', inputStructure: 'detailed', operationId: 'apercuChangement' })
  .errors(erreurs)
  .input(z.object({ headers: EnTeteEcriture, body: DemandeChangement }))
  .output(z.object({ body: Apercu }));

export const confirmerChangement = oc
  .route({ method: 'POST', path: '/profil/changements', inputStructure: 'detailed', operationId: 'confirmerChangement' })
  .errors(erreurs)
  .input(z.object({ headers: EnTeteEcriture, body: CorpsConfirmationChangement }))
  .output(z.object({ body: ChangementConfirme }));

export const profilChangements = { apercuChangement, confirmerChangement };
