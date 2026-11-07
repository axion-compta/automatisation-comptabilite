// Santé : cinq sous-indicateurs vert / orange / rouge, la pire couleur donne la globale.
// Seuils en arguments (réglables, jamais en dur). Aucun texte affiché : seulement des codes.
import { proportionPointsDeBase } from '../argent/index.js';
import type { Couleur } from '../interface/types.js';
import { ErreurControle } from './regles/commun.js';

export interface EntreeSante {
  lignesBanque: { total: number; justifiees: number };
  casOuverts: number;
  joursDepuisReleve: number | null;
  joursDepuisPiece: number | null;
  tvaB: number;
  tvaM: number;
  controlesB: number;
  controlesM: number;
}

export interface SeuilCouleur { orange: number; rouge: number }
export interface SeuilsSante { banque: SeuilCouleur; cas: SeuilCouleur; fraicheur: SeuilCouleur; tva: SeuilCouleur; controles: SeuilCouleur }

export type CodeSante = 'banque' | 'cas' | 'fraicheur' | 'tva' | 'controles';
export interface SousIndicateur { code: CodeSante; couleur: Couleur; valeur: number | null }
export interface Sante { globale: Couleur; sousIndicateurs: SousIndicateur[] }

const GRAVITE: Record<Couleur, number> = { vert: 0, orange: 1, rouge: 2 };

export function pire(couleurs: readonly Couleur[]): Couleur {
  return couleurs.reduce<Couleur>((p, c) => (GRAVITE[c] > GRAVITE[p] ? c : p), 'vert');
}

function entier(n: number): number {
  if (!Number.isSafeInteger(n) || n < 0) throw new ErreurControle('entree_invalide');
  return n;
}

function seuilValide(s: SeuilCouleur): SeuilCouleur {
  const bon = Number.isSafeInteger(s.orange) && Number.isSafeInteger(s.rouge) && s.orange >= 0 && s.orange <= s.rouge;
  if (!bon) throw new ErreurControle('parametre_invalide');
  return s;
}

/** Plus la mesure est haute, pire c'est : rouge dès le seuil rouge, orange dès le seuil orange. */
function couleurDe(mesure: number, s: SeuilCouleur): Couleur {
  if (mesure >= s.rouge) return 'rouge';
  return mesure >= s.orange ? 'orange' : 'vert';
}

function banque(l: EntreeSante['lignesBanque'], s: SeuilCouleur): SousIndicateur {
  const total = entier(l.total);
  const justifiees = entier(l.justifiees);
  if (justifiees > total) throw new ErreurControle('entree_invalide');
  const part = proportionPointsDeBase(justifiees, total, 'inferieur');
  const manque = proportionPointsDeBase(total - justifiees, total, 'superieur');
  if (part === null || manque === null) return { code: 'banque', couleur: 'vert', valeur: null };
  return { code: 'banque', couleur: couleurDe(manque, s), valeur: part };
}

function fraicheur(releve: number | null, piece: number | null, s: SeuilCouleur): SousIndicateur {
  const jours = [releve, piece].map((j) => (j === null ? null : entier(j)));
  const [a, b] = jours;
  if (a === null || b === null || a === undefined || b === undefined) return { code: 'fraicheur', couleur: 'rouge', valeur: null };
  const valeur = Math.max(a, b);
  return { code: 'fraicheur', couleur: couleurDe(valeur, s), valeur };
}

function avecB(code: 'tva' | 'controles', b: number, m: number, s: SeuilCouleur): SousIndicateur {
  const nb = entier(b);
  const nm = entier(m);
  return { code, couleur: nb > 0 ? 'rouge' : couleurDe(nm, s), valeur: nb + nm };
}

export function calculerSante(e: EntreeSante, s: SeuilsSante): Sante {
  const cas = entier(e.casOuverts);
  const seuils = { banque: seuilValide(s.banque), cas: seuilValide(s.cas), fraicheur: seuilValide(s.fraicheur), tva: seuilValide(s.tva), controles: seuilValide(s.controles) };
  const sousIndicateurs: SousIndicateur[] = [
    banque(e.lignesBanque, seuils.banque),
    { code: 'cas', couleur: couleurDe(cas, seuils.cas), valeur: cas },
    fraicheur(e.joursDepuisReleve, e.joursDepuisPiece, seuils.fraicheur),
    avecB('tva', e.tvaB, e.tvaM, seuils.tva),
    avecB('controles', e.controlesB, e.controlesM, seuils.controles),
  ];
  return { globale: pire(sousIndicateurs.map((x) => x.couleur)), sousIndicateurs };
}
