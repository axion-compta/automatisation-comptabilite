import type { z } from 'zod';
import { creerEnveloppe, type Enveloppe, type TypeActeur } from '../../../../packages/noyau/src/evenements/enveloppe.js';
import type { BoiteEnvoi, UniteDeTravail } from '../../../../packages/noyau/src/evenements/publication.js';
import type { Canal } from '../../../../packages/noyau/src/securite/types.js';
import type { ServiceFraisValidation } from '../../../../packages/contrat/src/domaines/frais-validation-service.js';
import type { CorpsRemboursement, CorpsValidation } from '../../../../packages/contrat/src/domaines/frais-validation.js';

/** Événements des frais sur le bus : la charge ne porte que des identifiants et des statuts, jamais un montant ni une donnée personnelle. */
export type TypeEvenementFrais =
  | 'compta.frais.propose'
  | 'compta.frais.valide'
  | 'compta.frais.exclu_paye_societe'
  | 'compta.remboursement.prepare'
  | 'compta.ik.regularisation_proposee';

export type ContexteFrais = {
  readonly societeId: string;
  readonly acteur: { readonly type: TypeActeur; readonly id: string };
  readonly canal: Canal;
  readonly correlationId: string;
  /** Clé d'idempotence de l'écriture : un rejeu rend le même identifiant d'événement. */
  readonly cleIdempotence: string;
  readonly horodatage: string;
};

const construire = (type: TypeEvenementFrais, c: ContexteFrais, objetId: string, version: number, charge: Enveloppe['charge']): Enveloppe =>
  creerEnveloppe({
    id: `${c.societeId}:${c.cleIdempotence}:${type}:${objetId}`, type, societe_id: c.societeId, exercice_id: null, objet_id: objetId, version,
    acteur: c.acteur, canal: c.canal, horodatage: c.horodatage, correlation_id: c.correlationId, charge,
  });

export const evenementFraisPropose = (c: ContexteFrais, p: { fraisId: string; version: number }): Enveloppe =>
  construire('compta.frais.propose', c, p.fraisId, p.version, { frais_id: p.fraisId, statut: 'propose' });

export const evenementFraisValide = (c: ContexteFrais, p: { fraisId: string; ecritureId: string; version: number }): Enveloppe =>
  construire('compta.frais.valide', c, p.fraisId, p.version, { frais_id: p.fraisId, ecriture_id: p.ecritureId, statut: 'valide' });

export const evenementExcluPayeSociete = (c: ContexteFrais, p: { fraisId: string; version: number }): Enveloppe =>
  construire('compta.frais.exclu_paye_societe', c, p.fraisId, p.version, { frais_id: p.fraisId, statut: 'exclu_paye_societe' });

export const evenementRemboursementPrepare = (c: ContexteFrais, p: { remboursementId: string; personneId: string; version: number }): Enveloppe =>
  construire('compta.remboursement.prepare', c, p.remboursementId, p.version, { remboursement_id: p.remboursementId, personne_id: p.personneId, statut: 'propose' });

export const evenementRegularisationIk = (c: ContexteFrais, p: { personneId: string; annee: string; version: number }): Enveloppe =>
  construire('compta.ik.regularisation_proposee', c, p.personneId, p.version, { personne_id: p.personneId, annee: p.annee, statut: 'propose' });

/** Dépose les événements DANS la transaction du changement d'état : s'il échoue, rien n'est publié. */
export function ecrireEtPublier<R>(unite: UniteDeTravail, mutation: (tx: { boite: BoiteEnvoi }) => Promise<R>, evenements: (resultat: R) => readonly Enveloppe[]): Promise<R> {
  return unite.executer(async (tx) => {
    const r = await mutation(tx);
    for (const e of evenements(r)) tx.boite.deposer(e);
    return r;
  });
}

const VERSION_INITIALE = 1;
/** Transitions de la validation des frais, chacune avec ses événements dans la même transaction. */
export function creerFraisPublies(service: ServiceFraisValidation, unite: UniteDeTravail) {
  return {
    proposer: (c: ContexteFrais, fraisId: string) =>
      ecrireEtPublier(unite, async () => service.proposer(fraisId, c.cleIdempotence), () => [evenementFraisPropose(c, { fraisId, version: VERSION_INITIALE })]),
    valider: (c: ContexteFrais, corps: z.infer<typeof CorpsValidation>) =>
      ecrireEtPublier(unite, async () => service.valider(corps, c.acteur.id, c.cleIdempotence), (lot) =>
        lot.map((v) => evenementFraisValide(c, { fraisId: v.fraisId, ecritureId: v.ecritureId, version: VERSION_INITIALE }))),
    preparer: (c: ContexteFrais, corps: z.infer<typeof CorpsRemboursement>) =>
      ecrireEtPublier(unite, async () => service.preparer(corps, c.cleIdempotence), (r) => [evenementRemboursementPrepare(c, { remboursementId: r.id, personneId: r.personneId, version: VERSION_INITIALE })]),
  };
}
