import { ErreurProfil, exigerDate } from '../types.js';

/** Codes de règle d'effet lus dans la valeur du paramètre : liste fermée, jamais de repli. */
export const REGLES_EFFET = ['premier_jour_mois_suivant', 'jour_meme'] as const;
export type RegleEffetOption = (typeof REGLES_EFFET)[number];
export type Exigibilite = 'livraison' | 'encaissement' | 'debits' | 'non_calculee';
export type EntreeExigibilite = {
  nature: 'bien' | 'service';
  dateOperation: string;
  optionDebitsEffet: string | null;
  exigibiliteConfirmeePar: string | null;
  vendDesServices: boolean;
};

const STATUT_VALIDE = 'valide';
const DERNIER_MOIS = 12;
const ANNEE_MAX = 9999;

const confirmee = (par: string | null): boolean => typeof par === 'string' && par !== '';

export function dateEffetOption(
  dateOption: string,
  p: { regle: RegleEffetOption; statutParametre: string },
): { effetDebut: string; aVerifier: boolean } {
  if (!REGLES_EFFET.includes(p.regle)) throw new ErreurProfil('regle_effet_inconnue');
  const option = exigerDate(dateOption, 'dateOption');
  const aVerifier = p.statutParametre !== STATUT_VALIDE;
  if (p.regle === 'jour_meme') return { effetDebut: option, aVerifier };
  let annee = Number(option.slice(0, 4));
  let mois = Number(option.slice(5, 7)) + 1;
  if (mois > DERNIER_MOIS) {
    mois = 1;
    annee += 1;
  }
  if (annee > ANNEE_MAX) throw new ErreurProfil('date_invalide', 'date_invalide: effet');
  const effetDebut = String(annee).padStart(4, '0') + '-' + String(mois).padStart(2, '0') + '-01';
  return { effetDebut, aVerifier };
}

export function exigibilitePour(e: Readonly<EntreeExigibilite>): Exigibilite {
  const operation = exigerDate(e.dateOperation, 'dateOperation');
  const effet = e.optionDebitsEffet === null ? null : exigerDate(e.optionDebitsEffet, 'optionDebitsEffet');
  if (e.nature === 'bien') return 'livraison';
  if (!confirmee(e.exigibiliteConfirmeePar)) return 'non_calculee';
  return effet !== null && operation >= effet ? 'debits' : 'encaissement';
}

/** Vrai si la société vend des services sans exigibilité confirmée : ventes en brouillon. */
export function ventesEnBrouillon(s: { vendDesServices: boolean; exigibiliteConfirmeePar: string | null }): boolean {
  return s.vendDesServices && !confirmee(s.exigibiliteConfirmeePar);
}
