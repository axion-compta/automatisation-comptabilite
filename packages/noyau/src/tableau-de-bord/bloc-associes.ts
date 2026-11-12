// Bloc « Comptes courants d'associés » : un solde par associé, calculé par croiserCompteCourant.
// Une forme sans associé (EI) rend l'état `vide` de construireBloc, sans nouvel état.
import { croiserCompteCourant, type LigneCompteCourant, type ResultatCompteCourant } from '../associes/compte-courant.js';
import type { Periode } from '../interface/types.js';
import { construireBloc, type EnveloppeBloc } from './blocs.js';

export interface AssocieEntree {
  id: string;
  nom: string;
  lignes: readonly LigneCompteCourant[];
}

export interface AssocieBloc extends ResultatCompteCourant {
  id: string;
  nom: string;
  mouvements: LigneCompteCourant[];
}

export interface DonneesAssocies {
  associes: AssocieBloc[];
}

export function blocAssocies(periode: Periode, associes: readonly AssocieEntree[]): EnveloppeBloc<DonneesAssocies> {
  return construireBloc('comptes_associes', periode, () => {
    if (associes.length === 0) return undefined;
    return {
      associes: associes.map((a) => ({
        id: a.id,
        nom: a.nom,
        ...croiserCompteCourant(a.lignes),
        mouvements: [...a.lignes],
      })),
    };
  });
}
