// Contrôle d'intégrité des pièces : déchiffrer, recalculer l'empreinte, comparer. Jamais de réparation silencieuse.
import { sha256Hex } from './etape-entree.js';
import type { StockagePieces } from './ports.js';
export interface PieceControlee { id: string; cle: string; sha256: string; dernierControle?: string }
export interface ResultatIntegrite { id: string; resultat: 'ok' | 'integrite_ko' }
/** `integrite_ko` : pièce à marquer et export à bloquer par l'appelant ; l'objet stocké n'est jamais modifié. */
export async function verifierIntegrite(piece: PieceControlee, stockage: StockagePieces): Promise<ResultatIntegrite> {
  try {
    const octets = await stockage.lire(piece.cle);
    return { id: piece.id, resultat: octets !== null && sha256Hex(octets) === piece.sha256 ? 'ok' : 'integrite_ko' };
  } catch {
    return { id: piece.id, resultat: 'integrite_ko' };
  }
}
/** Contrôle `taille` pièces, les moins récemment contrôlées d'abord (jamais contrôlée = en premier), ordre stable par id. */
export async function verifierEchantillon(pieces: readonly PieceControlee[], taille: number, stockage: StockagePieces): Promise<ResultatIntegrite[]> {
  if (!Number.isInteger(taille) || taille < 0) throw new RangeError('taille d\'échantillon invalide');
  const choisies = [...pieces]
    .sort((a, b) => (a.dernierControle ?? '').localeCompare(b.dernierControle ?? '') || a.id.localeCompare(b.id))
    .slice(0, taille);
  const resultats: ResultatIntegrite[] = [];
  for (const p of choisies) resultats.push(await verifierIntegrite(p, stockage));
  return resultats;
}
