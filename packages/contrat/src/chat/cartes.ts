import { z } from 'zod';
import type { TypeCarte } from '../../../noyau/src/chat/types.js';

// Contrat des cartes du chat : schéma strict par type, aucun HTML ni lien externe.
const INTERDITS = ['<', '>', 'http:', 'https:', 'www.', 'data:', 'javascript:'];
const sansInterdit = (s: string): boolean => !INTERDITS.some((i) => s.toLowerCase().includes(i));

const libre = z.string().refine(sansInterdit);
const code = z.string().regex(/^[a-z0-9_.]+$/);
const montant = z.number().refine(Number.isSafeInteger);
const devise = z.string().regex(/^[A-Z]{3}$/);

const communs = {
  id: libre.min(1),
  titre_code: code,
  source: z.object({ type: code, id: libre.min(1) }).strict(),
};
const carte = <T extends TypeCarte, S extends z.ZodRawShape>(type: T, champs: S) =>
  z.object({ ...communs, type: z.literal(type), ...champs }).strict();
const avecMontant = { libelle: libre, montant_centimes: montant, devise };

export const Carte = z.discriminatedUnion('type', [
  carte('ecriture', avecMontant),
  carte('piece', avecMontant),
  carte('liste', { elements: z.array(z.object({ libelle: libre }).strict()) }),
  carte('proposition', avecMontant),
  carte('rapprochement', avecMontant),
  carte('tva', { montant_centimes: montant, devise }),
  carte('telechargement', {
    lien_interne: z.string().regex(/^\/(?![/\\])[^\s\\]*$/).refine(sansInterdit),
    expire_le: z.iso.datetime(),
  }),
]);
export type Carte = z.infer<typeof Carte>;

export type CarteIndisponible = { type: 'indisponible' };

export function validerCarte(brut: unknown): Carte | CarteIndisponible {
  try {
    const r = Carte.safeParse(brut);
    return r.success ? r.data : { type: 'indisponible' };
  } catch {
    return { type: 'indisponible' };
  }
}
