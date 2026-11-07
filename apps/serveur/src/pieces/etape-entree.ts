// Étapes 1 (entrée) et 2 (antivirus) de la chaîne : tout passe par des ports, rien n'est stocké avant d'avoir été accepté.
import { createHash } from 'node:crypto';
import { classerConteneur, lireRepertoireZip } from '../../../../packages/noyau/src/pieces/entree/zip.js';
import { controlerArchive, type ReglageArchive } from '../../../../packages/noyau/src/pieces/entree/archive.js';
import { controlerImage, type ReglageImage } from '../../../../packages/noyau/src/pieces/entree/image.js';
import { evaluerLimites, type ReglageLimites } from '../../../../packages/noyau/src/pieces/entree/limites.js';
import { typeReel } from '../../../../packages/noyau/src/pieces/entree/signature.js';
import { appliquerTransition, prochaineRelance } from '../../../../packages/noyau/src/pieces/etats.js';
import { ErreurPiece } from '../../../../packages/noyau/src/pieces/types.js';
import type { Antivirus, DepotPiecesEnregistrees, Horloge, PieceEnregistree, StockagePieces } from './ports.js';

export interface ReglageEntree { archive: ReglageArchive; image: ReglageImage; limites: ReglageLimites; delaisRelanceMinutes: number[] }
export interface ContexteEntree {
  societeId: string; nouvelId(): string; stockage: StockagePieces; depot: DepotPiecesEnregistrees;
  horloge: Horloge; antivirus: Antivirus; reglage: ReglageEntree;
  /** Décompression d'un fichier de l'archive (L04-T49) : injectée, fausse dans les tests. */
  decompresser(archive: Uint8Array, nom: string, index: number): Uint8Array | Promise<Uint8Array>;
}
export interface ResultatEntree { piece: PieceEnregistree; enfants: PieceEnregistree[]; recus: number; crees: number; refuses: number }

const MS_PAR_MINUTE = 60_000;
const IMAGES_CONTROLEES = ['jpeg', 'png', 'webp'];

export function sha256Hex(octets: Uint8Array): string {
  return createHash('sha256').update(octets).digest('hex');
}

async function terminer(ctx: ContexteEntree, piece: PieceEnregistree, vers: PieceEnregistree['etat'], code?: string): Promise<PieceEnregistree> {
  const fini = { ...piece, etat: appliquerTransition(piece.etat, vers), ...(code === undefined ? {} : { code }) };
  await ctx.depot.enregistrer(fini);
  return fini;
}

async function controle(octets: Uint8Array, type: string, ctx: ContexteEntree): Promise<{ refus?: string; erreur?: string }> {
  if ('refus' in evaluerLimites({ tailleOctets: octets.length, nbPages: 0 }, ctx.reglage.limites)) return { refus: 'trop_grand' };
  if (!IMAGES_CONTROLEES.includes(type)) return {};
  const image = controlerImage(octets, ctx.reglage.image);
  if (image.ok) return {};
  return 'refus' in image ? { refus: image.refus } : { erreur: image.erreur };
}

export async function etapeEntree(octets: Uint8Array, ctx: ContexteEntree, pieceParenteId?: string): Promise<ResultatEntree> {
  const sha256 = sha256Hex(octets);
  const base: PieceEnregistree = { id: ctx.nouvelId(), societeId: ctx.societeId, sha256, etat: 'recue', ...(pieceParenteId === undefined ? {} : { pieceParenteId }) };
  const vide = { enfants: [], recus: 0, crees: 0, refuses: 0 };
  const refuser = async (code: string): Promise<ResultatEntree> => ({ ...vide, piece: await terminer(ctx, base, 'refusee', code) });
  const type = typeReel(octets);
  if ('refus' in type) return refuser(type.refus);
  const suivi = await controle(octets, type.type, ctx);
  if (suivi.refus !== undefined) return refuser(suivi.refus);
  if (suivi.erreur !== undefined) return { ...vide, piece: await terminer(ctx, base, 'en_erreur', suivi.erreur) };
  let fichiers: { nom: string; index: number }[] = [];
  if (type.type === 'zip') {
    if (pieceParenteId !== undefined) return refuser('archive_refusee');
    try {
      const entrees = lireRepertoireZip(octets);
      if (typeof classerConteneur(entrees) === 'object') return refuser('macro_refusee');
      const archive = controlerArchive(entrees, ctx.reglage.archive);
      if (!archive.ok) return refuser(archive.refus);
      fichiers = archive.fichiers;
    } catch (e) {
      if (e instanceof ErreurPiece && e.code === 'archive_refusee') return refuser(e.code);
      throw e;
    }
  }
  const cle = `compta/${ctx.societeId}/originaux/${sha256}`;
  const depot = await ctx.stockage.deposerSiAbsent(cle, octets);
  const piece = await terminer(ctx, { ...base, typeReel: type.type, cle, depot }, 'quarantaine');
  const enfants: PieceEnregistree[] = [];
  for (const f of fichiers) {
    const contenu = await ctx.decompresser(octets, f.nom, f.index);
    enfants.push((await etapeEntree(contenu, ctx, piece.id)).piece);
  }
  const refuses = enfants.filter((e) => e.etat === 'refusee').length;
  return { piece, enfants, recus: fichiers.length, crees: enfants.length - refuses, refuses };
}

export async function etapeAntivirus(piece: PieceEnregistree, ctx: ContexteEntree): Promise<PieceEnregistree> {
  const octets = piece.cle === undefined ? null : await ctx.stockage.lire(piece.cle);
  if (octets === null) return terminer(ctx, piece, 'en_erreur', 'controle_impossible');
  const verdict = await ctx.antivirus.analyser(octets);
  if (verdict === 'sain') return piece;
  if (verdict === 'infecte') return terminer(ctx, piece, 'refusee', 'infecte');
  const tentatives = (piece.tentatives ?? 0) + 1;
  const delai = prochaineRelance(tentatives - 1, ctx.reglage.delaisRelanceMinutes);
  const prochaineRelanceA = delai === 'abandon' ? delai : new Date(Date.parse(ctx.horloge.maintenant()) + delai * MS_PAR_MINUTE).toISOString();
  return terminer(ctx, { ...piece, tentatives, prochaineRelanceA }, 'en_erreur', 'indetermine');
}
