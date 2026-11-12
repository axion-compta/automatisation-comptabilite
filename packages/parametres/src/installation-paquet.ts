// Installation hors ligne d'un paquet légal : un fichier unique (paquet, version, date d'effet, identifiant
// de clé, signature), lu et vérifié sans aucun accès au réseau. La vérification de la signature, du retour
// arrière et des sources est celle de `signature-paquet.ts`, appelée telle quelle.
// Ce fichier n'est PAS exporté par `index.ts` (il dépend de `node:crypto` via la vérification).
import { z } from 'zod';
import { ParametreLegal } from './au-jour.js';
import type { PaquetParametres } from './paquet.js';
import { verifierPaquetSigne, type CleSignature, type CodeRefusPaquet } from './signature-paquet.js';

export type CodeRefusInstallation = CodeRefusPaquet | 'fichier_illisible';

export interface LigneJournalInstallation {
  evenement: 'parametres.paquet_refuse';
  code: CodeRefusInstallation;
  /** Vide quand le fichier est illisible : aucune version fiable à citer. */
  version: string;
}

export interface FichierPaquet {
  paquet: PaquetParametres;
  version: string;
  dateEffet: string;
  cleId: string;
  signature: string;
}

export type ResultatInstallation =
  | { installe: true; version: string; dateEffet: string }
  | { installe: false; code: CodeRefusInstallation; journal: LigneJournalInstallation };

// La source vide est laissée passer ici : c'est `verifierPaquetSigne` qui la refuse (`ligne_sans_source`).
const LigneLue = ParametreLegal.extend({ source: z.string() });
const Fichier = z.object({
  paquet: z.object({ version: z.string().min(1), lignes: z.array(LigneLue) }),
  version: z.string().min(1),
  dateEffet: z.string(),
  cleId: z.string().min(1),
  signature: z.string().min(1),
});

/** Date du calendrier AAAA-MM-JJ (le 30 février n'existe pas). */
function dateReelle(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m === null) return false;
  const [a, mo, j] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(a, mo - 1, j));
  return d.getUTCFullYear() === a && d.getUTCMonth() === mo - 1 && d.getUTCDate() === j;
}

/** Lit le fichier ; tout défaut (JSON, champ, version du dessus différente du paquet, date) = `fichier_illisible`. */
export function lireFichierPaquet(octets: Uint8Array): FichierPaquet | { refus: 'fichier_illisible' } {
  const illisible = { refus: 'fichier_illisible' } as const;
  let brut: unknown;
  try {
    brut = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(octets));
  } catch {
    return illisible;
  }
  const lu = Fichier.safeParse(brut);
  if (!lu.success) return illisible;
  const f = lu.data;
  if (f.version !== f.paquet.version || !dateReelle(f.dateEffet)) return illisible;
  return { paquet: f.paquet, version: f.version, dateEffet: f.dateEffet, cleId: f.cleId, signature: f.signature };
}

/** Installe le fichier si et seulement si `verifierPaquetSigne` l'accepte. `installe` = version déjà en place. */
export function installerPaquetHorsLigne(
  octets: Uint8Array,
  cles: readonly CleSignature[],
  installe: string | null,
): ResultatInstallation {
  const f = lireFichierPaquet(octets);
  if ('refus' in f) {
    return {
      installe: false,
      code: 'fichier_illisible',
      journal: { evenement: 'parametres.paquet_refuse', code: 'fichier_illisible', version: '' },
    };
  }
  const r = verifierPaquetSigne(f.paquet, { cleId: f.cleId, valeur: f.signature }, cles, installe);
  if (!r.accepte) return { installe: false, code: r.code, journal: r.journal };
  return { installe: true, version: f.version, dateEffet: f.dateEffet };
}
