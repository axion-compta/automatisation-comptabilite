// Fin de contrat : remise, accusé, échéance d'effacement, relances. Les durées sont des paramètres.
import { ErreurAbonnement, ajouterJours, verifierDate, verifierEmpreinte, verifierEntier, verifierHorodatage } from './types.js';
import type { EvenementJournal, FinContrat } from './types.js';

export type ParametresFinContrat = {
  joursAvantEffacement: number;
  joursRappelAvantEffacement: number;
  joursRelancesSansAccuse: readonly number[];
};
export type RaisonEffacement = 'pas_de_remise' | 'pas_d_accuse' | 'gel_actif' | 'trop_tot' | null;

const LONGUEUR_DATE = 10;
const jourDe = (horodatage: string): string => horodatage.slice(0, LONGUEUR_DATE);

function entierMin1(n: number): void {
  try {
    verifierEntier(n, 1);
  } catch {
    throw new ErreurAbonnement('parametre_invalide');
  }
}

export function verifierParametres(p: ParametresFinContrat): ParametresFinContrat {
  entierMin1(p.joursAvantEffacement);
  entierMin1(p.joursRappelAvantEffacement);
  if (p.joursRappelAvantEffacement >= p.joursAvantEffacement) throw new ErreurAbonnement('parametre_invalide');
  if (!Array.isArray(p.joursRelancesSansAccuse) || p.joursRelancesSansAccuse.length === 0) {
    throw new ErreurAbonnement('parametre_invalide');
  }
  p.joursRelancesSansAccuse.forEach(entierMin1);
  const relances = [...new Set(p.joursRelancesSansAccuse)].sort((a, b) => a - b);
  return { ...p, joursRelancesSansAccuse: relances };
}

export function enregistrerRemise(
  fin: FinContrat,
  r: { manifesteEmpreinte: string; horodatage: string },
): { fin: FinContrat; evenement: EvenementJournal } {
  verifierEmpreinte(r.manifesteEmpreinte);
  verifierHorodatage(r.horodatage);
  return {
    fin: { ...fin, remisLe: r.horodatage, manifesteEmpreinte: r.manifesteEmpreinte },
    evenement: { type: 'fin_contrat.export_remis', horodatage: r.horodatage, donnees: { manifesteEmpreinte: r.manifesteEmpreinte } },
  };
}

export function enregistrerAccuse(
  fin: FinContrat,
  a: { empreinteRecue: string; auteur: string; horodatage: string },
): { fin: FinContrat; evenements: EvenementJournal[] } {
  if (fin.remisLe === null || fin.manifesteEmpreinte === null) throw new ErreurAbonnement('pas_de_remise');
  if (fin.accuseLe !== null) throw new ErreurAbonnement('deja_accuse');
  verifierEmpreinte(a.empreinteRecue);
  if (a.empreinteRecue !== fin.manifesteEmpreinte) throw new ErreurAbonnement('empreinte_differente');
  if (typeof a.auteur !== 'string' || a.auteur.trim() === '') throw new ErreurAbonnement('auteur_manquant');
  verifierHorodatage(a.horodatage);
  return {
    fin: { ...fin, accuseLe: a.horodatage, accusePar: a.auteur },
    evenements: [
      { type: 'fin_contrat.accuse', horodatage: a.horodatage, donnees: { auteur: a.auteur, empreinte: a.empreinteRecue } },
      { type: 'fin_contrat.effacement_planifie', horodatage: a.horodatage, donnees: { accuseLe: jourDe(a.horodatage) } },
    ],
  };
}

export function effacementPrevuLe(fin: FinContrat, p: ParametresFinContrat): string | null {
  const q = verifierParametres(p);
  return fin.accuseLe === null ? null : ajouterJours(jourDe(fin.accuseLe), q.joursAvantEffacement);
}

const geleActuellement = (fin: FinContrat): boolean => fin.gelModule.actif === true || fin.gelConsole === true;

export function peutDemanderEffacement(
  fin: FinContrat,
  aujourdhui: string,
  p: ParametresFinContrat,
): { permis: boolean; raison: RaisonEffacement } {
  verifierDate(aujourdhui);
  const prevu = effacementPrevuLe(fin, p);
  if (fin.remisLe === null) return { permis: false, raison: 'pas_de_remise' };
  if (prevu === null) return { permis: false, raison: 'pas_d_accuse' };
  if (geleActuellement(fin)) return { permis: false, raison: 'gel_actif' };
  if (aujourdhui < prevu) return { permis: false, raison: 'trop_tot' };
  return { permis: true, raison: null };
}

export function rappelDu(fin: FinContrat, aujourdhui: string, p: ParametresFinContrat): boolean {
  verifierDate(aujourdhui);
  const prevu = effacementPrevuLe(fin, p);
  if (prevu === null || geleActuellement(fin)) return false;
  return aujourdhui === ajouterJours(prevu, -p.joursRappelAvantEffacement);
}

export function relancesDues(
  fin: FinContrat,
  aujourdhui: string,
  p: ParametresFinContrat,
  dejaEnvoyees: readonly number[],
): { relances: number[]; transmettreAAxion: boolean } {
  verifierDate(aujourdhui);
  const q = verifierParametres(p);
  if (fin.remisLe === null || fin.accuseLe !== null) return { relances: [], transmettreAAxion: false };
  const remise = jourDe(fin.remisLe);
  const atteint = (jours: number): boolean => aujourdhui >= ajouterJours(remise, jours);
  const relances = q.joursRelancesSansAccuse.filter((j) => atteint(j) && !dejaEnvoyees.includes(j));
  const dernier = q.joursRelancesSansAccuse[q.joursRelancesSansAccuse.length - 1] as number;
  return { relances, transmettreAAxion: atteint(dernier) };
}
