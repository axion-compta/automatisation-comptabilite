import { oc } from '@orpc/contract';
import { z } from 'zod';
import { EnTeteEcriture } from '../schemas.js';

/** Listes recopiées de packages/noyau/src/rgpd/types.ts (le contrat n'importe pas le noyau) ; comparées par test. */
export const TYPES_DROIT_PERSONNE = ['acces', 'rectification', 'effacement', 'limitation', 'portabilite', 'opposition'] as const;
export const ETATS_DEMANDE_PERSONNE = ['recue', 'en_cours', 'traitee', 'refusee', 'transmise_a_la_societe'] as const;
export const ISSUES_DEMANDE = [
  'acces_produit', 'portabilite_produite', 'rectifiee', 'a_effacer', 'limitee', 'refus_conservation', 'refus_gel', 'renvoi_societe',
] as const;

const Jour = z.iso.date();

/** Vue d'une demande : jamais le motif libre, aucun montant ni nom de personne. */
export const DemandeVue = z.strictObject({
  id: z.string().min(1),
  type: z.enum(TYPES_DROIT_PERSONNE),
  recue_le: Jour,
  echeance: Jour,
  etat: z.enum(ETATS_DEMANDE_PERSONNE),
  en_retard: z.boolean(),
  a_rappeler: z.boolean(),
  issue: z.enum(ISSUES_DEMANDE).nullable(),
  conserve_jusqu_au: Jour.nullable(),
  source_motif: z.string().nullable(),
});
export type DemandeVue = z.infer<typeof DemandeVue>;

export const CorpsEnregistrerDemande = z.strictObject({ type: z.enum(TYPES_DROIT_PERSONNE), recue_le: Jour });

export const CorpsTraiterDemande = z.strictObject({
  issue: z.enum(ISSUES_DEMANDE),
  motif: z.string().trim().min(1).max(500).optional(),
  source: z.string().optional(),
  inclure_autres_personnes: z.boolean().optional(),
});

const reglage = { REGLAGE_ABSENT: { status: 503 } } as const;
const sortie = z.object({ body: DemandeVue });

export const listerDemandes = oc
  .route({ method: 'GET', path: '/personnes/demandes', inputStructure: 'detailed', operationId: 'listerDemandes', tags: ['acces:compte'] })
  .errors(reglage)
  .input(z.object({}))
  .output(z.object({ body: z.array(DemandeVue) }));

export const enregistrerDemande = oc
  .route({ method: 'POST', path: '/personnes/demandes', successStatus: 201, inputStructure: 'detailed', operationId: 'enregistrerDemande', tags: ['acces:compte'] })
  .errors(reglage)
  .input(z.object({ headers: EnTeteEcriture, body: CorpsEnregistrerDemande }))
  .output(sortie);

export const traiterDemande = oc
  .route({ method: 'POST', path: '/personnes/demandes/{id}/traitement', inputStructure: 'detailed', operationId: 'traiterDemande', tags: ['acces:compte'] })
  .errors({
    ...reglage,
    DEMANDE_INTROUVABLE: { status: 404 }, DEJA_TRAITEE: { status: 409 }, TRANSITION_INTERDITE: { status: 409 },
    ISSUE_NON_PERMISE: { status: 422 }, MOTIF_MANQUANT: { status: 422 }, SOURCE_MANQUANTE: { status: 422 },
  })
  .input(z.object({ headers: EnTeteEcriture, params: z.object({ id: z.string().min(1) }), body: CorpsTraiterDemande }))
  .output(sortie);

export const personnes = { listerDemandes, enregistrerDemande, traiterDemande };
