// Seuils d'alerte en points de base : une alerte par seuil, par objet et par mois.
import { ErreurAbonnement, verifierEntier, verifierHorodatage, type EvenementJournal } from './types.js';

const BASE_POINTS = 10000;

function produit(a: number, b: number): number {
  const p = a * b;
  if (!Number.isSafeInteger(p)) throw new ErreurAbonnement('depassement_entier');
  return p;
}

export function seuilAtteint(utilise: number, compris: number, seuilBps: number): boolean {
  verifierEntier(utilise, 0);
  if (typeof compris !== 'number' || !Number.isSafeInteger(compris) || compris < 1) {
    throw new ErreurAbonnement('palier_invalide');
  }
  verifierEntier(seuilBps, 1);
  return produit(utilise, BASE_POINTS) >= produit(compris, seuilBps);
}

export type EntreeAlertes = {
  utilise: number; compris: number; seuilsBps: readonly number[]; mois: string;
  dejaEmises: ReadonlySet<string>; horodatage: string; objet: 'volume' | 'budget_ia';
};
export type SortieAlertes = {
  alertes: { seuilBps: number; mois: string }[]; dejaEmises: ReadonlySet<string>; evenements: EvenementJournal[];
};

export function nouvellesAlertes(e: EntreeAlertes): SortieAlertes {
  verifierHorodatage(e.horodatage);
  if (typeof e.mois !== 'string' || e.mois === '') throw new ErreurAbonnement('date_invalide');
  const seuils = [...new Set(e.seuilsBps)].sort((a, b) => a - b);
  const emises = new Set(e.dejaEmises);
  const alertes: SortieAlertes['alertes'] = [];
  const evenements: EvenementJournal[] = [];
  for (const seuilBps of seuils) {
    if (!seuilAtteint(e.utilise, e.compris, seuilBps)) continue;
    const cle = e.objet + ':' + e.mois + ':' + String(seuilBps);
    if (emises.has(cle)) continue;
    emises.add(cle);
    alertes.push({ seuilBps, mois: e.mois });
    evenements.push({
      type: 'abonnement.seuil_atteint', horodatage: e.horodatage,
      donnees: { objet: e.objet, mois: e.mois, seuilBps },
    });
  }
  return { alertes, dejaEmises: emises, evenements };
}
