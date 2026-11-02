import { z } from 'zod';

export const nom = '@axion/parametres';

const dateIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date AAAA-MM-JJ attendue');

export const ParametreDate = z
  .object({
    code: z.string().min(1),
    libelle: z.string().min(1),
    valeur: z.string().min(1),
    debut: dateIso,
    fin: dateIso.nullable(),
  })
  .refine((p) => p.fin === null || p.fin >= p.debut, {
    message: 'la fin doit suivre le début',
    path: ['fin'],
  });

export type ParametreDate = z.infer<typeof ParametreDate>;

/** Deux entrées fictives : valeurs inventées, sans aucune valeur réelle. */
export const parametresFictifs: ParametreDate[] = [
  { code: 'PARAM_FICTIF_A', libelle: 'Paramètre fictif A', valeur: 'valeur-a', debut: '2025-01-01', fin: '2025-12-31' },
  { code: 'PARAM_FICTIF_A', libelle: 'Paramètre fictif A', valeur: 'valeur-b', debut: '2026-01-01', fin: null },
];

/** Valeur en vigueur à une date donnée, ou undefined si aucune. */
export function valeurALaDate(liste: readonly ParametreDate[], code: string, date: string): string | undefined {
  return liste.find((p) => p.code === code && p.debut <= date && (p.fin === null || date <= p.fin))?.valeur;
}
