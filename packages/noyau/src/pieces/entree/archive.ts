// Contrôles d'archive avant toute décompression : zip-slip, imbriquée, chiffrée, ratio, total, nombre.
import { ErreurPiece } from '../types.js';
import type { EntreeZip } from './zip.js';

export interface ReglageArchive { ratioMax: number; totalMaxOctets: number; nombreMax: number }
export type RaisonArchive = 'zip_slip' | 'chiffree' | 'imbriquee' | 'ratio' | 'total' | 'nombre' | 'vide';
export type ResultatArchive =
  | { ok: true; fichiers: { nom: string; index: number }[] }
  | { ok: false; refus: 'archive_refusee'; raison: RaisonArchive };

const IMBRIQUEE = /\.(zip|7z|rar|tar|gz)$/i;

export function cheminSur(nom: string): string | null {
  if (nom.includes('\0')) return null;
  const n = nom.replaceAll('\\', '/');
  if (n.startsWith('/') || /^[A-Za-z]:/.test(n)) return null;
  const segments = n.split('/');
  if (segments.includes('..')) return null;
  return segments.filter((s) => s !== '' && s !== '.').join('/');
}

export function controlerArchive(entrees: EntreeZip[], reglage: ReglageArchive): ResultatArchive {
  for (const v of [reglage.ratioMax, reglage.totalMaxOctets, reglage.nombreMax]) {
    if (!Number.isInteger(v) || v <= 0) throw new ErreurPiece('reglage_invalide', 'reglage_archive');
  }
  const refus = (raison: RaisonArchive): ResultatArchive => ({ ok: false, refus: 'archive_refusee', raison });
  const fichiers: { nom: string; index: number; e: EntreeZip }[] = [];
  entrees.forEach((e, index) => {
    if (!e.nom.endsWith('/')) fichiers.push({ nom: e.nom, index, e });
  });
  if (fichiers.length === 0) return refus('vide');
  if (fichiers.length > reglage.nombreMax) return refus('nombre');
  const sortie: { nom: string; index: number }[] = [];
  let total = 0;
  for (const { nom, index, e } of fichiers) {
    const sur = cheminSur(nom);
    if (sur === null) return refus('zip_slip');
    if (e.chiffre) return refus('chiffree');
    if (IMBRIQUEE.test(sur)) return refus('imbriquee');
    if (!Number.isSafeInteger(e.tailleCompressee) || !Number.isSafeInteger(e.tailleDecompressee) || e.tailleCompressee < 0 || e.tailleDecompressee < 0) return refus('total');
    if (BigInt(e.tailleDecompressee) > BigInt(reglage.ratioMax) * BigInt(e.tailleCompressee)) return refus('ratio');
    total += e.tailleDecompressee;
    if (!Number.isSafeInteger(total) || total > reglage.totalMaxOctets) return refus('total');
    sortie.push({ nom: sur, index });
  }
  if (sortie.length === 0) return refus('vide');
  return { ok: true, fichiers: sortie };
}
