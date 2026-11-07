import { z } from 'zod';
import { CANAUX, CODES_ERREUR, ISSUES, NIVEAUX } from '../../../noyau/src/chat/types.js';
import { Carte } from './cartes.js';

// Contrat du chat : demande d'un message et événements du flux (lecture tolérante).
const nonVide = z.string().min(1);
const entier = z.number().int().safe().min(0);

/** `longueurMax` vient des réglages (L05-T54) : entier > 0, sinon erreur. */
export function schemaDemande(longueurMax: number) {
  if (!Number.isSafeInteger(longueurMax) || longueurMax <= 0) throw new RangeError('longueur_max_invalide');
  return z
    .object({
      message_id: nonVide,
      conversation_id: nonVide,
      texte: z.string().min(1).max(longueurMax),
      puces: z.array(z.object({ type: z.enum(['ecran', 'selection', 'piece']), ref: nonVide }).strict()),
      canal: z.enum(CANAUX),
    })
    .strict();
}
export type DemandeMessage = z.infer<ReturnType<typeof schemaDemande>>;

const evt = <T extends string, S extends z.ZodRawShape>(type: T, champs: S) =>
  z.object({ id: entier, type: z.literal(type), ...champs }).strict();

export const Evenement = z.discriminatedUnion('type', [
  evt('tour.debut', {}),
  evt('etape', { etape: nonVide }),
  evt('texte', { texte: z.string() }),
  evt('carte', { carte: Carte }),
  evt('proposition', {
    proposition_id: nonVide,
    niveau: z.enum(NIVEAUX),
    nombre_objets: entier,
    montant_total_centimes: z.number().int().safe().optional(),
  }),
  evt('question', {
    choix: z.array(z.object({ code: nonVide, libelle_code: nonVide }).strict()).min(2).max(5),
  }),
  evt('erreur', { code: z.enum(CODES_ERREUR) }),
  evt('tour.fin', { issue: z.enum(ISSUES), cout_micro_centimes: entier }),
]);
export type Evenement = z.infer<typeof Evenement>;

/** Type inconnu ou forme invalide : `null`, jamais d'exception. */
export function lireEvenement(brut: unknown): Evenement | null {
  try {
    const r = Evenement.safeParse(brut);
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}
