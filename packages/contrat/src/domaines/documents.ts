// Entité « document » unifiée : déposé par la personne ou préparé par le produit. Aucune route dans cette fiche.
import { z } from 'zod';

export const RAYONS_DOCUMENT = ['depose', 'prepare'] as const;
export const TYPES_DOCUMENT = [
  'convocation_ag', 'ordre_du_jour', 'feuille_presence', 'pv_ag', 'consultation_ecrite', 'pv_consultation',
  'acte_unanime', 'decision_associe_unique', 'rapport_gerant_sci', 'bilan', 'compte_resultat', 'annexe',
  'liasse_fiscale', 'rapport_gestion', 'fec', 'declaration_tva', 'grand_livre', 'balance',
] as const;
export const FORMATS_DOCUMENT = ['pdf', 'csv', 'xml', 'txt', 'xlsx'] as const;
export const SOURCES_DOCUMENT = ['depot_personne', 'prepare_produit', 'import_externe'] as const;
export const STATUTS_DOCUMENT = ['brouillon', 'a_valider', 'valide', 'remplace', 'indicatif'] as const;

const DateJour = z.iso.date();

export const Document = z
  .strictObject({
    id: z.string().min(1),
    rayon: z.enum(RAYONS_DOCUMENT),
    type: z.enum(TYPES_DOCUMENT),
    formats: z.array(z.enum(FORMATS_DOCUMENT)).min(1),
    source: z.enum(SOURCES_DOCUMENT),
    exerciceId: z.string().min(1),
    empreinte: z.string().regex(/^[0-9a-f]{64}$/, 'sha256 en minuscules attendu'),
    deposeLe: DateJour.optional(),
    prepareLe: DateJour.optional(),
    version: z.number().int().min(1),
    statut: z.enum(STATUTS_DOCUMENT),
  })
  .superRefine((d, ctx) => {
    const [present, absent] = d.rayon === 'depose' ? [d.deposeLe, d.prepareLe] : [d.prepareLe, d.deposeLe];
    if (present === undefined || absent !== undefined) {
      ctx.addIssue({ code: 'custom', path: [d.rayon === 'depose' ? 'deposeLe' : 'prepareLe'], message: 'date du rayon seule attendue' });
    }
    const incoherent = d.rayon === 'depose' ? d.source === 'prepare_produit' : d.source === 'depot_personne';
    if (incoherent) ctx.addIssue({ code: 'custom', path: ['source'], message: 'source incohérente avec le rayon' });
  });
export type Document = z.infer<typeof Document>;
