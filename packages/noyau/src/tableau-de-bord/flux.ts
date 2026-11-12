// Flux du tableau de bord : argent qui rentre et qui sort, résultat à date, dépenses par catégorie, marge.
// Écritures VALIDÉES seulement, centimes entiers. Les préfixes de comptes sont des arguments : aucun n'est écrit ici.
import { ajouter, centimes, soustraire, type Centimes } from '../argent/index.js';
import type { Ecriture } from '../ecritures/modele.js';
import { balance } from '../livres/balance.js';
import { periodeComparaison, periodeDeVue, type Comparaison, type ExerciceBorne } from './periodes.js';

export interface DefinitionsFlux {
  recettes: { prefixes: string[] }; depenses: { prefixes: string[] };
  categories: { nom: string; prefixes: string[] }[];
  ca: { prefixes: string[]; deduire: string[] }; achatsConsommes: { prefixes: string[] };
}
export interface PeriodeFlux { debut: string; fin: string }
export interface Flux {
  periode: PeriodeFlux; recettes: Centimes; depenses: Centimes; resultat: Centimes;
  ca: Centimes; achatsConsommes: Centimes; marge: Centimes;
}
export type FluxComparaison =
  | { periode: PeriodeFlux; recettes: Centimes; depenses: Centimes; resultat: Centimes; tronquee?: true }
  | { vide: 'pas_d_exercice_precedent' | 'precedent_trop_court' };
export interface CategorieDepense { nom: string; montant: Centimes }
export interface ResultatFlux {
  mois: Flux; exerciceADate: Flux;
  comparaison: { mois: FluxComparaison; exerciceADate: FluxComparaison };
  categories: CategorieDepense[];
}

export const CATEGORIE_RESTE = 'non_classe';

export class ErreurFlux extends Error {
  override name = 'ErreurFlux';
  readonly code = 'definitions_invalides';
  constructor() { super('definitions_invalides'); }
}

const listeValide = (l: readonly string[], vide = false): boolean => (vide || l.length > 0) && l.every((p) => p !== '');

function verifier(d: DefinitionsFlux): void {
  const noms = d.categories.map((c) => c.nom);
  const ok =
    listeValide(d.recettes.prefixes) && listeValide(d.depenses.prefixes) &&
    listeValide(d.ca.prefixes) && listeValide(d.ca.deduire, true) && listeValide(d.achatsConsommes.prefixes) &&
    d.categories.every((c) => c.nom !== '' && c.nom !== CATEGORIE_RESTE && listeValide(c.prefixes)) &&
    new Set(noms).size === noms.length;
  if (!ok) throw new ErreurFlux();
}

const correspond = (compte: string, prefixes: readonly string[]): boolean => prefixes.some((p) => compte.startsWith(p));
const oppose = (c: Centimes): Centimes => soustraire(centimes(0), c);
const dans = (ecritures: readonly Ecriture[], p: PeriodeFlux): Ecriture[] => ecritures.filter((e) => e.date >= p.debut && e.date <= p.fin);

/** Somme des soldes (débit - crédit) des comptes retenus, écritures validées de la période. */
function solde(ecritures: readonly Ecriture[], retenir: (compte: string) => boolean): Centimes {
  return balance(ecritures).lignes.reduce((s, l) => (retenir(l.compte) ? ajouter(s, l.solde) : s), centimes(0));
}

function fluxSur(ecritures: readonly Ecriture[], periode: PeriodeFlux, d: DefinitionsFlux): Flux {
  const e = dans(ecritures, periode);
  const recettes = oppose(solde(e, (c) => correspond(c, d.recettes.prefixes)));
  const depenses = solde(e, (c) => correspond(c, d.depenses.prefixes));
  const ventes = solde(e, (c) => correspond(c, d.ca.prefixes) && !correspond(c, d.ca.deduire));
  const deduit = solde(e, (c) => correspond(c, d.ca.deduire));
  const ca = soustraire(oppose(ventes), deduit);
  const achatsConsommes = solde(e, (c) => correspond(c, d.achatsConsommes.prefixes));
  return { periode, recettes, depenses, resultat: soustraire(recettes, depenses), ca, achatsConsommes, marge: soustraire(ca, achatsConsommes) };
}

function comparer(ecritures: readonly Ecriture[], c: Comparaison, d: DefinitionsFlux): FluxComparaison {
  if ('vide' in c) return { vide: c.vide };
  const { periode, recettes, depenses, resultat } = fluxSur(ecritures, { debut: c.debut, fin: c.fin }, d);
  return { periode, recettes, depenses, resultat, ...(c.tronquee === true ? { tronquee: true as const } : {}) };
}

/** Dépenses par catégorie : le premier regroupement qui correspond gagne ; le reste va dans `non_classe`. */
function parCategorie(ecritures: readonly Ecriture[], periode: PeriodeFlux, d: DefinitionsFlux): CategorieDepense[] {
  const lignes = balance(dans(ecritures, periode)).lignes.filter((l) => correspond(l.compte, d.depenses.prefixes));
  const totaux = new Map(d.categories.map((c) => [c.nom, centimes(0)]));
  let reste = centimes(0);
  for (const l of lignes) {
    const cat = d.categories.find((c) => correspond(l.compte, c.prefixes));
    if (cat === undefined) reste = ajouter(reste, l.solde);
    else totaux.set(cat.nom, ajouter(totaux.get(cat.nom) ?? centimes(0), l.solde));
  }
  const sortie = d.categories.map((c) => ({ nom: c.nom, montant: totaux.get(c.nom) ?? centimes(0) }));
  return reste === 0 ? sortie : [...sortie, { nom: CATEGORIE_RESTE, montant: reste }];
}

export function calculerFlux(
  ecritures: readonly Ecriture[],
  o: { jour: string; exercice: ExerciceBorne; precedent?: ExerciceBorne },
  d: DefinitionsFlux,
): ResultatFlux {
  verifier(d);
  const mensuelle = periodeDeVue('mois', o.exercice, o.jour);
  const moisADate = { debut: mensuelle.debut, fin: o.jour };
  const depuisDebut = periodeDeVue('depuis_debut', o.exercice, o.jour);
  return {
    mois: fluxSur(ecritures, moisADate, d),
    exerciceADate: fluxSur(ecritures, depuisDebut, d),
    comparaison: {
      mois: comparer(ecritures, periodeComparaison(moisADate, o.exercice, o.precedent), d),
      exerciceADate: comparer(ecritures, periodeComparaison(depuisDebut, o.exercice, o.precedent), d),
    },
    categories: parCategorie(ecritures, depuisDebut, d),
  };
}
