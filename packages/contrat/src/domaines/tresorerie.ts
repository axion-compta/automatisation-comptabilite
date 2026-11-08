import { oc } from '@orpc/contract';
import { z } from 'zod';

export const HORIZONS = [30, 60, 90] as const;
export const SCENARIOS = ['central', 'prudent'] as const;

const Centimes = z.number().int();
const DateJour = z.iso.date();

/** Une prévision est toujours une estimation, avec au moins une hypothèse affichée. */
export const Prevision = z.strictObject({
  estimation: z.literal(true),
  soldeDepartCentimes: Centimes,
  points: z.array(z.strictObject({ date: DateJour, soldeCentimes: Centimes, fluxIds: z.array(z.string()) })),
  seuilBasCentimes: Centimes,
  alerte: z.boolean(),
  hypotheses: z.array(z.string()).min(1),
});
export const Flux = z.strictObject({ id: z.string(), date: DateJour, montantCentimes: Centimes, origine: z.string(), certitude: z.string(), libelleCode: z.string() });
export const EcheanceFournisseur = z.strictObject({
  pieceId: z.string(),
  fournisseurNom: z.string(),
  echeance: DateJour,
  resteCentimes: Centimes,
  ibanMasque: z.string(),
  ibanChange: z.boolean(),
});
export const AlerteIban = z.strictObject({ pieceId: z.string(), fournisseurNom: z.string(), echeance: DateJour, resteCentimes: Centimes, ibanMasque: z.string() });

export const ReponsePrevision = z.object({ body: Prevision });
export const ReponseFlux = z.object({ body: z.array(Flux) });
export const ReponseEcheancesFournisseurs = z.object({ body: z.array(EcheanceFournisseur) });
export const ReponseAlertesIban = z.object({ body: z.array(AlerteIban) });

const Entier = z.coerce.number().int();
export const QueryPrevision = z.strictObject({
  horizon: Entier.refine((h) => (HORIZONS as readonly number[]).includes(h), { message: 'horizon hors liste' }).optional(),
  scenario: z.enum(SCENARIOS).optional(),
});
export const QueryFlux = z.strictObject({ du: DateJour.optional(), au: DateJour.optional(), origine: z.string().max(50).optional() });
export const QueryEcheances = z.strictObject({ horizon: Entier.min(1).max(366).optional() });

const lecture = (path: `/${string}`, operationId: string) => oc.route({ method: 'GET', path, inputStructure: 'detailed', operationId, tags: ['acces:lecture'] });

export const lirePrevision = lecture('/tresorerie/prevision', 'lirePrevision').input(z.object({ query: QueryPrevision.optional() })).output(ReponsePrevision);
export const listerFlux = lecture('/tresorerie/flux', 'listerFlux').input(z.object({ query: QueryFlux.optional() })).output(ReponseFlux);
export const listerEcheancesFournisseurs = lecture('/fournisseurs/echeances', 'listerEcheancesFournisseurs')
  .input(z.object({ query: QueryEcheances.optional() }))
  .output(ReponseEcheancesFournisseurs);
export const listerAlertesIban = lecture('/fournisseurs/alertes-iban', 'listerAlertesIban').input(z.object({})).output(ReponseAlertesIban);

export const domaineTresorerie = { lirePrevision, listerFlux };
export const domaineFournisseurs = { listerEcheancesFournisseurs, listerAlertesIban };
