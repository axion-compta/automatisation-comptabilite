// Ventes : événements compta.vente.* et compta.avoir.rattache pour la boîte d'envoi (L00-T49).
// Charge : identifiants et statuts seulement, jamais de montant ni de taux : un consommateur relit les montants par l'API.
import { creerEnveloppe, type Enveloppe, type TypeActeur } from '../../../../packages/noyau/src/evenements/enveloppe.js';
import type { Canal } from '../../../../packages/noyau/src/securite/types.js';

export const TYPES_EVENEMENT_VENTE = [
  'compta.vente.lue',
  'compta.vente.a_verifier',
  'compta.vente.validee',
  'compta.vente.encaissee',
  'compta.vente.serie_trou_detecte',
  'compta.avoir.rattache',
] as const;
export type TypeEvenementVente = (typeof TYPES_EVENEMENT_VENTE)[number];

export interface ContexteEvenementVente {
  societeId: string;
  exerciceId: string | null;
  acteur: { type: TypeActeur; id: string };
  canal: Canal;
  horodatage: string;
  correlationId: string;
}

export type ChargeEvenementVente = Readonly<Record<string, string | boolean | null>>;

/** Identifiant déterministe (type, objet, corrélation) : un rejeu dépose le même événement, la boîte l'ignore. */
export function evenementVente(type: TypeEvenementVente, ctx: ContexteEvenementVente, objetId: string, charge: ChargeEvenementVente): Enveloppe {
  return creerEnveloppe({
    id: `${type}:${objetId}:${ctx.correlationId}`, type, societe_id: ctx.societeId, exercice_id: ctx.exerciceId, objet_id: objetId, version: 1,
    acteur: ctx.acteur, canal: ctx.canal, horodatage: ctx.horodatage, correlation_id: ctx.correlationId, charge,
  });
}

export type StatutEncaissement = 'total' | 'partiel';

export function evenementEncaissee(
  ctx: ContexteEvenementVente,
  p: { factureId: string; ecritureId: string; statut: StatutEncaissement; tvaExigible: boolean },
): Enveloppe {
  return evenementVente('compta.vente.encaissee', ctx, p.factureId, {
    facture_id: p.factureId, ecriture_id: p.ecritureId, statut: p.statut, tva_exigible: p.tvaExigible,
  });
}
