// TVA d'un frais selon sa nature : la part déductible arrive en paramètre daté, jamais en dur.
import { centimes, type Centimes } from '../argent/index.js';
import { ErreurTva, partDeductible } from '../tva/deductible.js';
import { ErreurFrais } from './types.js';

export interface ParametreTva {
  statut: 'valide' | 'a_verifier' | 'non_verifie' | 'retire';
  partPointsDeBase: number;
}

export interface EntreeTvaFrais {
  nature: string;
  tvaLue: Centimes;
  ticketAuNomDeLaPersonne: boolean;
  justificatifPerdu: boolean;
  estIk: boolean;
}

export type CodeTvaFrais =
  | 'AUCUNE'
  | 'DEDUCTIBLE'
  | 'PARTIELLE'
  | 'NON_DEDUCTIBLE'
  | 'NON_DEDUCTIBLE_NOM'
  | 'A_VERIFIER'
  | 'SANS_PIECE';

export interface ResultatTvaFrais {
  code: CodeTvaFrais;
  deductible: Centimes;
  nonDeductible: Centimes;
  bloquePreparationTva: boolean;
}

const CLES: Readonly<Record<string, string>> = {
  repas_affaires: 'tva.repas_affaires',
  repas_deplacement: 'tva.repas_deplacement',
  hebergement_dirigeant: 'tva.hebergement_dirigeant',
  transport_personnes: 'tva.transport_personnes',
  vehicule_personnel: 'tva.vehicule_personnel',
};

/** Clé du paramètre daté associé à une nature de frais (undefined si la nature n'en a pas). */
export function cleParametreTva(nature: string): string | undefined {
  return Object.hasOwn(CLES, nature) ? CLES[nature] : undefined;
}

function resultat(code: CodeTvaFrais, deductible: Centimes, nonDeductible: Centimes, bloque = false): ResultatTvaFrais {
  return { code, deductible, nonDeductible, bloquePreparationTva: bloque };
}

export function traiterTvaFrais(entree: EntreeTvaFrais, parametre: ParametreTva | undefined): ResultatTvaFrais {
  const { tvaLue } = entree;
  if (!Number.isSafeInteger(tvaLue) || tvaLue < 0) {
    throw new ErreurFrais('entree_invalide', 'TVA lue : entier de centimes positif ou nul attendu');
  }
  const zero = centimes(0);
  if (entree.estIk) return resultat('AUCUNE', zero, zero);
  if (entree.justificatifPerdu) return resultat('SANS_PIECE', zero, tvaLue);
  if (entree.ticketAuNomDeLaPersonne) return resultat('NON_DEDUCTIBLE_NOM', zero, tvaLue);
  if (parametre?.statut !== 'valide') return resultat('A_VERIFIER', zero, tvaLue, true);
  try {
    const part = partDeductible(tvaLue, parametre.partPointsDeBase);
    const code = part.deductible === zero ? 'NON_DEDUCTIBLE' : part.nonDeductible === zero ? 'DEDUCTIBLE' : 'PARTIELLE';
    return resultat(code, part.deductible, part.nonDeductible);
  } catch (e) {
    if (e instanceof ErreurTva) throw new ErreurFrais('entree_invalide', 'Part déductible invalide');
    throw e;
  }
}
