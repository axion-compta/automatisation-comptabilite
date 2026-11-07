import type { Centimes } from '../argent/index.js';
import { ErreurChat, type Confiance } from '../chat/types.js';

// Contrôleur : déclenchement sur risque et échantillon, autre fournisseur, désaccord = escalade (jamais de vote).
const BASE_POINTS = 10000;
const FNV_DEPART = 2166136261;
const FNV_FACTEUR = 16777619;

export type MotifControle = 'montant' | 'nouveau_tiers' | 'doute' | 'echantillon' | 'aucun';
export type PieceAControler = { id: string; montant: Centimes; nouveauTiers: boolean; confiance: Confiance };
export type ReglagesControle = { seuilMontant: Centimes; echantillonPointsDeBase: number };
export type ResultatAgent<V> = { agent: string; valeur: V };
export type Arbitrage<V> = { sorte: 'accord'; valeur: V } | { sorte: 'desaccord' };

function empreinte(id: string): number {
  let h = FNV_DEPART;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), FNV_FACTEUR) >>> 0;
  return h;
}

export function doitControler(piece: PieceAControler, reglages: ReglagesControle): { controler: boolean; motif: MotifControle } {
  const { seuilMontant, echantillonPointsDeBase: taux } = reglages;
  if (!Number.isSafeInteger(taux) || taux < 0 || taux > BASE_POINTS) throw new ErreurChat('parametre_invalide');
  if (!Number.isSafeInteger(seuilMontant) || seuilMontant < 0) throw new ErreurChat('parametre_invalide');
  if (Math.abs(piece.montant) > seuilMontant) return { controler: true, motif: 'montant' };
  if (piece.nouveauTiers) return { controler: true, motif: 'nouveau_tiers' };
  if (piece.confiance !== 'sur') return { controler: true, motif: 'doute' };
  if (empreinte(piece.id) % BASE_POINTS < taux) return { controler: true, motif: 'echantillon' };
  return { controler: false, motif: 'aucun' };
}

export function choisirFournisseurControleur(fournisseurs: string[], fournisseurClassificateur: string): string | null {
  return fournisseurs.find((f) => f !== fournisseurClassificateur) ?? null;
}

export function arbitrer<V>(resultats: ResultatAgent<V>[]): Arbitrage<V> {
  const [premier] = resultats;
  if (premier === undefined) return { sorte: 'desaccord' };
  return resultats.every((r) => Object.is(r.valeur, premier.valeur)) ? { sorte: 'accord', valeur: premier.valeur } : { sorte: 'desaccord' };
}
