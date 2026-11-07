// Ports de la chaîne de traitement des pièces : les vraies briques (stockage chiffré, antivirus, files) se branchent plus tard.
import type { EtatTraitement } from '../../../../packages/noyau/src/pieces/types.js';
import type { ImageGris } from '../../../../packages/noyau/src/pieces/entree/nettete.js';
import type { ElementTexte, PageVue } from '../../../../packages/noyau/src/pieces/sensibles/texte-cache.js';

export type VerdictAntivirus = 'sain' | 'infecte' | 'indetermine';
export interface Antivirus { analyser(octets: Uint8Array): Promise<VerdictAntivirus> }

export interface StockagePieces { deposerSiAbsent(cle: string, octets: Uint8Array): Promise<'depose' | 'existe'>; lire(cle: string): Promise<Uint8Array | null> }

export interface ResultatExtraction { elements: ElementTexte[]; pages: PageVue[]; gris?: ImageGris; grisReduit?: Uint8Array; nbPages: number }
export interface Extracteur { extraire(octets: Uint8Array, type: string): Promise<ResultatExtraction> }

export interface Horloge { maintenant(): string }

export interface PieceEnregistree {
  id: string; societeId: string; sha256: string; etat: EtatTraitement;
  typeReel?: string; cle?: string; depot?: 'depose' | 'existe'; code?: string; pieceParenteId?: string;
  tentatives?: number; prochaineRelanceA?: string | 'abandon';
}

export interface DepotPiecesEnregistrees {
  parId(id: string): Promise<PieceEnregistree | null>;
  parSha256(societeId: string, sha256: string): Promise<PieceEnregistree[]>;
  enregistrer(piece: PieceEnregistree): Promise<void>;
}
