import { oc } from '@orpc/contract';
import { z } from 'zod';

const Mot = z.string().min(1);
const Centimes = z.number().int();

export const ClientDetail = z.object({
  code: Mot,
  nom: Mot,
  nature: z.enum(['professionnel', 'particulier']),
  siren: Mot.optional(),
  tva: Mot.optional(),
  statutVies: z.enum(['verifie', 'non_verifie', 'invalide']),
  soldeCentimes: Centimes,
  facturesOuvertes: z.array(z.object({ id: Mot, numero: Mot, resteDuCentimes: Centimes, etat: Mot })),
  delaiMoyenJours: z.number().int().min(0).nullable(),
  habitude: z.object({ nature: z.enum(['bien', 'service']), compteProduit: Mot }).optional(),
});
export type ClientDetail = z.infer<typeof ClientDetail>;

/** Lecture seule : aucune création, fusion ni vérification VIES (L10-T52, L10-T53). */
export const lireClient = oc
  .route({ method: 'GET', path: '/clients/{code}', inputStructure: 'detailed', operationId: 'lireClient' })
  .errors({ CLIENT_INCONNU: { status: 404 } })
  .input(z.object({ params: z.object({ code: Mot.max(50) }) }))
  .output(z.object({ body: ClientDetail }));

export const clients = { lireClient };
