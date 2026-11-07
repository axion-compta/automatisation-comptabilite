// Étape 3 (préparation), sans réseau : netteté des photos d'abord, puis texte caché retiré, masquage, décision de sensibilité.
import { estFloue } from '../../../../packages/noyau/src/pieces/entree/nettete.js';
import { detecterChiffres, masquer } from '../../../../packages/noyau/src/pieces/sensibles/chiffres.js';
import { deciderSensibilite } from '../../../../packages/noyau/src/pieces/sensibles/identite.js';
import { separerTexteCache, type ReglageTexteCache } from '../../../../packages/noyau/src/pieces/sensibles/texte-cache.js';
import type { Extracteur, PieceEnregistree, ResultatExtraction, StockagePieces } from './ports.js';

export interface ReglagePreparation { seuilNettete: number; texteCache: ReglageTexteCache }
export interface ContextePreparation { stockage: StockagePieces; extracteur: Extracteur; reglage: ReglagePreparation }
export interface ResultatPreparation {
  etat: 'preparee' | 'a_verifier' | 'en_erreur'; texteTransmissible: string | null; texteCache: boolean; sensible: boolean; motifs: string[];
}

const PHOTOS = ['jpeg', 'png', 'webp', 'heic', 'tiff'];
const sortie = (etat: ResultatPreparation['etat'], motifs: string[], extra: Partial<ResultatPreparation> = {}): ResultatPreparation =>
  ({ etat, texteTransmissible: null, texteCache: false, sensible: false, motifs, ...extra });

export async function etapePreparation(piece: PieceEnregistree, ctx: ContextePreparation): Promise<ResultatPreparation> {
  const octets = piece.cle === undefined ? null : await ctx.stockage.lire(piece.cle);
  if (octets === null) return sortie('en_erreur', ['original_introuvable']);
  let extrait: ResultatExtraction;
  try {
    extrait = await ctx.extracteur.extraire(octets, piece.typeReel ?? '');
  } catch {
    return sortie('en_erreur', ['extraction_impossible']);
  }
  if (PHOTOS.includes(piece.typeReel ?? '')) {
    if (!Number.isInteger(ctx.reglage.seuilNettete) || ctx.reglage.seuilNettete < 0) return sortie('en_erreur', ['reglage_invalide']);
    if (extrait.gris === undefined || estFloue(extrait.gris, ctx.reglage.seuilNettete)) return sortie('a_verifier', ['photo_floue']);
  }
  const { texteVisible, texteCache } = separerTexteCache(extrait.elements, extrait.pages, ctx.reglage.texteCache);
  if (texteVisible.trim() === '') return sortie('a_verifier', ['ocr_trop_faible'], { texteCache });
  const detections = detecterChiffres(texteVisible);
  const masque = masquer(texteVisible, detections);
  const decision = deciderSensibilite({ texte: texteVisible, detectionsChiffrees: detections });
  return sortie('preparee', decision.motifs, { texteCache, sensible: decision.sensible, texteTransmissible: decision.sensible ? null : masque });
}
