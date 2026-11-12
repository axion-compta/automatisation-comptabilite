import { creerEnveloppe, type Enveloppe, type TypeActeur } from '../../../../packages/noyau/src/evenements/enveloppe.js';
import type { BoiteEnvoi, UniteDeTravail } from '../../../../packages/noyau/src/evenements/publication.js';
import type { Canal } from '../../../../packages/noyau/src/securite/types.js';

/** Événements du profil, publiés par la boîte d'envoi : la charge ne porte que la clé et le statut, jamais une valeur personnelle. */
export type TypeEvenementProfil =
  | 'compta.profil.champ_modifie'
  | 'compta.profil.etat_change'
  | 'compta.regime_tva.change'
  | 'compta.regime_imposition.change'
  | 'compta.parametre.active';

export type ContexteEvenement = {
  readonly societeId: string;
  readonly acteur: { readonly type: TypeActeur; readonly id: string };
  readonly canal: Canal;
  readonly correlationId: string;
  /** Clé d'idempotence de l'écriture : un rejeu rend le même identifiant d'événement. */
  readonly cleIdempotence: string;
  readonly horodatage: string;
};

export type EtatProfil = 'incomplet' | 'complet';

const construire = (type: TypeEvenementProfil, c: ContexteEvenement, objetId: string, version: number, charge: Enveloppe['charge']): Enveloppe =>
  creerEnveloppe({
    id: `${c.societeId}:${c.cleIdempotence}:${type}:${objetId}`, type, societe_id: c.societeId, exercice_id: null, objet_id: objetId, version,
    acteur: c.acteur, canal: c.canal, horodatage: c.horodatage, correlation_id: c.correlationId, charge,
  });

export const evenementChampModifie = (c: ContexteEvenement, p: { cle: string; version: number }): Enveloppe =>
  construire('compta.profil.champ_modifie', c, p.cle, p.version, { cle: p.cle });

/** Rend null tant que l'état ne change pas. */
export const evenementEtatChange = (c: ContexteEvenement, p: { avant: EtatProfil; apres: EtatProfil; version: number }): Enveloppe | null =>
  p.avant === p.apres ? null : construire('compta.profil.etat_change', c, c.societeId, p.version, { statut: p.apres, statut_precedent: p.avant });

export const evenementRegimeTvaChange = (c: ContexteEvenement, p: { statut: string; version: number }): Enveloppe =>
  construire('compta.regime_tva.change', c, c.societeId, p.version, { cle: 'regime_tva', statut: p.statut });

export const evenementRegimeImpositionChange = (c: ContexteEvenement, p: { statut: string; version: number }): Enveloppe =>
  construire('compta.regime_imposition.change', c, c.societeId, p.version, { cle: 'regime_imposition', statut: p.statut });

export const evenementParametreActive = (c: ContexteEvenement, p: { cle: string; version: number }): Enveloppe =>
  construire('compta.parametre.active', c, p.cle, p.version, { cle: p.cle, statut: 'active' });

/** Dépose les événements DANS la transaction de la mutation ; si elle échoue, rien n'est publié. */
export function ecrireEtPublier<R>(unite: UniteDeTravail, mutation: (tx: { boite: BoiteEnvoi }) => Promise<R>, evenements: (resultat: R) => readonly (Enveloppe | null)[]): Promise<R> {
  return unite.executer(async (tx) => {
    const r = await mutation(tx);
    for (const e of evenements(r)) if (e) tx.boite.deposer(e);
    return r;
  });
}
