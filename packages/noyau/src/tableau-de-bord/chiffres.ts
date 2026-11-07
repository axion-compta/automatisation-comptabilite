// Chiffres clés du tableau de bord, calculés sur les écritures VALIDÉES (centimes entiers).
// Les numéros de compte sont un argument (DefinitionsIndicateurs) : aucun n'est écrit ici.
import { ajouter, centimes, soustraire, type Centimes } from '../argent/index.js';
import type { Ecriture } from '../ecritures/modele.js';
import { balance } from '../livres/balance.js';

export interface DefinitionsIndicateurs {
  ca: { prefixes: string[]; deduire: string[] };
  charges: { prefixes: string[]; exclure: string[] };
  produits: { prefixes: string[] };
  tresorerie: { prefixes: string[] };
}
export interface Periode {
  debut: string;
  fin: string;
}
export interface Chiffres {
  ca: Centimes;
  charges: Centimes;
  resultatProvisoire: Centimes;
  tresorerie: Centimes;
  enAttente: { nombre: number; montant: Centimes };
}

export type CodeErreurChiffres = 'definitions_invalides' | 'periode_invalide';
export class ErreurChiffres extends Error {
  override name = 'ErreurChiffres';
  readonly code: CodeErreurChiffres;
  constructor(code: CodeErreurChiffres) {
    super(code);
    this.code = code;
  }
}

const listeValide = (l: readonly string[], vide = false): boolean =>
  (vide || l.length > 0) && l.every((p) => p !== '');

function verifier(d: DefinitionsIndicateurs, p: Periode): void {
  const ok =
    listeValide(d.ca.prefixes) && listeValide(d.ca.deduire, true) &&
    listeValide(d.charges.prefixes) && listeValide(d.charges.exclure, true) &&
    listeValide(d.produits.prefixes) && listeValide(d.tresorerie.prefixes);
  if (!ok) throw new ErreurChiffres('definitions_invalides');
  if (p.debut > p.fin) throw new ErreurChiffres('periode_invalide');
}

const correspond = (compte: string, prefixes: readonly string[]): boolean => prefixes.some((p) => compte.startsWith(p));

/** Somme des soldes (débit - crédit) des comptes retenus. */
function solde(ecritures: readonly Ecriture[], retenir: (compte: string) => boolean): Centimes {
  return balance(ecritures).lignes.reduce((s, l) => (retenir(l.compte) ? ajouter(s, l.solde) : s), centimes(0));
}
const oppose = (c: Centimes): Centimes => soustraire(centimes(0), c);
const dansPeriode = (ecritures: readonly Ecriture[], p: Periode): Ecriture[] =>
  ecritures.filter((e) => e.date >= p.debut && e.date <= p.fin);

function caSur(periode: readonly Ecriture[], d: DefinitionsIndicateurs): Centimes {
  const ventes = solde(periode, (c) => correspond(c, d.ca.prefixes) && !correspond(c, d.ca.deduire));
  const deduit = solde(periode, (c) => correspond(c, d.ca.deduire));
  return soustraire(oppose(ventes), deduit);
}
const chargesSur = (periode: readonly Ecriture[], d: DefinitionsIndicateurs): Centimes =>
  solde(periode, (c) => correspond(c, d.charges.prefixes) && !correspond(c, d.charges.exclure));
const resultatSur = (periode: readonly Ecriture[], d: DefinitionsIndicateurs): Centimes =>
  soustraire(oppose(solde(periode, (c) => correspond(c, d.produits.prefixes))), chargesSur(periode, d));
const tresorerieSur = (ecritures: readonly Ecriture[], fin: string, d: DefinitionsIndicateurs): Centimes =>
  solde(ecritures.filter((e) => e.date <= fin), (c) => correspond(c, d.tresorerie.prefixes));

export function chiffreAffaires(ecritures: readonly Ecriture[], periode: Periode, d: DefinitionsIndicateurs): Centimes {
  verifier(d, periode);
  return caSur(dansPeriode(ecritures, periode), d);
}
export function resultatProvisoire(ecritures: readonly Ecriture[], periode: Periode, d: DefinitionsIndicateurs): Centimes {
  verifier(d, periode);
  return resultatSur(dansPeriode(ecritures, periode), d);
}
/** Solde à la fin de la période : toutes les écritures validées jusqu'à `fin`. */
export function tresorerie(ecritures: readonly Ecriture[], fin: string, d: DefinitionsIndicateurs): Centimes {
  verifier(d, { debut: fin, fin });
  return tresorerieSur(ecritures, fin, d);
}

export function calculerChiffres(ecritures: readonly Ecriture[], periode: Periode, d: DefinitionsIndicateurs): Chiffres {
  verifier(d, periode);
  const dans = dansPeriode(ecritures, periode);
  const attente = dans.filter((e) => e.statut !== 'valide');
  const montant = attente.reduce((s, e) => e.lignes.reduce((t, l) => ajouter(t, l.debit), s), centimes(0));
  return {
    ca: caSur(dans, d),
    charges: chargesSur(dans, d),
    resultatProvisoire: resultatSur(dans, d),
    tresorerie: tresorerieSur(ecritures, periode.fin, d),
    enAttente: { nombre: attente.length, montant },
  };
}
