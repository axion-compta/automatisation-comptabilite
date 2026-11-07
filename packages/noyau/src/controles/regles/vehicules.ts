// Contrôle CC-T08 : carburant et véhicules. Fiche véhicule obligatoire ; parts en paramètres datés
// (points de base), jamais en dur. Aucun texte affiché : seulement des codes.
import { pourcentage, soustraire } from '../../argent/index.js';
import type { Arrondi, Centimes } from '../../argent/index.js';
import type { RegleControle, SortieRegle } from '../moteur.js';
import { alerte, ErreurControle, entierParametre, exigerCentimes, ok, parametreUtilisable } from './commun.js';
import type { ParametreLu } from './commun.js';

export interface Vehicule {
  id: string;
  genre: 'tourisme' | 'utilitaire';
}

export interface DepenseVehicule {
  nature: 'carburant' | 'achat' | 'location' | 'entretien' | 'peage';
  ttc: Centimes;
  tva: Centimes;
  vehiculeId?: string;
}

/** Clé proposée pour `autresTourisme` : `tva.vehicule_tourisme_autres_pct`. */
export interface ParametresVehicule {
  carburantTourisme: ParametreLu;
  carburantUtilitaire: ParametreLu;
  autresTourisme: ParametreLu;
}

export type CodeVehicule = 'DEDUCTIBLE' | 'NON_DEDUCTIBLE_NATURE' | 'A_VERIFIER';

export interface SortieVehicule {
  code: CodeVehicule;
  deduit: Centimes;
  charge: Centimes;
}

export interface EntreeVehicule {
  depense: DepenseVehicule;
  vehicules: readonly Vehicule[];
  parametres: ParametresVehicule;
  arrondi: Arrondi;
}

/** Échelle des points de base : la part se lit entre 0 et cette borne (cent pour cent de la TVA). */
const BORNE_PART = 10000;
const ZERO = 0 as Centimes;

function choisirParametre(d: DepenseVehicule, genre: Vehicule['genre'], p: ParametresVehicule): ParametreLu {
  if (genre === 'utilitaire') return p.carburantUtilitaire;
  return d.nature === 'carburant' ? p.carburantTourisme : p.autresTourisme;
}

export function traiterDepenseVehicule(
  d: DepenseVehicule,
  vehicules: readonly Vehicule[],
  p: ParametresVehicule,
  arrondi: Arrondi,
): SortieVehicule {
  const ttc = exigerCentimes(d.ttc);
  const tva = exigerCentimes(d.tva);
  if (ttc < 0 || tva < 0 || tva > ttc) throw new ErreurControle('entree_invalide');
  const aVerifier: SortieVehicule = { code: 'A_VERIFIER', deduit: ZERO, charge: ttc };
  const vehicule = vehicules.find((v) => v.id === d.vehiculeId);
  if (vehicule === undefined) return aVerifier;
  const parametre = choisirParametre(d, vehicule.genre, p);
  if (!parametreUtilisable(parametre)) return aVerifier;
  const part = entierParametre(parametre);
  if (part < 0 || part > BORNE_PART) throw new ErreurControle('parametre_invalide');
  const deduit = pourcentage(tva, part, arrondi);
  return { code: part === 0 ? 'NON_DEDUCTIBLE_NATURE' : 'DEDUCTIBLE', deduit, charge: soustraire(ttc, deduit) };
}

export const regleCCT08: RegleControle<EntreeVehicule> = {
  id: 'CC-T08',
  version: 1,
  gravite: 'M',
  bloque: [],
  declencheurs: ['arrivee', 'continu', 'a_la_demande'],
  actif: true,
  evaluer({ depense, vehicules, parametres, arrondi }): SortieRegle {
    return traiterDepenseVehicule(depense, vehicules, parametres, arrondi).code === 'A_VERIFIER' ? alerte(undefined, 'A_VERIFIER') : ok();
  },
};
