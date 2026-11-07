// Affichage des montants et des dates en format français (V3-UX-124).
// Tout le format est ici : un changement de convention ne touche que ce fichier.
// Aucun flottant, aucun toLocaleString (dépend de la machine), aucun Date.
import { formater, type Centimes } from '../../../noyau/src/argent/index.js';

const ESPACE_FINE = ' ';
const ESPACE_INSECABLE = ' ';
const MOINS = '−';
const SYMBOLE = '€';
const GROUPE_MILLIERS = /\B(?=(?:\d{3})+(?!\d))/g;

/** Vrai si le montant est strictement négatif (utile au composant). */
export function estNegatif(centimes: Centimes): boolean {
  return centimes < 0;
}

/** 123456 donne « 1 234,56 € » (espace fine insécable entre milliers, espace insécable avant €). */
export function formaterMontantAffiche(centimes: Centimes): string {
  const brut = formater(centimes);
  const negatif = brut.startsWith('-');
  const [euros = '', reste = ''] = (negatif ? brut.slice(1) : brut).split(',');
  const groupe = euros.replace(GROUPE_MILLIERS, ESPACE_FINE);
  return (negatif ? MOINS : '') + groupe + ',' + reste + ESPACE_INSECABLE + SYMBOLE;
}

const FORME_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const JOURS_PAR_MOIS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function estBissextile(annee: number): boolean {
  return (annee % 4 === 0 && annee % 100 !== 0) || annee % 400 === 0;
}

/** '2026-03-31' donne « 31/03/2026 » par découpe de chaîne ; toute autre forme est une erreur. */
export function formaterDateAffiche(date: string): string {
  const m = FORME_DATE.exec(date);
  if (!m) throw new Error('Date invalide : ' + date);
  const [, a = '', mo = '', j = ''] = m;
  const annee = Number(a);
  const mois = Number(mo);
  const jour = Number(j);
  const maxJours = mois === 2 && estBissextile(annee) ? 29 : (JOURS_PAR_MOIS[mois - 1] ?? 0);
  if (mois < 1 || mois > 12 || jour < 1 || jour > maxJours) {
    throw new Error('Date invalide : ' + date);
  }
  return j + '/' + mo + '/' + a;
}
