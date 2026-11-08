import { oc } from '@orpc/contract';
import { z } from 'zod';

const Mot = z.string().min(1);
const Centimes = z.number().int();
const DateJour = z.iso.date();

export const VenteResume = z.object({
  id: z.string().min(1),
  numero: z.string().min(1),
  type: Mot,
  client: z.object({ code: Mot, nom: Mot }).optional(),
  dateFacture: DateJour,
  echeance: DateJour.optional(),
  ttcCentimes: Centimes,
  resteDuCentimes: Centimes,
  etat: Mot,
  joursDeRetard: z.number().int().min(0).optional(),
  avoirsLies: z.array(z.object({ id: Mot, ttcCentimes: Centimes })),
});
export type VenteResume = z.infer<typeof VenteResume>;

export const VenteDetail = VenteResume.extend({
  origine: Mot,
  lignes: z.array(z.object({ libelle: z.string(), quantite: z.number().min(0), ttcCentimes: Centimes })),
  cartes: z.array(z.object({ code: Mot, mot: Mot, message: z.string() })),
  ecriture: z
    .object({ statut: Mot, lignes: z.array(z.object({ compte: Mot, debitCentimes: Centimes.min(0), creditCentimes: Centimes.min(0) })) })
    .optional(),
  paiements: z.array(z.object({ date: DateJour, montantCentimes: Centimes })),
});
export type VenteDetail = z.infer<typeof VenteDetail>;

export const QueryVentes = z.object({
  etat: z.string().max(50).optional(),
  client: z.string().max(50).optional(),
  mois: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  limite: z.coerce.number().int().min(1).max(100).optional(),
  decalage: z.coerce.number().int().min(0).optional(),
});

export const ReponseVentes = z.object({ body: z.array(VenteResume), decalage: z.number().int().min(0), total: z.number().int().min(0) });

/** Lecture seule : aucune création, numérotation ni envoi de facture. */
export const listerVentes = oc
  .route({ method: 'GET', path: '/ventes', inputStructure: 'detailed', operationId: 'listerVentes' })
  .input(z.object({ query: QueryVentes.optional() }))
  .output(ReponseVentes);

export const lireVente = oc
  .route({ method: 'GET', path: '/ventes/{id}', inputStructure: 'detailed', operationId: 'lireVente' })
  .errors({ VENTE_INCONNUE: { status: 404 } })
  .input(z.object({ params: z.object({ id: z.string().min(1) }) }))
  .output(z.object({ body: VenteDetail }));

export const ventes = { listerVentes, lireVente };
