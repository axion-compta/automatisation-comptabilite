import { oc } from '@orpc/contract';
import { z } from 'zod';
import { EnTeteEcriture } from '../schemas.js';
import { cheminSociete } from '../prefixe-routes.js';
import { ChampProfilV1 } from './profil.js';

/** Clés du schéma profil.v1 (une version 2 se fait par ajout). */
export const CLES_PROFIL = ['denomination', 'forme', 'siren', 'exercice_debut', 'exercice_fin', 'regime_tva', 'regime_imposition', 'tenue', 'en_formation', 'a_commissaire_aux_comptes', 'code_postal_siege'] as const;
/** `proposition_ia` est refusé ici : il n'entre que par la lecture des pièces. */
export const ORIGINES_ECRITURE = ['saisie_personne', 'document'] as const;

const Jour = z.iso.date();
const sous = (suffixe: string) => cheminSociete(suffixe) as `/${string}`;
const Societe = z.object({ s: z.string().min(1) });
export const CorpsValeurChamp = z.object({ valeur: z.json(), origine: z.enum(ORIGINES_ECRITURE), effetDebut: Jour.optional() }).strict();
export const CorpsConfirmation = z.object({ effetDebut: Jour }).strict();
const Reponse = z.object({ body: ChampProfilV1 });
const erreurs = { CLE_INCONNUE: { status: 404 }, CLE_REUTILISEE: { status: 409 } } as const;

export const ajouterValeurChamp = oc
  .route({ method: 'POST', path: sous('/profil/champs/{cle}'), inputStructure: 'detailed', operationId: 'ajouterValeurChamp' })
  .errors(erreurs)
  .input(z.object({ params: Societe.extend({ cle: z.string().min(1) }), headers: EnTeteEcriture, body: CorpsValeurChamp }))
  .output(Reponse);

export const confirmerChamp = oc
  .route({ method: 'POST', path: sous('/profil/champs/{cle}/confirmer'), inputStructure: 'detailed', operationId: 'confirmerChamp' })
  .errors({ ...erreurs, RIEN_A_CONFIRMER: { status: 409 } })
  .input(z.object({ params: Societe.extend({ cle: z.string().min(1) }), headers: EnTeteEcriture, body: CorpsConfirmation }))
  .output(Reponse);

export const profilChamps = { ajouterValeurChamp, confirmerChamp };
