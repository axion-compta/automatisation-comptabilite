import { oc } from '@orpc/contract';
import { z } from 'zod';
import { EnTeteEcriture, ErreurConflit, Version } from '../schemas.js';

export const ETATS_ALERTE = ['ouverte', 'reportee', 'ignoree', 'resolue_auto', 'resolue'] as const;
export const GRAVITES_ALERTE = ['info', 'a_faire', 'urgent', 'bloquant'] as const;

/** Contenu minimal : un code de titre et un lien, jamais de montant ni de nom de tiers. */
export const AlerteSchema = z.strictObject({
  id: z.string().min(1),
  regle: z.string().min(1),
  gravite: z.enum(GRAVITES_ALERTE),
  etat: z.enum(ETATS_ALERTE),
  entreeMenu: z.string().min(1),
  echeanceLe: z.string().min(1).optional(),
  ouverteLe: z.string().min(1),
  version: z.number().int().min(1),
  titreCode: z.string().min(1),
  lien: z.string().min(1),
});
export type AlerteVue = z.infer<typeof AlerteSchema>;

export const QueryAlertes = z.strictObject({
  etat: z.enum(ETATS_ALERTE).optional(),
  entree: z.string().min(1).optional(),
  limite: z.coerce.number().int().min(1).max(100).optional(),
  decalage: z.coerce.number().int().min(0).optional(),
});

export const ReponseAlertes = z.object({
  body: z.array(AlerteSchema),
  decalage: z.number().int().min(0),
  total: z.number().int().min(0),
});

const CompteurSchema = z.strictObject({
  ouvertes: z.number().int().min(0),
  urgentes: z.number().int().min(0),
  pointExclamation: z.boolean(),
});
export const ReponseCompteurs = z.object({
  body: z.strictObject({
    parEntree: z.record(z.string(), CompteurSchema),
    alertesDuJour: z.strictObject({ cartes: z.array(AlerteSchema), urgentesTotal: z.number().int().min(0) }),
  }),
});

const params = z.object({ exercice: z.string().min(1) });
const erreurs = { EXERCICE_INCONNU: { status: 404 } } as const;

/** Alertes de l'exercice : ouvertes d'abord, puis gravité décroissante, puis plus récentes. */
export const listerAlertes = oc
  .route({ method: 'GET', path: '/exercices/{exercice}/alertes', inputStructure: 'detailed', operationId: 'listerAlertes', tags: ['acces:lecture'] })
  .errors(erreurs)
  .input(z.object({ params, query: QueryAlertes.optional() }))
  .output(ReponseAlertes);

/** Compteurs du menu et alertes du jour (au plus 3 cartes) : mêmes valeurs pour le menu, la cloche, E01 et le chat. */
export const lireCompteurs = oc
  .route({ method: 'GET', path: '/exercices/{exercice}/compteurs', inputStructure: 'detailed', operationId: 'lireCompteurs', tags: ['acces:lecture'] })
  .errors(erreurs)
  .input(z.object({ params }))
  .output(ReponseCompteurs);

export const JOURS_REPORT = [1, 3, 7] as const;

/** Alerte après l'action, avec l'état d'avant et l'état d'après. */
export const ReponseActionAlerte = z.object({
  body: AlerteSchema.extend({ avant: z.enum(ETATS_ALERTE), apres: z.enum(ETATS_ALERTE) }).strict(),
});

const paramsAction = z.object({ exercice: z.string().min(1), id: z.string().min(1) });
const erreursAction = {
  EXERCICE_INCONNU: { status: 404 }, ALERTE_INCONNUE: { status: 404 },
  REPORT_INVALIDE: { status: 422 }, REPORT_APRES_ECHEANCE: { status: 422 }, MOTIF_REQUIS: { status: 422 },
  REPORT_INTERDIT: { status: 403 }, BLOQUANT_NON_IGNORABLE: { status: 403 }, ROLE_INSUFFISANT: { status: 403 },
  CONFLIT_VERSION: { status: 409, data: ErreurConflit }, ALERTE_INACTIVE: { status: 409 }, DELAI_ANNULATION_DEPASSE: { status: 409 },
} as const;
const route = (action: string, operationId: string) =>
  oc.route({ method: 'POST', path: `/exercices/{exercice}/alertes/{id}/${action}`, inputStructure: 'detailed', operationId, tags: ['acces:ecriture'] }).errors(erreursAction);

export const reporterAlerte = route('reporter', 'reporterAlerte')
  .input(z.object({ params: paramsAction, headers: EnTeteEcriture, body: z.strictObject({ jours: z.number().int(), version: Version }) }))
  .output(ReponseActionAlerte);

export const ignorerAlerte = route('ignorer', 'ignorerAlerte')
  .input(z.object({ params: paramsAction, headers: EnTeteEcriture, body: z.strictObject({ motif: z.string(), version: Version }) }))
  .output(ReponseActionAlerte);

/** Annule la dernière action pendant la durée permise. */
export const annulerAlerte = route('annuler', 'annulerAlerte')
  .input(z.object({ params: paramsAction, headers: EnTeteEcriture, body: z.strictObject({ version: Version }) }))
  .output(ReponseActionAlerte);

export const alertes = { listerAlertes, lireCompteurs, reporterAlerte, ignorerAlerte, annulerAlerte };
