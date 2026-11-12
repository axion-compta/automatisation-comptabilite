import { oc } from '@orpc/contract';
import { z } from 'zod';
import { juridiqueEcriture } from './juridique-ecriture.js';

const DateJour = z.iso.date();
const Code = z.string().min(1);

/** Champs de genererJuridique (L14-T29). La mention est un code, la phrase vit dans packages/textes. */
export const ObligationsJuridiques = z.object({
  exerciceId: Code,
  societeSiren: Code,
  forme: z.enum(['FORME_A', 'FORME_SCI']),
  rapportGestion: z.object({ statut: z.enum(['dispense', 'brouillon', 'non_applicable']), questions: z.array(Code) }),
  convocation: z.object({
    applicable: z.boolean(),
    dateAssemblee: DateJour.nullable(),
    dateLimite: DateJour.nullable(),
    rappel: DateJour.nullable(),
    cartes: z.array(Code),
  }),
  confidentialite: z.object({ proposee: z.boolean(), choix: z.enum(['non_choisi', 'demandee', 'refusee']).nullable() }),
  cartes: z.array(z.object({ code: Code, objetId: Code, ecartCentimes: z.number().int().nullable() })),
  mention: z.literal('prepare_par_ia'),
});
export type ObligationsJuridiques = z.infer<typeof ObligationsJuridiques>;
export const ReponseObligationsJuridiques = z.object({ body: ObligationsJuridiques });

export const ParamsJuridique = z.object({ exercice: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/) });

/** Lecture seule des obligations de l'exercice ; exercice inconnu = 404. */
export const lireObligationsJuridiques = oc
  .route({ method: 'GET', path: '/exercices/{exercice}/juridique', inputStructure: 'detailed', operationId: 'lireObligationsJuridiques' })
  .errors({ EXERCICE_INCONNU: { status: 404 } })
  .input(z.object({ params: ParamsJuridique }))
  .output(ReponseObligationsJuridiques);

export const juridique = { lireObligationsJuridiques, ...juridiqueEcriture };
