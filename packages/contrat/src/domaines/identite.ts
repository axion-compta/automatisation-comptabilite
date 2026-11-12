import { oc } from '@orpc/contract';
import { z } from 'zod';

/** Listes de la spec 09 §04. Ajout seul, jamais de renommage. */
export const ETATS_SIREN = ['trouve', 'introuvable', 'saisie_manuelle'] as const;
export const CLES_TVA = ['juste', 'fausse'] as const;
export const ETATS_VIES = ['verifie', 'non_verifie', 'invalide'] as const;

export const ReponseSiren = z.object({
  body: z.object({
    etat: z.enum(ETATS_SIREN),
    denomination: z.string().min(1).optional(),
    forme: z.string().min(1).optional(),
    dateReponse: z.iso.date().optional(),
  }),
});
export const ReponseVerificationTva = z.object({
  body: z.object({ cle: z.enum(CLES_TVA), vies: z.enum(ETATS_VIES) }),
});

/** Sirene (réponse fictive, cache daté) : clé fausse = 422, panne = saisie à la main. */
export const lireSiren = oc
  .route({ method: 'GET', path: '/siren/{siren}', inputStructure: 'detailed', operationId: 'lireSiren' })
  .errors({ SIREN_INVALIDE: { status: 422 } })
  .input(z.object({ params: z.object({ siren: z.string().regex(/^[0-9]{9}$/) }) }))
  .output(ReponseSiren);

/** Clé d'abord, puis VIES (fictif) ; VIES indisponible = non_verifie, jamais verifie. */
export const verifierTva = oc
  .route({ method: 'GET', path: '/tva-intracom/{numero}/verification', inputStructure: 'detailed', operationId: 'verifierTva' })
  .input(z.object({ params: z.object({ numero: z.string().regex(/^FR[0-9]{11}$/) }) }))
  .output(ReponseVerificationTva);

export const identite = { lireSiren, verifierTva };
