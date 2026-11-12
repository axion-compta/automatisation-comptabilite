import { oc } from '@orpc/contract';
import { z } from 'zod';
import { CleIdempotence } from '../schemas.js';
import { cheminSociete } from '../prefixe-routes.js';

const Mot = z.string().trim().min(1).max(50);
const MOTIFS = ['doublon', 'a_relire', 'client_absent', 'ecriture_non_proposee'] as const;

/** `x-personne` : identité fictive d'essai, remplacée par l'identité réelle plus tard (J3a). */
const EnTetes = { 'idempotency-key': CleIdempotence, 'x-personne': Mot, 'if-match': z.string().regex(/^[1-9]\d{0,8}$/) };

const Nature = z.object({ ligne: z.number().int().min(0), nature: Mot });
const Version = z.number().int().min(1);
const Champs = z.object({ clientCode: Mot.optional(), dateOperation: z.iso.date().optional(), natures: z.array(Nature).min(1).max(100).optional(), factureOrigineId: Mot.optional() });
export const CorpsCorrection = Champs.refine((c) => Object.values(c).some((v) => v !== undefined), { message: 'au moins un champ' });
export type CorpsCorrection = z.infer<typeof CorpsCorrection>;

export const VenteCorrigee = Champs.omit({ natures: true }).extend({ id: Mot, version: Version, natures: z.array(Nature) });
export type VenteCorrigee = z.infer<typeof VenteCorrigee>;
/** `annulableJusqua` : instant (ms) avant lequel la validation peut être annulée ; le délai vient de la configuration du serveur. */
export const VenteValidee = z.object({
  id: Mot,
  version: Version,
  ecriture: z.object({ statut: z.literal('valide') }),
  annulableJusqua: z.number().int().min(0),
});
export type VenteValidee = z.infer<typeof VenteValidee>;

const Erreurs = { VENTE_INCONNUE: { status: 404 }, VERSION_PERIMEE: { status: 412 }, CLE_REUTILISEE: { status: 409 }, ENTREE_INVALIDE: { status: 400 } } as const;
const sous = (suffixe: string) => cheminSociete(suffixe) as `/${string}`;
const Params = z.object({ s: Mot, id: Mot });

/** `If-Match` = version lue de la vente. Aucune création, numérotation ni envoi de facture. */
export const corrigerVente = oc
  .route({ method: 'POST', path: sous('/ventes/{id}/corrections'), inputStructure: 'detailed', operationId: 'corrigerVente' })
  .errors({ ...Erreurs, VENTE_VALIDEE: { status: 409 } })
  .input(z.object({ params: Params, headers: z.object(EnTetes), body: CorpsCorrection }))
  .output(z.object({ body: VenteCorrigee }));

/** Geste humain : jamais déclenché automatiquement. Refus 409 avec `motif`. */
export const validerVente = oc
  .route({ method: 'POST', path: sous('/ventes/{id}/valider'), inputStructure: 'detailed', operationId: 'validerVente' })
  .errors({ ...Erreurs, VALIDATION_REFUSEE: { status: 409, data: z.object({ motif: z.enum(MOTIFS) }) } })
  .input(z.object({ params: Params, headers: z.object(EnTetes) }))
  .output(z.object({ body: VenteValidee }));

export const ventesActions = { corrigerVente, validerVente };
