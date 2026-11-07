// Dividende du gérant majoritaire de SARL : base, seuil bloquant, levée du blocage.
// Base et seuil sont arrondis vers le bas (mode `inferieur`, choix explicite).
import { ajouter, appliquerFraction, centimes, pourcentage, soustraire, type Centimes } from '../argent/index.js';

export class ErreurDividendeGerant extends Error {
  override name = 'ErreurDividendeGerant';
}

export interface AssocieGerant {
  id: string;
  parts: number;
  role: string;
  lienAvec?: string;
  lien?: 'conjoint' | 'enfant_mineur';
}

export interface EntreeControleGerant {
  forme: string;
  beneficiaireId: string;
  associes: readonly AssocieGerant[];
  capital: Centimes;
  primes: Centimes;
  comptesCourants: Readonly<Record<string, Centimes>>;
  dividendes: Readonly<Record<string, Centimes>>;
}

export type StatutControleGerant = 'non_applicable' | 'passe' | 'bloquant';

export interface ResultatControleGerant {
  statut: StatutControleGerant;
  base: Centimes;
  seuil: Centimes;
  dividendeGroupe: Centimes;
  excedent: Centimes;
  raison?: 'forme_non_sarl' | 'role_non_majoritaire';
  levee?: 'dividende_reduit' | 'confirmation_nommee';
}

export type LeveeBlocage =
  | { type: 'dividende_reduit'; dividende: Centimes }
  | { type: 'confirmation_nommee'; nom: string; date: string };

const zero = centimes(0);
const FORME_APPLICABLE = 'SARL';
const ROLE_APPLICABLE = 'gerant_majoritaire';

function entierPositif(nom: string, v: number): void {
  if (!Number.isSafeInteger(v) || v < 0) throw new ErreurDividendeGerant(nom + ' doit être un entier sûr positif ou nul : ' + String(v));
}

function somme(ids: readonly string[], table: Readonly<Record<string, Centimes>>, creditSeul: boolean): Centimes {
  let t = zero;
  for (const id of ids) {
    const v = table[id] ?? zero;
    if (!Number.isSafeInteger(v)) throw new ErreurDividendeGerant('Montant invalide pour ' + id + '.');
    if (!creditSeul && v < 0) throw new ErreurDividendeGerant('Un dividende ne peut pas être négatif.');
    if (!creditSeul || v > 0) t = ajouter(t, v);
  }
  return t;
}

export function controleDividendeGerant(entree: EntreeControleGerant, seuilPointsDeBase: number): ResultatControleGerant {
  entierPositif('Le seuil', seuilPointsDeBase);
  for (const a of entree.associes) entierPositif('Les parts', a.parts);
  const total = entree.associes.reduce((s, a) => s + a.parts, 0);
  if (!Number.isSafeInteger(total) || total <= 0) throw new ErreurDividendeGerant('Le total des parts doit être strictement positif.');
  const beneficiaire = entree.associes.find((a) => a.id === entree.beneficiaireId);
  if (!beneficiaire) throw new ErreurDividendeGerant('Bénéficiaire absent de la liste des associés.');
  if (entree.capital < 0 || entree.primes < 0) throw new ErreurDividendeGerant('Capital et primes ne peuvent pas être négatifs.');

  const vide = { base: zero, seuil: zero, dividendeGroupe: zero, excedent: zero };
  if (entree.forme !== FORME_APPLICABLE) return { statut: 'non_applicable', ...vide, raison: 'forme_non_sarl' };
  if (beneficiaire.role !== ROLE_APPLICABLE) return { statut: 'non_applicable', ...vide, raison: 'role_non_majoritaire' };

  const groupe = entree.associes.filter((a) => a.id === entree.beneficiaireId || a.lienAvec === entree.beneficiaireId);
  const ids = groupe.map((a) => a.id);
  const partsGroupe = groupe.reduce((s, a) => s + a.parts, 0);
  const apport = appliquerFraction(ajouter(entree.capital, entree.primes), partsGroupe, total, 'inferieur');
  const base = ajouter(apport, somme(ids, entree.comptesCourants, true));
  const seuil = pourcentage(base, seuilPointsDeBase, 'inferieur');
  const dividendeGroupe = somme(ids, entree.dividendes, false);
  const bloque = dividendeGroupe > seuil;
  return {
    statut: bloque ? 'bloquant' : 'passe',
    base,
    seuil,
    dividendeGroupe,
    excedent: bloque ? soustraire(dividendeGroupe, seuil) : zero,
  };
}

export function leverBlocage(resultat: ResultatControleGerant, levee: LeveeBlocage): ResultatControleGerant {
  if (resultat.statut !== 'bloquant') throw new ErreurDividendeGerant('Seul un blocage peut être levé.');
  if (levee.type === 'dividende_reduit') {
    if (!Number.isSafeInteger(levee.dividende) || levee.dividende < 0 || levee.dividende > resultat.seuil) {
      throw new ErreurDividendeGerant('Le dividende réduit doit rester dans le seuil.');
    }
    return { ...resultat, statut: 'passe', dividendeGroupe: levee.dividende, excedent: zero, levee: 'dividende_reduit' };
  }
  if (levee.nom.trim() === '' || levee.date.trim() === '') {
    throw new ErreurDividendeGerant('La confirmation exige un nom et une date.');
  }
  return { ...resultat, statut: 'passe', levee: 'confirmation_nommee' };
}
