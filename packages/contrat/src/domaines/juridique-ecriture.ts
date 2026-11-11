import { oc } from '@orpc/contract';
import { z } from 'zod';
import { EnTeteEcriture } from '../schemas.js';

const Exercice = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const Objet = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
export const RAPPORTS = ['gestion', 'sci'] as const;
export const RAISONS_NIVEAU = ['non_authentifie', 'mfa_requis', 'reauthentification_requise', 'recuperation_recente'] as const;
const LONGUEUR_MAX_PIECE = 128;

/** Réponse commune : l'objet touché, son nouvel état, qui et quand (jour). */
export const ReponseEcritureJuridique = z.strictObject({ objet: z.string().min(1), etat: z.string().min(1), par: z.string().min(1), le: z.iso.date() });
export type ReponseEcritureJuridique = z.infer<typeof ReponseEcritureJuridique>;

const ERREURS = {
  EXERCICE_INCONNU: { status: 404 }, OBJET_INCONNU: { status: 404 }, NON_APPLICABLE: { status: 409 }, DEJA_FAIT: { status: 409 },
  REAUTHENTIFICATION_REQUISE: { status: 401, data: z.strictObject({ raison: z.enum(RAISONS_NIVEAU) }) },
  REPRESENTANT_LEGAL_REQUIS: { status: 403 },
} as const;
const BASE = '/exercices/{exercice}/juridique';
const route = (path: string, operationId: string) => oc.route({ method: 'POST', path: `${BASE}${path}`, inputStructure: 'detailed', operationId }).errors(ERREURS);
const Piece = z.strictObject({ piece_id: z.string().min(1).max(LONGUEUR_MAX_PIECE) });
const sortie = z.object({ body: ReponseEcritureJuridique });

export const validerRapport = route('/rapports/{rapport}/valider', 'validerRapport')
  .input(z.object({ params: z.object({ exercice: Exercice, rapport: z.enum(RAPPORTS) }), headers: EnTeteEcriture }))
  .output(sortie);

export const choisirConfidentialite = route('/confidentialite', 'choisirConfidentialite')
  .input(z.object({ params: z.object({ exercice: Exercice }), headers: EnTeteEcriture, body: z.strictObject({ choix: z.enum(['demandee', 'refusee']) }) }))
  .output(sortie);

const entree = z.object({ params: z.object({ exercice: Exercice, objet: Objet }), headers: EnTeteEcriture, body: Piece });
export const enregistrerPieceDecision = route('/decisions/{objet}/piece', 'enregistrerPieceDecision').input(entree).output(sortie);
export const enregistrerPieceConvention = route('/conventions/{objet}/piece', 'enregistrerPieceConvention').input(entree).output(sortie);

export const juridiqueEcriture = { validerRapport, choisirConfidentialite, enregistrerPieceDecision, enregistrerPieceConvention };
