import { oc } from '@orpc/contract';
import { z } from 'zod';
import { EnTeteEcriture } from '../schemas.js';

const DateJour = z.iso.date();
const Horodatage = z.iso.datetime({ offset: true });

export const EtatFinContrat = z.object({
  statut: z.enum(['aucune', 'preavis', 'remis', 'accuse']),
  date_fin: DateJour.nullable(),
  remis_le: Horodatage.nullable(),
  manifeste_empreinte: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  accuse_le: Horodatage.nullable(),
  efface_prevu_le: DateJour.nullable(),
  gel: z.object({ actif: z.boolean(), motif: z.string().nullable(), pose_le: Horodatage.nullable() }),
  gel_console: z.boolean(),
});
export type EtatFinContrat = z.infer<typeof EtatFinContrat>;

/** Longueur maximale du motif : limite technique du schéma, pas une valeur légale. */
const LONGUEUR_MAX_MOTIF = 500;
export const MotifGel = z.object({ motif: z.string().trim().min(1).max(LONGUEUR_MAX_MOTIF) });

const ecriture = (path: `/${string}`, operationId: string) =>
  oc.route({ method: 'POST', path, inputStructure: 'detailed', operationId, tags: ['acces:compte'] });

export const lireFinContrat = oc
  .route({ method: 'GET', path: '/fin-contrat', inputStructure: 'detailed', operationId: 'lireFinContrat', tags: ['acces:compte'] })
  .input(z.object({}))
  .output(EtatFinContrat);

export const accuserReception = ecriture('/fin-contrat/accuse', 'accuserReception')
  .errors({ PAS_DE_REMISE: { status: 409 }, DEJA_ACCUSE: { status: 409 }, EMPREINTE_DIFFERENTE: { status: 422 } })
  .input(z.object({ headers: EnTeteEcriture, body: z.object({ manifeste_empreinte: z.string().regex(/^[0-9a-f]{64}$/) }) }))
  .output(EtatFinContrat);

export const poserGel = ecriture('/fin-contrat/gel', 'poserGel')
  .errors({ GEL_DEJA_ACTIF: { status: 409 } })
  .input(z.object({ headers: EnTeteEcriture, body: MotifGel }))
  .output(EtatFinContrat);

/** Levée du gel en POST (et non DELETE) : le motif est obligatoire et un DELETE avec corps passe mal. */
export const leverGel = ecriture('/fin-contrat/gel/levee', 'leverGel')
  .errors({ GEL_INACTIF: { status: 409 } })
  .input(z.object({ headers: EnTeteEcriture, body: MotifGel }))
  .output(EtatFinContrat);

export const finContrat = { lireFinContrat, accuserReception, poserGel, leverGel };
