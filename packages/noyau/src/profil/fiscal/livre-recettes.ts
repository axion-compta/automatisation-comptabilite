import { ajouter, centimes, type Centimes } from '../../argent/index.js';
import { ErreurProfil, estDans, estDateIso, exigerDate, type Forme, type RegimeImposition, type Tenue } from '../types.js';

export const MODES_REGLEMENT = ['virement', 'carte', 'cheque', 'especes', 'autre'] as const;
export type ModeReglement = (typeof MODES_REGLEMENT)[number];
export type ActiviteMicro = 'vente_marchandises' | 'services' | 'mixte';
export type CodeLigne = 'montant_invalide' | 'client_vide' | 'reference_vide' | 'date_invalide' | 'mode_inconnu';

export type LigneRecette = {
  id: string;
  dateEncaissement: string;
  client: string;
  montantCentimes: Centimes;
  modeReglement: ModeReglement;
  referenceFacture: string;
};
export type LigneAchat = {
  id: string;
  date: string;
  fournisseur: string;
  montantCentimes: Centimes;
  modeReglement: ModeReglement;
  referencePiece: string;
};

const vide = (t: unknown): boolean => typeof t !== 'string' || t.trim() === '';
const montantOk = (m: unknown): boolean => typeof m === 'number' && Number.isSafeInteger(m) && m > 0;

function controler(montant: unknown, tiers: unknown, reference: unknown, date: unknown, mode: unknown, codeTiers: CodeLigne): CodeLigne[] {
  const codes: CodeLigne[] = [];
  if (!montantOk(montant)) codes.push('montant_invalide');
  if (vide(tiers)) codes.push(codeTiers);
  if (vide(reference)) codes.push('reference_vide');
  if (!estDateIso(date)) codes.push('date_invalide');
  if (!estDans(MODES_REGLEMENT, mode)) codes.push('mode_inconnu');
  return codes;
}

/** Liste des codes d'erreur de la ligne ; vide si la ligne est valide. */
export function verifierLigneRecette(l: LigneRecette): CodeLigne[] {
  return controler(l.montantCentimes, l.client, l.referenceFacture, l.dateEncaissement, l.modeReglement, 'client_vide');
}

/** Même contrôle pour le registre des achats (le fournisseur vide donne `client_vide`). */
export function verifierLigneAchat(l: LigneAchat): CodeLigne[] {
  return controler(l.montantCentimes, l.fournisseur, l.referencePiece, l.date, l.modeReglement, 'client_vide');
}

/** Lignes de la période (bornes incluses), triées par date puis id, avec leur total exact. */
export function livreSurPeriode(
  lignes: readonly LigneRecette[],
  debut: string,
  fin: string,
): { lignes: LigneRecette[]; totalCentimes: Centimes } {
  exigerDate(debut, 'debut');
  exigerDate(fin, 'fin');
  if (fin < debut) throw new ErreurProfil('ordre_inverse');
  if (lignes.some((l) => verifierLigneRecette(l).length > 0)) throw new ErreurProfil('ligne_invalide');
  const retenues = lignes
    .filter((l) => l.dateEncaissement >= debut && l.dateEncaissement <= fin)
    .sort((a, b) => (a.dateEncaissement === b.dateEncaissement ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.dateEncaissement < b.dateEncaissement ? -1 : 1));
  return { lignes: retenues, totalCentimes: retenues.reduce((t, l) => ajouter(t, l.montantCentimes), centimes(0)) };
}

export function registreAchatsExige(activite: ActiviteMicro): boolean {
  if (activite === 'vente_marchandises' || activite === 'mixte') return true;
  if (activite === 'services') return false;
  throw new ErreurProfil('activite_inconnue');
}

/** Livre des recettes seulement pour EI + micro ; sinon partie double. */
export function tenueApplicable(p: { forme: Forme; regime: RegimeImposition }): Tenue {
  return p.forme === 'EI' && p.regime === 'micro' ? 'livre_recettes' : 'partie_double';
}
