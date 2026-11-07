// Lot de fournisseurs à payer : l'IA propose, une personne valide. Le logiciel ne paie jamais et « marqué payé » n'écrit rien.
import { ajouter, centimes } from '../../argent/index.js';
import type { Centimes } from '../../argent/index.js';
import { ajouterJours, comparerDates, estDateValide } from '../../dates/civiles.js';

export type CodeLot =
  | 'ia_interdite' | 'etat_incompatible' | 'lot_vide' | 'total_incoherent' | 'delai_invalide'
  | 'horodatage_invalide' | 'date_invalide' | 'montant_invalide' | 'annulation_impossible';

export class ErreurLot extends Error {
  override name = 'ErreurLot';
  constructor(readonly code: CodeLot) {
    super(code);
  }
}

export type EtatLot = 'propose' | 'valide_par_personne' | 'fichier_genere' | 'marque_paye' | 'annule';
export type Acteur = { type: 'personne' | 'ia' | 'systeme'; id: string; mode?: 'assiste' | 'autonome' };
export type LigneLot = { pieceId: string; montant: Centimes };
export type Lot = {
  id: string; lignes: readonly LigneLot[]; total: Centimes; etat: EtatLot; creeParType: Acteur['type'];
  marquePayeLe?: string; annulePar?: string;
};
export type EntreeJournal = { action: 'valider_lot'; acteurType: Acteur['type']; acteurId: string; horodatage: string };

const FORME_HORODATAGE = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function jourDe(horodatage: string): string {
  const jour = FORME_HORODATAGE.exec(horodatage)?.[1];
  if (jour === undefined || !estDateValide(jour)) throw new ErreurLot('horodatage_invalide');
  return jour;
}

function totalDe(lignes: readonly LigneLot[]): Centimes {
  if (lignes.length === 0) throw new ErreurLot('lot_vide');
  let t = centimes(0);
  for (const l of lignes) {
    if (!Number.isSafeInteger(l.montant)) throw new ErreurLot('montant_invalide');
    t = ajouter(t, l.montant);
  }
  return t;
}

function controler(lot: Lot): void {
  if (totalDe(lot.lignes) !== lot.total) throw new ErreurLot('total_incoherent');
}

export function proposerLot(lignes: readonly LigneLot[], acteur: Acteur, horodatage: string): Lot {
  jourDe(horodatage);
  const total = totalDe(lignes);
  return { id: `lot-${horodatage}`, lignes: lignes.map((l) => ({ ...l })), total, etat: 'propose', creeParType: acteur.type };
}

export function validerLot(lot: Lot, acteur: Acteur, horodatage: string): { lot: Lot; journal: EntreeJournal } {
  if (acteur.type !== 'personne') throw new ErreurLot('ia_interdite');
  jourDe(horodatage);
  controler(lot);
  if (lot.etat !== 'propose') throw new ErreurLot('etat_incompatible');
  return {
    lot: { ...lot, etat: 'valide_par_personne' },
    journal: { action: 'valider_lot', acteurType: acteur.type, acteurId: acteur.id, horodatage },
  };
}

export function fichierPossible(lot: Lot): { possible: true } | { possible: false; code: 'valider_avant' } {
  return lot.etat === 'valide_par_personne' || lot.etat === 'fichier_genere' ? { possible: true } : { possible: false, code: 'valider_avant' };
}

export function marquerPaye(lot: Lot, acteur: Acteur, horodatage: string): Lot {
  if (acteur.type !== 'personne') throw new ErreurLot('ia_interdite');
  const jour = jourDe(horodatage);
  controler(lot);
  if (lot.etat !== 'valide_par_personne' && lot.etat !== 'fichier_genere') throw new ErreurLot('etat_incompatible');
  return { ...lot, etat: 'marque_paye', marquePayeLe: jour };
}

export function signalerSansDebit(lots: readonly Lot[], piecesSoldees: readonly string[], aujourdhui: string, delaiJours: number): string[] {
  if (!Number.isSafeInteger(delaiJours) || delaiJours < 0) throw new ErreurLot('delai_invalide');
  if (!estDateValide(aujourdhui)) throw new ErreurLot('date_invalide');
  const soldees = new Set(piecesSoldees);
  const signalees = new Set<string>();
  for (const lot of lots) {
    if (lot.etat !== 'marque_paye' || lot.marquePayeLe === undefined) continue;
    if (comparerDates(ajouterJours(lot.marquePayeLe, delaiJours), aujourdhui) >= 0) continue;
    for (const l of lot.lignes) if (!soldees.has(l.pieceId)) signalees.add(l.pieceId);
  }
  return [...signalees].sort();
}

export function annuler(lot: Lot, acteur: Acteur): Lot {
  if (lot.etat !== 'propose' && lot.etat !== 'valide_par_personne') throw new ErreurLot('annulation_impossible');
  return { ...lot, etat: 'annule', annulePar: acteur.id };
}
