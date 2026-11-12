import { oc } from '@orpc/contract';
import { z } from 'zod';
import { cheminSociete } from '../prefixe-routes.js';

const DateJour = z.iso.date();
const Entier = z.number().int().min(0);
const sous = (suffixe: string) => cheminSociete(suffixe) as `/${string}`;
const Societe = z.object({ s: z.string().min(1) });

/** Véhicule personnel : l'immatriculation n'est jamais exposée, seulement la présence de la carte grise. */
export const Vehicule = z.object({
  id: z.string().min(1),
  personneId: z.string().min(1),
  puissanceCv: z.number().int().min(1),
  energie: z.enum(['thermique', 'hybride', 'hydrogene', 'electrique']),
  proprietaire: z.enum(['personne', 'conjoint', 'societe', 'location']),
  categorie: z.enum(['voiture', 'deux_roues']),
  carteGrise: z.boolean(),
});
export type Vehicule = z.infer<typeof Vehicule>;

/** Ligne de barème au jour J. Le statut est toujours rendu : l'écran affiche « Barème à confirmer » s'il n'est pas `valide`. */
export const LigneBareme = z.object({
  cle: z.string().min(1),
  pays: z.string().length(2),
  effetDebut: DateJour,
  effetFin: DateJour.nullable(),
  statut: z.enum(['non_verifie', 'a_verifier', 'valide']),
  source: z.string().min(1),
  dateReleve: DateJour,
  puissances: z.array(
    z.object({
      cleCv: z.number().int().min(1),
      tranches: z.array(z.object({ jusquaKmDixiemes: Entier.nullable(), tauxMilliemes: Entier, fixeCentimes: Entier })),
    }),
  ),
  majorationPourcent: Entier.nullable(),
});
export type LigneBareme = z.infer<typeof LigneBareme>;

export const ReponseVehicules = z.object({ body: z.array(Vehicule) });
export const ReponseBareme = z.object({ body: LigneBareme });

export const listerVehicules = oc
  .route({ method: 'GET', path: sous('/vehicules'), inputStructure: 'detailed', operationId: 'listerVehicules' })
  .input(z.object({ params: Societe, query: z.object({ personne: z.string().min(1).max(50) }) }))
  .output(ReponseVehicules);

export const lireBaremeIk = oc
  .route({ method: 'GET', path: sous('/parametres/bareme_ik_voiture'), inputStructure: 'detailed', operationId: 'lireBaremeIk' })
  .errors({ BAREME_ABSENT: { status: 404 }, BAREME_AMBIGU: { status: 409 }, BAREME_ILLISIBLE: { status: 409 } })
  .input(z.object({ params: Societe, query: z.object({ date: DateJour }) }))
  .output(ReponseBareme);

export const vehiculesBareme = { listerVehicules, lireBaremeIk };
