// Messages du moteur : écart de change, dividende, modèle, libération, classement. Vouvoiement.
// Aucun flottant, aucune dépendance au noyau : les montants sont des centimes entiers, les taux des entiers à 8 décimales.
const ESPACE_FINE = '\u202f';
const ESPACE_INSECABLE = '\u00a0';
const MOINS = '−';
const FORME_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const JOURS_PAR_MOIS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export type SensEcartChange = 'gain' | 'perte' | 'aucun';

export interface TauxAffiche {
  tauxE8: number;
  source: string;
  date: string;
}

export interface EntreePhraseEcart {
  sens: SensEcartChange;
  montant: number;
  tauxPiece: TauxAffiche;
  tauxPaiement: TauxAffiche;
}

function entier(v: number, nom: string): number {
  if (!Number.isSafeInteger(v)) throw new Error('Entier attendu pour ' + nom + ' : ' + String(v));
  return v;
}

/** 92000000 donne « 0,92000000 » (8 décimales, virgule), par découpage de chaîne. */
export function formaterTauxE8(tauxE8: number): string {
  if (entier(tauxE8, 'taux') < 0) throw new Error('Taux négatif : ' + String(tauxE8));
  const chiffres = String(tauxE8).padStart(9, '0');
  return chiffres.slice(0, -8) + ',' + chiffres.slice(-8);
}

/** 123456 donne « 1 234,56 € » (espace fine insécable entre milliers, espace insécable avant €). */
export function formaterCentimes(centimes: number): string {
  const c = entier(centimes, 'montant');
  const absolu = String(Math.abs(c)).padStart(3, '0');
  const euros = absolu.slice(0, -2).replace(/\B(?=(?:\d{3})+(?!\d))/g, ESPACE_FINE);
  return (c < 0 ? MOINS : '') + euros + ',' + absolu.slice(-2) + ESPACE_INSECABLE + '€';
}

/** '2026-10-07' donne « 07/10/2026 » ; toute autre forme ou date impossible est une erreur. */
export function formaterDate(date: string): string {
  const m = FORME_DATE.exec(date);
  if (!m) throw new Error('Date invalide : ' + date);
  const [, a = '', mo = '', j = ''] = m;
  const annee = Number(a);
  const mois = Number(mo);
  const bissextile = (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0;
  const maxJours = mois === 2 && bissextile ? 29 : (JOURS_PAR_MOIS[mois - 1] ?? 0);
  if (mois < 1 || mois > 12 || Number(j) < 1 || Number(j) > maxJours) throw new Error('Date invalide : ' + date);
  return j + '/' + mo + '/' + a;
}

export function libelleSens(sens: SensEcartChange): string {
  if (sens === 'gain') return 'Gain de change';
  if (sens === 'perte') return 'Perte de change';
  if (sens === 'aucun') return 'Aucun écart de change';
  throw new Error('Sens inconnu : ' + String(sens));
}

function tauxAvecSource(t: TauxAffiche): string {
  return formaterTauxE8(t.tauxE8) + ' (' + t.source + ', ' + formaterDate(t.date) + ')';
}

/** Phrase d'explication : le sens vient du champ `sens`, le montant est pris en valeur absolue. */
export function phraseEcartChange(e: EntreePhraseEcart): string {
  const libelle = libelleSens(e.sens);
  const montant = formaterCentimes(Math.abs(entier(e.montant, 'montant')));
  if (e.sens === 'aucun') return 'Aucun écart de change.';
  return (
    libelle +
    ' de ' +
    montant +
    ' : la facture a été enregistrée au taux de ' +
    tauxAvecSource(e.tauxPiece) +
    ' et payée à ' +
    tauxAvecSource(e.tauxPaiement) +
    '.'
  );
}

export const dividendeGerantBloque =
  "Dividende bloqué : cotisations sociales dues sur l'excédent : à voir avec votre expert-comptable.";
export const modeleAFaireValider = 'Modèle à faire valider';
export const aVerifier = 'À vérifier';

export function liberationInsuffisante(manque: number): string {
  return 'Libération insuffisante : il manque ' + formaterCentimes(manque) + '.';
}

export function classeNFoisSurM(n: number, m: number): string {
  if (entier(n, 'n') < 0 || entier(m, 'm') < 1 || n > m) throw new Error('Classement invalide : ' + String(n) + '/' + String(m));
  return 'Classé ' + String(n) + ' fois sur ' + String(m);
}

export function soldeBanqueImpossible(ecart: number): string {
  return 'Le solde de la banque est impossible à rapprocher : écart de ' + formaterCentimes(ecart) + '.';
}
