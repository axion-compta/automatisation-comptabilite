// Ventes : contrôles arithmétiques d'une facture lue (A1 totaux, A2 écart de TVA, A3 taux inconnu à la date).
// La TVA retenue reste la TVA lue. Aucun taux ici : les taux attendus arrivent d'un paramètre daté.
import { parametreAuJour, utilisablePourOfficiel, type ParametreLegal } from '../../../parametres/src/au-jour.js';
import { ajouter, centimes, soustraire, type Centimes } from '../argent/index.js';
import { ecartTva } from '../tva/deductible.js';
import { ErreurVente } from './types.js';

export interface EntreeTotaux {
  ht: Centimes;
  tva: Centimes;
  ttc: Centimes;
}
export interface ResultatTotaux {
  ok: boolean;
  ecart: Centimes;
  anomalie?: 'A1';
}
export interface LigneControleTva {
  tauxPdb: number;
  baseCentimes: Centimes;
  tvaLueCentimes: Centimes;
}
export interface ResultatTauxTva {
  tauxPdb: number;
  tvaRetenue: Centimes;
  tvaAttendue?: Centimes;
  ecart?: Centimes;
  anomalie?: 'A2' | 'A3';
}
export type TauxAttendus = { taux: number[]; aVerifier: boolean } | { absent: true };

function montant(v: number): Centimes {
  if (!Number.isSafeInteger(v) || v < 0) throw new ErreurVente('montant_invalide', 'Montant invalide.');
  return centimes(v);
}

export function controleTotaux(e: EntreeTotaux): ResultatTotaux {
  const ecart = soustraire(montant(e.ttc), ajouter(montant(e.ht), montant(e.tva)));
  return ecart === 0 ? { ok: true, ecart } : { ok: false, ecart, anomalie: 'A1' };
}

export function controleTvaParTaux(lignes: readonly LigneControleTva[], tauxAttendus: readonly number[]): ResultatTauxTva[] {
  const parTaux = new Map<number, { base: Centimes; tva: Centimes }>();
  for (const l of lignes) {
    if (!Number.isSafeInteger(l.tauxPdb) || l.tauxPdb < 0) throw new ErreurVente('taux_invalide', 'Taux invalide.');
    const deja = parTaux.get(l.tauxPdb) ?? { base: centimes(0), tva: centimes(0) };
    parTaux.set(l.tauxPdb, { base: ajouter(deja.base, montant(l.baseCentimes)), tva: ajouter(deja.tva, montant(l.tvaLueCentimes)) });
  }
  return [...parTaux.keys()]
    .sort((a, b) => a - b)
    .map((tauxPdb): ResultatTauxTva => {
      const g = parTaux.get(tauxPdb) as { base: Centimes; tva: Centimes };
      if (!tauxAttendus.includes(tauxPdb)) return { tauxPdb, tvaRetenue: g.tva, anomalie: 'A3' };
      const r = ecartTva({ base: g.base, tauxPointsDeBase: tauxPdb, tvaLue: g.tva });
      return { tauxPdb, tvaRetenue: r.tvaRetenue, tvaAttendue: r.tvaAttendue, ecart: r.ecart, ...(r.carte ? { anomalie: 'A2' as const } : {}) };
    });
}

const FORME_ENTIER = /^\d+$/;

function lireTaux(valeur: string): number[] {
  return valeur.split('|').map((t) => {
    const n = FORME_ENTIER.test(t) ? Number(t) : Number.NaN;
    if (!Number.isSafeInteger(n)) throw new ErreurVente('parametre_mal_forme', 'Paramètre de taux mal formé.');
    return n;
  });
}

export function tauxAttendusALaDate(liste: readonly ParametreLegal[], cle: string, pays: string, date: string): TauxAttendus {
  let p: ParametreLegal;
  try {
    p = parametreAuJour(liste, cle, pays, date);
  } catch (e) {
    if ((e as { code?: string }).code === 'parametre_absent') return { absent: true };
    throw e;
  }
  return { taux: lireTaux(p.valeur), aVerifier: !utilisablePourOfficiel(p) };
}
