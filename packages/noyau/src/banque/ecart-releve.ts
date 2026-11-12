// Ligne d'écart entre le solde du relevé et le solde du compte 512 : ouverte, conservée, fermée seulement avec un motif et un acteur.
// Aucune écriture d'ajustement n'est jamais créée ici. Tant qu'une ligne est ouverte, la clôture est bloquée.
import { centimes, soustraire, type Centimes } from '../argent/index.js';
import { estDateValide } from '../dates/civiles.js';

export class ErreurEcart extends Error {
  override name = 'ErreurEcart';
  constructor(readonly code: 'date_invalide' | 'motif_absent' | 'acteur_absent' | 'deja_fermee') {
    super(code);
  }
}

export type EcartOuvert = { etat: 'ouverte'; montant: Centimes; date: string; compte: '512' };
export type EcartFerme = { etat: 'fermee'; montant: Centimes; date: string; compte: '512'; motif: string; acteur: string };
export type LigneEcart = EcartOuvert | EcartFerme;

export type BloquantCloture = { code: 'ecart_releve_ouvert'; date: string; montant: Centimes };

/** Écart = solde du relevé moins solde 512. Nul : aucune ligne. */
export function ouvrirEcart(soldeReleve: Centimes, solde512: Centimes, date: string): EcartOuvert | null {
  // centimes() refuse NaN, Infinity et non-entiers.
  const ecart = soustraire(centimes(soldeReleve), centimes(solde512));
  if (typeof date !== 'string' || !estDateValide(date)) throw new ErreurEcart('date_invalide');
  return ecart === 0 ? null : { etat: 'ouverte', montant: ecart, date, compte: '512' };
}

export function fermerEcart(ligne: LigneEcart, motif: string, acteur: string): EcartFerme {
  if (ligne.etat !== 'ouverte') throw new ErreurEcart('deja_fermee');
  const m = typeof motif === 'string' ? motif.trim() : '';
  const a = typeof acteur === 'string' ? acteur.trim() : '';
  if (m === '') throw new ErreurEcart('motif_absent');
  if (a === '') throw new ErreurEcart('acteur_absent');
  return { etat: 'fermee', montant: ligne.montant, date: ligne.date, compte: '512', motif: m, acteur: a };
}

export function bloquantsCloture(lignes: readonly LigneEcart[]): BloquantCloture[] {
  return lignes
    .filter((l) => l.etat === 'ouverte')
    .map((l) => ({ code: 'ecart_releve_ouvert' as const, date: l.date, montant: l.montant }));
}
