import { oc } from '@orpc/contract';
import { z } from 'zod';
import { EnTeteEcriture } from '../schemas.js';
const Identifiant = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const Mois = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const Jour = z.iso.date();
const ERREURS = {
  NON_AUTHENTIFIE: { status: 401 },
  REGLAGE_VERROUILLE: { status: 403 },
  ACTEUR_NON_HUMAIN: { status: 403 },
  OBJET_INCONNU: { status: 404 },
  PERIODE_BLOQUEE: { status: 409 },
  TRANSITION_INTERDITE: { status: 409 },
  PERIODE_DEPOSEE: { status: 409 },
  MOIS_IDENTIQUE: { status: 409 },
  DEJA_FAIT: { status: 409 },
} as const;
export const ReponseTvaPayee = z.strictObject({ etat: z.literal('payee'), par: z.string().min(1), le: Jour, origine: z.literal('coche') });
export const ReponseSousReserve = z.strictObject({
  ligne: z.strictObject({ id: z.string(), pieceId: z.string(), tvaCentimes: z.number().int(), certitude: z.literal('sous_reserve') }),
  trace: z.strictObject({ acteurId: z.string(), le: Jour, motif: z.string(), pieceId: z.string() }),
});
export const ReponseRattachement = z.strictObject({
  ancien_mois: Mois,
  nouveau_mois: Mois,
  par: z.string().min(1),
  le: Jour,
  periodes_a_recalculer: z.tuple([Mois, Mois]),
});
const BASE = '/exercices/{exercice}/tva';
const route = (method: 'PUT' | 'POST', path: string, operationId: string) =>
  oc.route({ method, path: `${BASE}${path}`, inputStructure: 'detailed', operationId }).errors(ERREURS);
export const modifierInclureSousReserve = route('PUT', '/reglages/inclure-sous-reserve', 'modifierInclureSousReserve')
  .input(z.object({ params: z.object({ exercice: Identifiant }), headers: EnTeteEcriture, body: z.strictObject({ valeur: z.boolean() }) }))
  .output(z.object({ body: z.never() }));
export const cocherTvaPayee = route('POST', '/periodes/{periode}/payee', 'cocherTvaPayee')
  .input(z.object({ params: z.object({ exercice: Identifiant, periode: Mois }), headers: EnTeteEcriture }))
  .output(z.object({ body: ReponseTvaPayee }));
export const passerLigneEnSousReserve = route('POST', '/lignes/{ligne}/sous-reserve', 'passerLigneEnSousReserve')
  .input(z.object({ params: z.object({ exercice: Identifiant, ligne: Identifiant }), headers: EnTeteEcriture, body: z.strictObject({ motif: z.string().trim().min(1).max(500) }) }))
  .output(z.object({ body: ReponseSousReserve }));
export const modifierRattachement = route('PUT', '/pieces/{piece}/rattachement', 'modifierRattachement')
  .input(z.object({ params: z.object({ exercice: Identifiant, piece: Identifiant }), headers: EnTeteEcriture, body: z.strictObject({ nouveau_mois: Mois }) }))
  .output(z.object({ body: ReponseRattachement }));
export const tvaEcriture = { modifierInclureSousReserve, cocherTvaPayee, passerLigneEnSousReserve, modifierRattachement };
