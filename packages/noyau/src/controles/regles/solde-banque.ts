// CC-PM01 : le solde du compte de banque (512) égale le solde du relevé, au centime.
// Le moteur ne crée jamais d'écriture ni de solde d'ajustement : il constate et liste.
import { centimes, soustraire, type Centimes } from '../../argent/index.js';
import type { Blocage, Declencheur, RegleControle, SortieRegle } from '../moteur.js';

export interface ObjetSoldeBanque {
  compteBanque: string;
  date: string;
  solde512: Centimes;
  soldeReleve: Centimes;
  lignesBancairesSansEcriture: string[];
  ecrituresSansLigne: string[];
}

export interface ResultatSoldeBanque {
  statut: 'ok' | 'impossible';
  /** Solde du relevé moins solde 512, en centimes. */
  ecart: Centimes;
  /** Lignes bancaires sans écriture et écritures sans ligne, triées, sans doublon. */
  lignesEnCause: string[];
}

const BLOQUE: Blocage[] = ['validation', 'cloture'];
const DECLENCHEURS: Declencheur[] = ['continu', 'avant_export', 'avant_cloture'];

export function controleSoldeBanque(objet: ObjetSoldeBanque): ResultatSoldeBanque {
  // centimes() refuse NaN, Infinity et non-entiers.
  const ecart = soustraire(centimes(objet.soldeReleve), centimes(objet.solde512));
  if (ecart === 0) return { statut: 'ok', ecart, lignesEnCause: [] };
  const lignesEnCause = [
    ...new Set([...objet.lignesBancairesSansEcriture, ...objet.ecrituresSansLigne]),
  ].sort();
  return { statut: 'impossible', ecart, lignesEnCause };
}

export const regleSoldeBanque: RegleControle<ObjetSoldeBanque> = {
  id: 'CC-PM01',
  version: 1,
  gravite: 'B',
  bloque: BLOQUE,
  declencheurs: DECLENCHEURS,
  actif: true,
  evaluer: (objet): SortieRegle => {
    const r = controleSoldeBanque(objet);
    return r.statut === 'ok' ? { resultat: 'OK' } : { resultat: 'ALERTE', ecartCentimes: r.ecart };
  },
};

/** Le mois n'est pas verrouillable dès qu'un résultat est `impossible`. */
export function moisVerrouillable(resultats: readonly Pick<ResultatSoldeBanque, 'statut'>[]): boolean {
  return resultats.every((r) => r.statut !== 'impossible');
}
