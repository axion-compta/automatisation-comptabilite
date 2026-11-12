// Paquets de paramètres signés (Ed25519) : signature, anti-retour arrière, clé révoquée, ligne sans source.
// Fonctions pures, sans horloge. Ce fichier importe `node:crypto` : il n'est PAS exporté par `index.ts`,
// que lit l'application web. Aucune clé ni signature n'est écrite dans le dépôt.
import { createHash, createPublicKey, verify } from 'node:crypto';
import { verifierFrontieres, type EcartFrontiere } from './frontieres.js';
import type { PaquetParametres } from './paquet.js';

export type CodeRefusPaquet =
  | 'signature_invalide'
  | 'cle_revoquee'
  | 'cle_inconnue'
  | 'retour_arriere'
  | 'ligne_sans_source';

export interface CleSignature {
  id: string;
  /** Clé publique Ed25519, PEM (SPKI). */
  publique: string;
  revoquee: boolean;
}

export interface SignaturePaquet {
  cleId: string;
  /** Signature Ed25519 en base64. */
  valeur: string;
}

export interface LigneJournalRefus {
  evenement: 'parametres.paquet_refuse';
  code: CodeRefusPaquet;
  version: string;
}

export type ResultatVerification =
  | { accepte: true }
  | { accepte: false; code: CodeRefusPaquet; journal: LigneJournalRefus };

/** Octets signés : version et lignes, clés triées, sérialisation stable. */
export function octetsASigner(paquet: PaquetParametres): Buffer {
  const lignes = paquet.lignes.map((l) => Object.fromEntries(Object.entries(l).sort(([a], [b]) => (a < b ? -1 : 1))));
  return Buffer.from(JSON.stringify({ version: paquet.version, lignes }), 'utf8');
}

const refus = (code: CodeRefusPaquet, version: string): ResultatVerification => ({
  accepte: false,
  code,
  journal: { evenement: 'parametres.paquet_refuse', code, version },
});

/** Ordre naturel des versions (`v9` avant `v10`). */
const comparerVersions = (a: string, b: string): number => a.localeCompare(b, 'en', { numeric: true });

function signatureValide(paquet: PaquetParametres, signature: SignaturePaquet, cle: CleSignature): boolean {
  try {
    const octets = Buffer.from(signature.valeur, 'base64');
    if (octets.length === 0) return false;
    return verify(null, octetsASigner(paquet), createPublicKey(cle.publique), octets);
  } catch {
    return false;
  }
}

/**
 * Ordre des contrôles : clé connue, clé non révoquée, signature, version strictement plus récente que
 * l'installée (`null` = rien d'installé), toutes les lignes avec une source. Un refus rend sa ligne de journal.
 */
export function verifierPaquetSigne(
  paquet: PaquetParametres,
  signature: SignaturePaquet,
  cles: readonly CleSignature[],
  installe: string | null,
): ResultatVerification {
  const cle = cles.find((c) => c.id === signature.cleId);
  if (cle === undefined) return refus('cle_inconnue', paquet.version);
  if (cle.revoquee) return refus('cle_revoquee', paquet.version);
  if (!signatureValide(paquet, signature, cle)) return refus('signature_invalide', paquet.version);
  if (installe !== null && comparerVersions(paquet.version, installe) <= 0) return refus('retour_arriere', paquet.version);
  if (paquet.lignes.some((l) => l.source.trim() === '')) return refus('ligne_sans_source', paquet.version);
  return { accepte: true };
}

/** Déploiement progressif : même société et même graine, même réponse ; 0 % = aucune, 100 % = toutes. */
export function cohorteDeploiement(societeId: string, pourcentage: number, graine: string): boolean {
  if (!Number.isInteger(pourcentage) || pourcentage < 0 || pourcentage > 100) throw new RangeError('pourcentage_invalide');
  const h = createHash('sha256').update(`${graine}\u001f${societeId}`).digest();
  return h.readUInt32BE(0) % 100 < pourcentage;
}

/** Activation refusée tant que les dates frontières du paquet ne sont pas toutes vertes. */
export function activationAutorisee(
  paquet: PaquetParametres,
  pays: string,
): { autorisee: true } | { autorisee: false; ecarts: EcartFrontiere[] } {
  const ecarts = verifierFrontieres(paquet.lignes, pays);
  return ecarts.length === 0 ? { autorisee: true } : { autorisee: false, ecarts };
}
