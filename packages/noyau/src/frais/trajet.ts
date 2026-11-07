// Trajet : kilomètres retenus (dixièmes, entiers) et admissibilité. Aucun montant.
import { ErreurFrais, type Trajet, type Vehicule } from './types.js';

const BASE_DIXIEME = 10;
const FACTEUR_ALLER_RETOUR = 2;
const CODE_ZERO = '0'.charCodeAt(0);

export type Admissibilite =
  | { etat: 'calculable' }
  | { etat: 'a_verifier'; raison: 'location' | 'conjoint' }
  | { etat: 'a_completer'; manque: ('carte_grise' | 'motif' | 'depart_arrivee')[] }
  | { etat: 'refuse'; code: 'vehicule_societe' | 'deux_roues_non_pris_en_charge' };

function invalide(message: string): never {
  throw new ErreurFrais('entree_invalide', message);
}

function chiffre(c: string | undefined): number {
  if (c === undefined || c.length !== 1) return -1;
  const d = c.charCodeAt(0) - CODE_ZERO;
  return d >= 0 && d < BASE_DIXIEME ? d : -1;
}

/** '120' → 1200 ; '12,5' ou '12.5' → 125 ; une décimale au plus ; zéro refusé. */
export function lireKmDixiemes(texte: string): number {
  let entier = 0;
  let decimale = 0;
  let nbEntiers = 0;
  let separe = false;
  let nbDecimales = 0;
  for (const c of texte) {
    const d = chiffre(c);
    if (d >= 0) {
      if (separe) {
        nbDecimales += 1;
        decimale = d;
      } else {
        nbEntiers += 1;
        entier = entier * BASE_DIXIEME + d;
      }
    } else if ((c === ',' || c === '.') && !separe && nbEntiers > 0) {
      separe = true;
    } else {
      invalide('kilomètres mal formés');
    }
  }
  if (nbEntiers === 0 || (separe && nbDecimales !== 1)) invalide('kilomètres mal formés');
  const dixiemes = entier * BASE_DIXIEME + decimale;
  if (dixiemes <= 0 || !Number.isSafeInteger(dixiemes)) invalide('kilomètres hors limites');
  return dixiemes;
}

/** Dixièmes de km retenus : doublés si aller-retour. */
export function kmRetenus(trajet: Trajet): number {
  const km = trajet.kmSaisisDixiemes;
  if (!Number.isSafeInteger(km) || km <= 0) invalide('kilomètres saisis invalides');
  const retenus = trajet.allerRetour ? km * FACTEUR_ALLER_RETOUR : km;
  if (!Number.isSafeInteger(retenus)) invalide('kilomètres hors limites');
  return retenus;
}

export function admissibilite(trajet: Trajet, vehicule: Vehicule): Admissibilite {
  if (trajet.vehiculeId !== vehicule.id) invalide('véhicule étranger au trajet');
  if (vehicule.proprietaire === 'societe') return { etat: 'refuse', code: 'vehicule_societe' };
  if (vehicule.categorie === 'deux_roues') {
    return { etat: 'refuse', code: 'deux_roues_non_pris_en_charge' };
  }
  if (vehicule.proprietaire === 'location' || vehicule.proprietaire === 'conjoint') {
    return { etat: 'a_verifier', raison: vehicule.proprietaire };
  }
  const manque: ('carte_grise' | 'motif' | 'depart_arrivee')[] = [];
  if (!vehicule.carteGrisePieceId?.trim()) manque.push('carte_grise');
  if (!trajet.motif.trim()) manque.push('motif');
  if (!trajet.depart.trim() || !trajet.arrivee.trim()) manque.push('depart_arrivee');
  return manque.length > 0 ? { etat: 'a_completer', manque } : { etat: 'calculable' };
}
