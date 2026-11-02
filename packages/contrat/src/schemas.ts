import { z } from 'zod';

/** Montant en centimes entiers (jamais de flottant). */
export const Centimes = z.number().int();

export const CleIdempotence = z.string().min(8).max(128);

/** Version de l'objet, pour le contrôle de concurrence (409 si périmée). */
export const Version = z.number().int().min(1);

export const Ecriture = z.object({
  id: z.string().min(1),
  libelle: z.string().min(1),
  montantCentimes: Centimes,
  version: Version,
});
export type Ecriture = z.infer<typeof Ecriture>;

export const EnTeteEcriture = z.object({
  'idempotency-key': CleIdempotence,
});

export const NouvelleEcriture = z.object({
  libelle: z.string().min(1),
  montantCentimes: Centimes,
});

export const ModificationEcriture = z.object({
  libelle: z.string().min(1),
  montantCentimes: Centimes,
  version: Version,
});

export const ErreurConflit = z.object({
  versionActuelle: Version,
});
