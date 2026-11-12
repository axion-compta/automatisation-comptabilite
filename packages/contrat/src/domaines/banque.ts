import { oc } from '@orpc/contract';
import { z } from 'zod';

const ETATS = ['RAPPROCHEE', 'PROPOSEE', 'DOUTEUSE', 'SANS_PIECE', 'SANS_PIECE_REQUISE', 'A_QUALIFIER', 'NEUTRALISEE', 'PERSO', 'IGNOREE'] as const;
export const EtatLigne = z.enum(ETATS);
const Date10 = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Entier = z.number().int();

export const CompteBancaire = z.object({
  id: z.string(), nom: z.string(), banque: z.string(), ibanMasque: z.string(), devise: z.string(),
  type: z.enum(['courant', 'epargne', 'carte_differe']), soldeCentimes: Entier, soldeLe: Date10,
});
export type CompteBancaire = z.infer<typeof CompteBancaire>;

export const LigneBancaire = z.object({
  id: z.string(), compteId: z.string(), date: Date10, montantCentimes: Entier, devise: z.string(),
  montantOrigineCentimes: Entier.optional(), deviseOrigine: z.string().optional(), libelle: z.string(),
  etat: EtatLigne, score: z.number().optional(),
});
export type LigneBancaire = z.infer<typeof LigneBancaire>;

const Valeurs = z.record(z.string(), z.union([z.string(), z.number()]));
export const Explication = z.object({
  codeMot: z.string(), score: z.number().optional(), etat: EtatLigne, passe: z.number().optional(),
  facteurs: z.array(z.object({ nom: z.string(), points: z.number(), code: z.string(), valeurs: Valeurs })),
  autresCandidats: z.array(z.object({ pieceId: z.string(), score: z.number() })),
  proposePar: z.string().optional(),
});
export type Explication = z.infer<typeof Explication>;

export const QueryLignes = z.object({
  etat: EtatLigne.optional(), compte: z.string().min(1).optional(), du: Date10.optional(), au: Date10.optional(),
  limite: z.coerce.number().int().min(1).max(100).optional(), decalage: z.coerce.number().int().min(0).optional(),
});
export type QueryLignes = z.infer<typeof QueryLignes>;

const enveloppe = <T extends z.ZodType>(corps: T) =>
  z.object({ body: z.array(corps), decalage: z.number().int().min(0), total: z.number().int().min(0) });
export const ReponseComptesBancaires = enveloppe(CompteBancaire);
export const ReponseLignesBancaires = enveloppe(LigneBancaire);
export const ReponseExplication = z.object({ body: Explication });

export const listerComptesBancaires = oc
  .route({ method: 'GET', path: '/banque/comptes', inputStructure: 'detailed', operationId: 'listerComptesBancaires' })
  .input(z.object({}))
  .output(ReponseComptesBancaires);

export const listerLignesBancaires = oc
  .route({ method: 'GET', path: '/banque/lignes', inputStructure: 'detailed', operationId: 'listerLignesBancaires' })
  .errors({ COMPTE_INCONNU: { status: 404 } })
  .input(z.object({ query: QueryLignes.optional() }))
  .output(ReponseLignesBancaires);

export const lireExplicationLigne = oc
  .route({ method: 'GET', path: '/banque/lignes/{ligne}/explication', inputStructure: 'detailed', operationId: 'lireExplicationLigne' })
  .errors({ LIGNE_INCONNUE: { status: 404 } })
  .input(z.object({ params: z.object({ ligne: z.string().min(1) }) }))
  .output(ReponseExplication);

export const EtatMois = z.enum(['couvert', 'manquant', 'partiel']);
export const Couverture = z.object({ compteId: z.string(), mois: z.array(z.object({ mois: z.string().regex(/^\d{4}-\d{2}$/), etat: EtatMois })) });
export const EtatTrou = z.enum(['ouvert', 'accepte', 'comble']);
export const TrouReleve = z.object({
  id: z.string(), compteId: z.string(), debut: Date10, fin: Date10, preuve: z.string(), ecartCentimes: Entier.optional(), etat: EtatTrou,
});
export const EtatDemande = z.enum(['ouverte', 'repondue']);
export const Demande = z.object({
  id: z.string(), cle: z.string(), ligneIds: z.array(z.string()), impactCentimes: Entier, nombre: Entier, type: z.string(),
  codeQuestion: z.string(), reponsesPretes: z.array(z.string()), etat: EtatDemande,
});
export const EtatDoublon = z.enum(['propose', 'confirme', 'rejete']);
export const DoublonPropose = z.object({ id: z.string(), ligneA: z.string(), ligneB: z.string(), motif: z.string(), etat: EtatDoublon });
export type Couverture = z.infer<typeof Couverture>;
export type TrouReleve = z.infer<typeof TrouReleve>;
export type Demande = z.infer<typeof Demande>;
export type DoublonPropose = z.infer<typeof DoublonPropose>;

export const ReponseCouverture = z.object({ body: Couverture });
export const ReponseTrous = enveloppe(TrouReleve);
export const ReponseDemandes = enveloppe(Demande);
export const ReponseDoublons = enveloppe(DoublonPropose);

const queryEtat = <T extends z.ZodType>(etat: T) => z.object({ query: z.object({ etat: etat.optional() }).optional() });

export const lireCouvertureCompte = oc
  .route({ method: 'GET', path: '/banque/comptes/{compte}/couverture', inputStructure: 'detailed', operationId: 'lireCouvertureCompte' })
  .errors({ COMPTE_INCONNU: { status: 404 } })
  .input(z.object({ params: z.object({ compte: z.string().min(1) }), query: z.object({ exercice_id: z.string().min(1).optional() }).optional() }))
  .output(ReponseCouverture);

export const listerTrousReleves = oc
  .route({ method: 'GET', path: '/banque/trous', inputStructure: 'detailed', operationId: 'listerTrousReleves' })
  .input(queryEtat(EtatTrou))
  .output(ReponseTrous);

export const listerDemandes = oc
  .route({ method: 'GET', path: '/banque/demandes', inputStructure: 'detailed', operationId: 'listerDemandes' })
  .input(queryEtat(EtatDemande))
  .output(ReponseDemandes);

export const listerDoublons = oc
  .route({ method: 'GET', path: '/banque/doublons', inputStructure: 'detailed', operationId: 'listerDoublons' })
  .input(queryEtat(EtatDoublon))
  .output(ReponseDoublons);

export const banque = {
  listerComptesBancaires, listerLignesBancaires, lireExplicationLigne,
  lireCouvertureCompte, listerTrousReleves, listerDemandes, listerDoublons,
};
