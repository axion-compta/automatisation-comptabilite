// Alertes ALR-01, ALR-03, ALR-04 (AL-R2) : constats pour `evaluer`. Bornes en arguments, dates d'échéance reçues du calendrier.
import { ajouterJours, joursEntre } from '../../interface/dates.js';
import { graviteCourante, type Escalade } from '../gravite.js';
import type { Constat } from '../moteur.js';

export class ErreurRegle extends Error {
  override name = 'ErreurRegle';
  readonly code = 'parametre_invalide';
  constructor() {
    super('parametre_invalide');
  }
}

export interface ParametresEcheance {
  joursAFaire: number;
  joursUrgent: number;
}

const entier = (n: unknown, min: number): boolean => typeof n === 'number' && Number.isSafeInteger(n) && n >= min;

function escalade(p: ParametresEcheance): Escalade {
  if (!entier(p.joursAFaire, 0) || !entier(p.joursUrgent, 0)) throw new ErreurRegle();
  return [
    { type: 'avant_echeance', jours: p.joursAFaire, vers: 'a_faire' },
    { type: 'avant_echeance', jours: p.joursUrgent, vers: 'urgent' },
  ];
}

function constatsEcheances(
  regle: string,
  objetType: string,
  liste: readonly { id: string; dateLimite?: string; faite: boolean }[],
  jour: string,
  parametres: ParametresEcheance,
): Constat[] {
  const paliers = escalade(parametres);
  const constats: Constat[] = [];
  for (const x of liste) {
    if (x.faite || x.dateLimite === undefined) continue;
    const gravite = graviteCourante('info', paliers, { jour, echeanceLe: x.dateLimite, ouverteLe: jour }, 'echeance_legale');
    if (gravite === 'info') continue;
    constats.push({ regle, objetType, objetId: x.id, gravite, echeanceLe: x.dateLimite });
  }
  return constats;
}

/** ALR-01 : TVA à déclarer. */
export function alr01(
  echeancesTva: readonly { id: string; dateLimite?: string; faite: boolean }[],
  jour: string,
  parametres: ParametresEcheance,
): Constat[] {
  return constatsEcheances('ALR-01', 'echeance_tva', echeancesTva, jour, parametres);
}

/** ALR-04 : liasse, acompte, CFE ou autre échéance. */
export function alr04(
  echeances: readonly { id: string; type: 'liasse' | 'acompte_is' | 'cfe' | 'autre'; dateLimite?: string; faite: boolean }[],
  jour: string,
  parametres: ParametresEcheance,
): Constat[] {
  return constatsEcheances('ALR-04', 'echeance', echeances, jour, parametres);
}

/** ALR-03 : compte actif sans relevé couvrant le mois écoulé à partir du jour du mois fixé. */
export function alr03(
  comptes: readonly { id: string; actif: boolean; dernierReleveCouvreJusquAu?: string }[],
  jour: string,
  prochaineEcheanceTva: string | undefined,
  parametres: { jourDuMois: number; joursAvantTva: number },
): Constat[] {
  if (!entier(parametres.jourDuMois, 1) || !entier(parametres.joursAvantTva, 0)) throw new ErreurRegle();
  const avantJour = Number(jour.slice(8, 10)) < parametres.jourDuMois;
  const debutMoisEcoule = ajouterJours(jour.slice(0, 8) + '01', -1).slice(0, 8) + '01';
  // Avant le jour du mois : seul un retard plus ancien (fin du mois M-2) compte, sur un compte déjà importé.
  const finMoisEcoule = avantJour ? ajouterJours(debutMoisEcoule, -1) : ajouterJours(jour.slice(0, 8) + '01', -1);
  const paliers: Escalade = [{ type: 'avant_echeance', jours: parametres.joursAvantTva, vers: 'urgent' }];
  const gravite = graviteCourante('a_faire', paliers, { jour, ouverteLe: jour, ...(prochaineEcheanceTva ? { echeanceLe: prochaineEcheanceTva } : {}) }, 'argent');
  const constats: Constat[] = [];
  for (const c of comptes) {
    if (!c.actif) continue;
    if (avantJour && c.dernierReleveCouvreJusquAu === undefined) continue;
    if (c.dernierReleveCouvreJusquAu !== undefined && joursEntre(c.dernierReleveCouvreJusquAu, finMoisEcoule) <= 0) continue;
    constats.push({ regle: 'ALR-03', objetType: 'compte', objetId: c.id, periode: finMoisEcoule.slice(0, 7), gravite });
  }
  return constats;
}
