import { oc } from '@orpc/contract';
import { z } from 'zod';

/** Listes recopiées du noyau (le contrat ne l'importe pas pour les schémas). Ajout seul, jamais de renommage. */
export const COULEURS_SANTE = ['vert', 'orange', 'rouge'] as const;
export const CODES_SANTE = ['banque', 'cas', 'fraicheur', 'tva', 'controles'] as const;

const Couleur = z.enum(COULEURS_SANTE);
const Sous = (code: (typeof CODES_SANTE)[number]) =>
  z.object({ code: z.literal(code), couleur: Couleur, valeur: z.number().finite().nullable() });

/** Cinq sous-indicateurs exactement, dans l'ordre fixe de CODES_SANTE. */
export const ReponseSante = z.object({
  globale: Couleur,
  sousIndicateurs: z.tuple([Sous('banque'), Sous('cas'), Sous('fraicheur'), Sous('tva'), Sous('controles')]),
});
export type ReponseSante = z.infer<typeof ReponseSante>;

/** Un seul calcul côté serveur pour l'accueil, le chat et le rapport. Lecture seule, aucune erreur métier. */
export const lireSante = oc
  .route({ method: 'GET', path: '/controles/sante', inputStructure: 'detailed', operationId: 'lireSanteControles' })
  .input(z.object({}))
  .output(z.object({ body: ReponseSante }));

export const sante = { lireSante };
