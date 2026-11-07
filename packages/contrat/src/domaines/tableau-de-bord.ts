import { oc } from '@orpc/contract';
import { z } from 'zod';

export const VUES = ['mois', 'exercice', 'depuis_debut'] as const;
export const BLOCS = ['tresorerie', 'argent_entrant_sortant', 'resultat', 'creances_dettes', 'tva_impots', 'comptes_associes', 'transactions', 'a_faire'] as const;

export const Montant = z.strictObject({ centimes: z.number().int(), devise: z.literal('EUR') });
export const PeriodeSchema = z.strictObject({ debut: z.string(), fin: z.string() });
const Couleur = z.enum(['vert', 'orange', 'rouge', 'pointille']);

export const EnveloppeBlocSchema = z.strictObject({
  code: z.enum(BLOCS),
  etat: z.enum(['ok', 'a_faire', 'a_verifier', 'impossible', 'vide']),
  mot: z.string(),
  gravite: z.enum(['info', 'a_faire', 'urgent', 'bloquant']).optional(),
  periode: PeriodeSchema,
  donnees: z.record(z.string(), z.unknown()).optional(),
  lien: z.string().optional(),
});

/** Anneau de santé : couleurs et compte entier, jamais de pourcentage. */
export const AnneauSchema = z.strictObject({
  arcs: z.array(z.strictObject({ code: z.enum(['pieces', 'banque', 'tva']), couleur: Couleur, sous: z.array(z.strictObject({ code: z.string(), couleur: Couleur })) })),
  global: Couleur,
  centre: z.union([
    z.strictObject({ mot: z.string(), nombre: z.number().int(), sur: z.number().int() }),
    z.strictObject({ mot: z.literal('donnees_absentes') }),
  ]),
});

export const ChiffresSchema = z.strictObject({
  ca: Montant,
  charges: Montant,
  resultatProvisoire: Montant,
  tresorerie: Montant,
  enAttente: z.strictObject({ nombre: z.number().int(), montant: Montant }),
});

export const ReponseTableauDeBord = z.object({
  body: z.strictObject({
    vue: z.enum(VUES),
    periode: PeriodeSchema,
    comparaison: z.union([
      z.strictObject({ periode: PeriodeSchema, tronquee: z.boolean().optional(), chiffres: ChiffresSchema }),
      z.strictObject({ vide: z.enum(['pas_d_exercice_precedent', 'precedent_trop_court']) }),
    ]),
    chiffres: ChiffresSchema,
    blocs: z.array(EnveloppeBlocSchema).length(BLOCS.length),
    anneau: AnneauSchema,
  }),
});
export const ReponseBloc = z.object({ body: EnveloppeBlocSchema });

/** `profil` sert aux essais (jeu fictif « pleine » ou « vide »). Tout autre champ est refusé. */
export const QueryTableau = z.strictObject({ vue: z.enum(VUES).optional(), profil: z.enum(['pleine', 'vide']).optional() });

export const lireTableauDeBord = oc
  .route({ method: 'GET', path: '/exercices/{exercice}/tableau-de-bord', inputStructure: 'detailed', operationId: 'lireTableauDeBord', tags: ['acces:lecture'] })
  .errors({ EXERCICE_INCONNU: { status: 404 } })
  .input(z.object({ params: z.object({ exercice: z.string().min(1) }), query: QueryTableau.optional() }))
  .output(ReponseTableauDeBord);

export const lireBloc = oc
  .route({ method: 'GET', path: '/exercices/{exercice}/tableau-de-bord/{bloc}', inputStructure: 'detailed', operationId: 'lireBloc', tags: ['acces:lecture'] })
  .errors({ EXERCICE_INCONNU: { status: 404 }, BLOC_INCONNU: { status: 404 } })
  .input(z.object({ params: z.object({ exercice: z.string().min(1), bloc: z.string().min(1) }), query: QueryTableau.optional() }))
  .output(ReponseBloc);

export const tableauDeBord = { lireTableauDeBord, lireBloc };
