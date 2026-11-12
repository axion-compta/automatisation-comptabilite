// Widgets V1 du tableau de bord : liste par profil, séries multiples, comparaison N-1, position face aux seuils.
// Seuils et pourcentage d'alerte sont lus dans les paramètres datés : aucun n'est écrit ici.
import { parametreAuJour, type ParametreLegal } from '../../../parametres/src/au-jour.js';
import { centimes, proportionPointsDeBase, soustraire, type Centimes } from '../argent/index.js';
import { etatFranchise, niveauSeuil, type NiveauFranchise, type NiveauSeuil } from '../profil/fiscal/seuils.js';
import type { Impot, RegimeImposition, RegimeTva } from '../profil/types.js';
import { periodeComparaison, type ExerciceBorne } from './periodes.js';
import type { Periode } from '../interface/types.js';

export const WIDGETS_V1 = ['evolution', 'comparaison_n1', 'tva', 'seuil_micro', 'seuil_franchise', 'impot_estime', 'point_mort', 'temps_gagne'] as const;
export type WidgetV1 = (typeof WIDGETS_V1)[number];
export interface ProfilWidgets {
  regimeTva: RegimeTva;
  regimeImposition: RegimeImposition;
  impot: Impot;
}

export class ErreurWidgets extends Error {
  readonly code: 'serie_en_double' | 'parametre_invalide';
  constructor(code: 'serie_en_double' | 'parametre_invalide') {
    super(code);
    this.name = 'ErreurWidgets';
    this.code = code;
  }
}

export function widgetsPour(profil: ProfilWidgets): WidgetV1[] {
  const tva = profil.regimeTva === 'reel_simplifie' || profil.regimeTva === 'reel_normal';
  const retenus: Record<WidgetV1, boolean> = {
    evolution: true,
    comparaison_n1: true,
    tva,
    seuil_micro: profil.regimeImposition === 'micro',
    seuil_franchise: profil.regimeTva === 'franchise',
    impot_estime: profil.impot === 'IS',
    point_mort: true,
    temps_gagne: true,
  };
  return WIDGETS_V1.filter((w) => retenus[w]);
}

export interface Serie {
  code: string;
  points: readonly { date: string; valeur: Centimes }[];
}
export interface SeriesAlignees {
  periode: Periode;
  dates: string[];
  series: { code: string; valeurs: (Centimes | null)[] }[];
}

/** Séries sur une même période : mêmes dates pour toutes, `null` là où une série n'a pas de point. */
export function seriesMultiples(series: readonly Serie[], periode: Periode): SeriesAlignees {
  if (new Set(series.map((s) => s.code)).size !== series.length) throw new ErreurWidgets('serie_en_double');
  const dans = (date: string): boolean => date >= periode.debut && date <= periode.fin;
  const dates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date).filter(dans)))].sort();
  return {
    periode,
    dates,
    series: series.map((s) => ({ code: s.code, valeurs: dates.map((d) => s.points.find((p) => p.date === d)?.valeur ?? null) })),
  };
}

export type ComparaisonN1 =
  | { vide: 'pas_d_exercice_precedent' | 'precedent_trop_court' }
  | { courant: Centimes; precedent: Centimes; ecart: Centimes; variationPdb: number | null; periodePrecedente: Periode; tronquee: boolean };

export function comparaisonN1(
  periode: Periode,
  exercice: ExerciceBorne,
  precedent: ExerciceBorne | undefined,
  valeurSur: (p: Periode) => Centimes,
): ComparaisonN1 {
  const c = periodeComparaison(periode, exercice, precedent);
  if ('vide' in c) return c;
  const courant = valeurSur(periode);
  const avant = valeurSur({ debut: c.debut, fin: c.fin });
  const ecart = soustraire(courant, avant);
  return {
    courant,
    precedent: avant,
    ecart,
    variationPdb: proportionPointsDeBase(ecart, Math.abs(avant), 'demi-superieur'),
    periodePrecedente: { debut: c.debut, fin: c.fin },
    tronquee: c.tronquee === true,
  };
}

export interface PositionSeuils {
  micro?: { niveau: NiveauSeuil; aVerifier: boolean };
  franchise?: { niveau: NiveauFranchise; aVerifier: boolean };
}

function entier(texte: unknown): number {
  const n = typeof texte === 'string' ? Number(texte) : Number.NaN;
  if (!Number.isSafeInteger(n)) throw new ErreurWidgets('parametre_invalide');
  return n;
}

/** Position du chiffre d'affaires face aux seuils micro et franchise ; `aVerifier` tant que le paramètre n'est pas valide. */
export function positionSeuils(
  profil: ProfilWidgets,
  ca: Centimes,
  activite: 'ventes' | 'services',
  parametres: readonly ParametreLegal[],
  date: string,
): PositionSeuils {
  const lire = (cle: string): ParametreLegal => parametreAuJour(parametres, cle, 'FR', date);
  const alerte = lire('alerte.seuil_pct');
  const sortie: PositionSeuils = {};
  if (profil.regimeImposition === 'micro') {
    const p = lire('micro.plafond.' + activite);
    const niveau = niveauSeuil(ca, { seuilCentimes: centimes(entier(p.valeur)), alertePdb: entier(alerte.valeur) });
    sortie.micro = { niveau, aVerifier: p.statut !== 'valide' };
  }
  if (profil.regimeTva === 'franchise') {
    const p = lire('tva.franchise.seuil.' + activite);
    const v: unknown = JSON.parse(p.valeur);
    const { base, majore } = (typeof v === 'object' && v !== null ? v : {}) as Record<string, unknown>;
    const e = etatFranchise(ca, {
      seuilBase: centimes(entier(String(base))),
      seuilMajore: centimes(entier(String(majore))),
      alertePdb: entier(alerte.valeur),
      statutParametre: p.statut === 'valide' ? 'sur' : 'a_verifier',
    });
    sortie.franchise = { niveau: e.niveau, aVerifier: e.aVerifier || alerte.statut !== 'valide' };
  }
  if (sortie.micro !== undefined && alerte.statut !== 'valide') sortie.micro.aVerifier = true;
  return sortie;
}
