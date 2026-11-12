import { oc } from '@orpc/contract';
import { z } from 'zod';
import { CATALOGUE_MVP } from '../../../noyau/src/alertes/catalogue.js';
import { PREFIXE_ROUTES_SOCIETE } from '../prefixe-routes.js';
import { ErreurConflit, Version } from '../schemas.js';

export type ModeResolution = 'ouvrir' | 'proposition';
export type Resolution = { mode: ModeResolution; ecran: string };
/** Sous-écran de chaque action principale du catalogue (l'entrée de menu vient du catalogue). */
const SOUS_ECRAN: Record<string, string> = {
  ouvrir_declaration_tva: 'tva', rattacher_piece: 'pieces', ouvrir_mois: 'cloture', ouvrir_echeance: 'echeances',
  relire_piece: 'relecture', completer_piece: 'completer', verifier_capitaux: 'capitaux', relancer_client: 'relances',
  payer_facture: 'paiement', ouvrir_rapprochement: 'rapprochement', lire_commentaire: 'commentaires',
};
export const ACTIONS_PROPOSITION: readonly string[] = ['payer_facture'];

/** Table figée : action principale vers mode et écran interne (navigation seule, rien n'est exécuté). */
export const RESOLUTIONS: Readonly<Record<string, Resolution>> = Object.freeze(
  Object.fromEntries(
    CATALOGUE_MVP.map((r) => [
      r.actionPrincipale,
      Object.freeze({ mode: ACTIONS_PROPOSITION.includes(r.actionPrincipale) ? 'proposition' : 'ouvrir', ecran: `/${r.entreeMenu}/${SOUS_ECRAN[r.actionPrincipale] ?? r.actionPrincipale}` } as Resolution),
    ]),
  ),
);

/** Action principale d'une règle du catalogue (undefined si le code n'y figure pas). */
export const actionDeRegle = (regle: string): string | undefined => CATALOGUE_MVP.find((r) => r.code === regle)?.actionPrincipale;

export const ReponseResolution = z.object({
  body: z.strictObject({
    id: z.string().min(1), regle: z.string().min(1), action: z.string().min(1),
    mode: z.enum(['ouvrir', 'proposition']),
    lien: z.string().regex(/^\/(?!\/)(?!.*:\/\/)/),
    version: z.number().int().min(1), aValider: z.literal(true).optional(),
  }),
});

/** Résolution d'une alerte en un clic : lien d'ouverture de l'écran, aucune écriture. */
export const resoudreAlerte = oc
  .route({ method: 'POST', path: `${PREFIXE_ROUTES_SOCIETE}/exercices/{exercice}/alertes/{id}/resoudre`, inputStructure: 'detailed', operationId: 'resoudreAlerte', tags: ['lecture-par-post', 'sans-effet', 'acces:lecture'] })
  .errors({
    EXERCICE_INCONNU: { status: 404 }, ALERTE_INCONNUE: { status: 404 }, ROLE_INSUFFISANT: { status: 403 },
    CONFLIT_VERSION: { status: 409, data: ErreurConflit }, ALERTE_INACTIVE: { status: 409 },
  })
  .input(z.object({ params: z.object({ s: z.string().min(1), exercice: z.string().min(1), id: z.string().min(1) }), body: z.strictObject({ version: Version }) }))
  .output(ReponseResolution);

export const alertesResoudre = { resoudreAlerte };
