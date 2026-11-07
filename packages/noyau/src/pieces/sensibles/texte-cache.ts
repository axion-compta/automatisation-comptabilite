// Texte caché d'une pièce (même couleur que le fond, police minuscule, hors page, calque ou annotation masqués) : retiré avant tout modèle.
import { ErreurPiece } from '../types.js';

type Couleur = [number, number, number];
export interface ElementTexte {
  texte: string; page: number; x: number; y: number; largeur: number; hauteur: number;
  taillePolice: number; couleur: Couleur; couleurFond: Couleur; calqueVisible: boolean; annotationCachee: boolean;
}
export interface PageVue { numero: number; largeur: number; hauteur: number; }
export interface ReglageTexteCache { ecartCouleurMax: number; taillePoliceMin: number; }
export type RaisonCache = 'couleur' | 'taille' | 'hors_page' | 'calque' | 'annotation';
export interface ResultatTexteCache { texteVisible: string; caches: { index: number; raison: RaisonCache }[]; texteCache: boolean; }

const finis = (valeurs: readonly number[]): boolean => valeurs.every((v) => Number.isFinite(v));

function raisonCache(e: ElementTexte, pages: readonly PageVue[], reglage: ReglageTexteCache): RaisonCache | null {
  const { page, x, y, largeur, hauteur, taillePolice, couleur, couleurFond } = e;
  const vue = pages.find((p) => p.numero === page);
  if (!vue || !finis([page, x, y, largeur, hauteur, taillePolice, ...couleur, ...couleurFond, vue.largeur, vue.hauteur])) return 'hors_page';
  if (!e.calqueVisible) return 'calque';
  if (e.annotationCachee) return 'annotation';
  if (x + largeur < 0 || x > vue.largeur || y + hauteur < 0 || y > vue.hauteur) return 'hors_page';
  if (taillePolice < reglage.taillePoliceMin) return 'taille';
  const ecart = Math.abs(couleur[0] - couleurFond[0]) + Math.abs(couleur[1] - couleurFond[1]) + Math.abs(couleur[2] - couleurFond[2]);
  return ecart <= reglage.ecartCouleurMax ? 'couleur' : null;
}

export function separerTexteCache(elements: readonly ElementTexte[], pages: readonly PageVue[], reglage: ReglageTexteCache): ResultatTexteCache {
  if (!Number.isFinite(reglage.ecartCouleurMax) || reglage.ecartCouleurMax < 0 || !Number.isFinite(reglage.taillePoliceMin) || reglage.taillePoliceMin < 0) {
    throw new ErreurPiece('reglage_invalide', 'réglage du texte caché invalide');
  }
  const visibles: string[] = [];
  const caches: ResultatTexteCache['caches'] = [];
  elements.forEach((e, index) => {
    const raison = raisonCache(e, pages, reglage);
    if (raison) caches.push({ index, raison });
    else visibles.push(e.texte);
  });
  return { texteVisible: visibles.join(' '), caches, texteCache: caches.length > 0 };
}
