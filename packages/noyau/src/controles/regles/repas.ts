// Contrôle CC-T07 : repas, réceptions, hébergement du dirigeant et transport de personnes.
// La part déductible vient d'un paramètre daté (points de base) ; aucune valeur légale ici.
// Aucun texte affiché : seulement des codes.
import { pourcentage } from '../../argent/index.js';
import type { Arrondi, Centimes } from '../../argent/index.js';
import type { RegleControle, SortieRegle } from '../moteur.js';
import { alerte, ErreurControle, entierParametre, exigerCentimes, ok, parametreUtilisable } from './commun.js';
import type { ParametreLu } from './commun.js';

export type NatureRepas = 'repas_affaires' | 'repas_personnel' | 'hebergement_dirigeant' | 'transport_personnes';
export type CodeRepas = 'DEDUCTIBLE' | 'NON_DEDUCTIBLE_NATURE' | 'A_VERIFIER';

export interface EntreeRepas {
  nature: NatureRepas;
  tva: Centimes;
  motif?: string;
  parametre: ParametreLu;
}

export interface SortieRepas {
  code: CodeRepas;
  deduit: Centimes;
}

/** Échelle des points de base : la part se lit entre 0 et cette borne (cent pour cent de la TVA). */
const BORNE_PART = 10000;
/** Arrondi explicite, vers le bas : jamais plus de TVA déduite que la part ne le permet. */
const ARRONDI: Arrondi = 'inferieur';
const ZERO = 0 as Centimes;

export function traiterRepas(e: EntreeRepas): SortieRepas {
  const tva = exigerCentimes(e.tva);
  if (tva < 0) throw new ErreurControle('entree_invalide');
  if (e.nature === 'repas_personnel') return { code: 'NON_DEDUCTIBLE_NATURE', deduit: ZERO };
  if (e.nature === 'repas_affaires' && (e.motif === undefined || e.motif.trim() === '')) {
    return { code: 'A_VERIFIER', deduit: ZERO };
  }
  if (!parametreUtilisable(e.parametre)) return { code: 'A_VERIFIER', deduit: ZERO };
  const part = entierParametre(e.parametre);
  if (part < 0 || part > BORNE_PART) throw new ErreurControle('parametre_invalide');
  if (part === 0) return { code: 'NON_DEDUCTIBLE_NATURE', deduit: ZERO };
  return { code: 'DEDUCTIBLE', deduit: pourcentage(tva, part, ARRONDI) };
}

export const regleCCT07: RegleControle<EntreeRepas> = {
  id: 'CC-T07',
  version: 1,
  gravite: 'M',
  bloque: [],
  declencheurs: ['arrivee', 'continu', 'a_la_demande'],
  actif: true,
  evaluer(entree): SortieRegle {
    return traiterRepas(entree).code === 'A_VERIFIER' ? alerte(undefined, 'A_VERIFIER') : ok();
  },
};
