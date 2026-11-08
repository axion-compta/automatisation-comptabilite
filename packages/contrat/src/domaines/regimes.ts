import { oc } from '@orpc/contract';
import { z } from 'zod';

/** Listes recopiées de la spec 09 §04 (le contrat n'importe pas le noyau). Ajout seul, jamais de renommage. */
export const MOTIFS_REGIME = ['creation', 'option', 'depassement_seuil', 'bascule_legale', 'correction'] as const;
export const STATUTS_REGIME = ['propose', 'confirme'] as const;
export const TAUX_REDUIT = ['eligible', 'non_eligible', 'a_confirmer'] as const;

const DateJour = z.iso.date();
const Historique = {
  effetDebut: DateJour,
  effetFin: DateJour.nullable(),
  motif: z.enum(MOTIFS_REGIME),
  statut: z.enum(STATUTS_REGIME),
};

export const LigneRegimeTva = z.object({
  regime: z.string().min(1),
  periodicite: z.string().min(1),
  exigibiliteServices: z.string().min(1),
  optionDebits: z.boolean(),
  ...Historique,
});
export type LigneRegimeTva = z.infer<typeof LigneRegimeTva>;

export const LigneImposition = z.object({
  impot: z.string().min(1),
  categorie: z.string().min(1),
  regime: z.string().min(1),
  tauxReduit: z.enum(TAUX_REDUIT),
  ...Historique,
});
export type LigneImposition = z.infer<typeof LigneImposition>;

export const ReponseRegimesTva = z.object({ body: z.array(LigneRegimeTva) });
export const ReponseRegimesImposition = z.object({ body: z.array(LigneImposition) });

/** Lignes historisées, la plus récente d'abord. Lecture seule. */
export const listerRegimesTva = oc
  .route({ method: 'GET', path: '/profil/regimes/tva', inputStructure: 'detailed', operationId: 'listerRegimesTva' })
  .input(z.object({}))
  .output(ReponseRegimesTva);

export const listerRegimesImposition = oc
  .route({ method: 'GET', path: '/profil/regimes/imposition', inputStructure: 'detailed', operationId: 'listerRegimesImposition' })
  .input(z.object({}))
  .output(ReponseRegimesImposition);

export const regimes = { listerRegimesTva, listerRegimesImposition };
