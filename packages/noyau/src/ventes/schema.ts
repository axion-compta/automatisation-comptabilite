// Ventes : schéma d'écriture par ligne et date d'exigibilité (spec 10, règle 9).
// Aucun régime, seuil ni date d'option en dur : tout vient de ProfilVente.
import { comparerDates, exigerDate, type CasSchema, type NatureLigne, type ProfilVente } from './types.js';

export type CasLigne = CasSchema | 'a_confirmer';

/** Ordre : livre des recettes, régime à confirmer, franchise, nature à confirmer, bien, service. */
export function casDeLaLigne(profil: ProfilVente, nature: NatureLigne, dateOperation: string): CasLigne {
  if (profil.tenue === 'livre_recettes') return 'D';
  if (profil.regimeTva === 'a_confirmer') return 'a_confirmer';
  if (profil.regimeTva === 'franchise') return 'C';
  if (nature === 'a_confirmer') return 'a_confirmer';
  if (nature === 'bien') return 'A';
  const operation = exigerDate(dateOperation, 'dateOperation');
  if (profil.optionDebitsDepuis === null) return 'B';
  const option = exigerDate(profil.optionDebitsDepuis, 'optionDebitsDepuis');
  return comparerDates(operation, option) >= 0 ? 'A' : 'B';
}

export interface DatesVente {
  dateFacture: string;
  dateOperation?: string;
  dateEncaissement?: string;
}
export interface Exigibilite {
  date: string | null;
  dateOperationSupposee: boolean;
}

export function dateExigibilite(cas: CasLigne, nature: NatureLigne, d: DatesVente): Exigibilite {
  if (cas === 'A') {
    const facture = exigerDate(d.dateFacture, 'dateFacture');
    if (nature !== 'bien') return { date: facture, dateOperationSupposee: false };
    if (d.dateOperation === undefined) return { date: facture, dateOperationSupposee: true };
    return { date: exigerDate(d.dateOperation, 'dateOperation'), dateOperationSupposee: false };
  }
  if (cas === 'B') {
    if (d.dateEncaissement === undefined) return { date: null, dateOperationSupposee: false };
    return { date: exigerDate(d.dateEncaissement, 'dateEncaissement'), dateOperationSupposee: false };
  }
  return { date: null, dateOperationSupposee: false };
}
