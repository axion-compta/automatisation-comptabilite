// Contrôle des soldes d'un relevé au centime : ouverture + somme des lignes complétées = clôture.
// Sans les deux soldes, le résultat est IMPOSSIBLE, jamais OK par défaut.
import { ajouter, centimes, soustraire } from '../../argent/index.js';
import type { Centimes } from '../../argent/index.js';
import { estComptable } from '../types.js';
import type { ReleveLu } from '../types.js';

export class ErreurSoldes extends Error {
  override name = 'ErreurSoldes';
  readonly code = 'montant_invalide';
  constructor() {
    super('montant_invalide');
  }
}

export type PolitiqueSoldes = { refuserSiEcart: boolean };
export type ResultatSoldes = { controle: 'OK' | 'ECART' | 'IMPOSSIBLE'; ecart?: Centimes; calcule?: Centimes; refuse: boolean };

const valide = (solde: Centimes | undefined): Centimes | undefined => {
  if (solde !== undefined && !Number.isSafeInteger(solde)) throw new ErreurSoldes();
  return solde;
};

export function controlerSoldes(releve: ReleveLu, politique: PolitiqueSoldes): ResultatSoldes {
  const ouverture = valide(releve.soldeOuverture);
  const cloture = valide(releve.soldeCloture);
  if (ouverture === undefined || cloture === undefined) return { controle: 'IMPOSSIBLE', refuse: false };
  const calcule = releve.lignes.filter(estComptable).reduce((somme, l) => ajouter(somme, l.montant), centimes(0));
  const total = ajouter(ouverture, calcule);
  const ecart = soustraire(cloture, total);
  if (ecart === 0) return { controle: 'OK', calcule: total, refuse: false };
  return { controle: 'ECART', ecart, calcule: total, refuse: politique.refuserSiEcart };
}
