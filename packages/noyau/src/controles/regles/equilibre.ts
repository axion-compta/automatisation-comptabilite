// Contrôles d'équilibre CC-K01 à CC-K03 (montants en centimes, règles pures).
// Aucun texte affiché ici : seulement des codes et des écarts.
import { ajouter, soustraire, type Centimes } from '../../argent/index.js';
import type { Ecriture } from '../../ecritures/modele.js';
import { verifierEquilibre } from '../../ecritures/modele.js';
import { balance } from '../../livres/balance.js';
import type { Blocage, Declencheur, RegleControle, SortieRegle } from '../moteur.js';

/** Mouvement d'un compte sur l'exercice (montants en centimes). */
export interface MouvementCompte {
  debit: Centimes;
  credit: Centimes;
}

/** Objet du contrôle CC-K03 : soldes en convention débit moins crédit. */
export interface SoldesCompte {
  compte: string;
  soldeOuverture: Centimes;
  soldeCloture: Centimes;
  mouvements: readonly MouvementCompte[];
}

const BLOQUE_COMPLET: Blocage[] = ['validation', 'tva', 'export', 'cloture'];
const BLOQUE_EXPORT: Blocage[] = ['export', 'cloture'];
const DECLENCHEURS_COMPLET: Declencheur[] = ['continu', 'avant_tva', 'avant_export', 'avant_cloture'];
const DECLENCHEURS_EXPORT: Declencheur[] = ['avant_export', 'avant_cloture'];

function sortieDepuisEcart(ecart: Centimes): SortieRegle {
  if (ecart === 0) return { resultat: 'OK' };
  return { resultat: 'ALERTE', ecartCentimes: ecart };
}

/** CC-K01 : pour chaque écriture, total des débits = total des crédits. */
export const regleCCK01: RegleControle<Ecriture> = {
  id: 'CC-K01',
  version: 1,
  gravite: 'B',
  bloque: BLOQUE_COMPLET,
  declencheurs: DECLENCHEURS_COMPLET,
  actif: true,
  evaluer: (ecriture) => sortieDepuisEcart(verifierEquilibre(ecriture).ecart),
};

/** CC-K02 : balance de l'exercice, total des débits = total des crédits des écritures validées. */
export const regleCCK02: RegleControle<readonly Ecriture[]> = {
  id: 'CC-K02',
  version: 1,
  gravite: 'B',
  bloque: BLOQUE_COMPLET,
  declencheurs: DECLENCHEURS_COMPLET,
  actif: true,
  evaluer: (ecritures) => {
    const { totaux } = balance(ecritures);
    return sortieDepuisEcart(soustraire(totaux.debit, totaux.credit));
  },
};

/** CC-K03 : solde d'ouverture + mouvements = solde de clôture. */
export const regleCCK03: RegleControle<SoldesCompte> = {
  id: 'CC-K03',
  version: 1,
  gravite: 'B',
  bloque: BLOQUE_EXPORT,
  declencheurs: DECLENCHEURS_EXPORT,
  actif: true,
  evaluer: (objet) => {
    let attendu = objet.soldeOuverture;
    for (const m of objet.mouvements) {
      attendu = ajouter(attendu, soustraire(m.debit, m.credit));
    }
    return sortieDepuisEcart(soustraire(attendu, objet.soldeCloture));
  },
};

export const reglesEquilibre = { 'CC-K01': regleCCK01, 'CC-K02': regleCCK02, 'CC-K03': regleCCK03 };
