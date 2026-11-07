// Conservation : instantané de clôture et relecture d'un exercice clos (totaux et empreinte).
// Fonctions pures : un instantané n'écrase jamais un autre (exercice rouvert, nouvel instantané).
import { createHash } from 'node:crypto';
import { soustraire, type Centimes } from '../argent/index.js';
import { balance } from '../livres/balance.js';
import type { Ecriture } from '../ecritures/modele.js';

export interface InstantaneCloture {
  exerciceId: string;
  empreinteBalance: string;
  totalDebit: Centimes;
  totalCredit: Centimes;
  nbLignes: number;
}

export interface ResultatRelecture {
  statut: 'intact' | 'altere';
  ecartDebit: Centimes;
  ecartCredit: Centimes;
  empreinteIdentique: boolean;
  nbLignesIdentique: boolean;
}

interface Calcul {
  empreinteBalance: string;
  totalDebit: Centimes;
  totalCredit: Centimes;
  nbLignes: number;
}

/** Texte canonique : une ligne par compte trié, « compte;débit;crédit », sans dépendance à la locale. */
function calculer(ecritures: readonly Ecriture[]): Calcul {
  const b = balance(ecritures);
  const texte = b.lignes
    .map((l) => l.compte + ';' + String(l.totalDebit) + ';' + String(l.totalCredit))
    .join('\n');
  let nbLignes = 0;
  for (const e of ecritures) {
    if (e.statut === 'valide') nbLignes += e.lignes.length;
  }
  return {
    empreinteBalance: createHash('sha256').update(texte, 'utf8').digest('hex'),
    totalDebit: b.totaux.debit,
    totalCredit: b.totaux.credit,
    nbLignes,
  };
}

/** Écrit l'instantané de clôture : seules les écritures validées comptent. */
export function instantaneCloture(exerciceId: string, ecritures: readonly Ecriture[]): InstantaneCloture {
  return { exerciceId, ...calculer(ecritures) };
}

/** Recalcule depuis les lignes et compare à l'instantané (écart attendu : 0). */
export function relireExercice(
  ecritures: readonly Ecriture[],
  instantane: InstantaneCloture,
): ResultatRelecture {
  const c = calculer(ecritures);
  const ecartDebit = soustraire(c.totalDebit, instantane.totalDebit);
  const ecartCredit = soustraire(c.totalCredit, instantane.totalCredit);
  const empreinteIdentique = c.empreinteBalance === instantane.empreinteBalance;
  const nbLignesIdentique = c.nbLignes === instantane.nbLignes;
  const intact = ecartDebit === 0 && ecartCredit === 0 && empreinteIdentique && nbLignesIdentique;
  return {
    statut: intact ? 'intact' : 'altere',
    ecartDebit,
    ecartCredit,
    empreinteIdentique,
    nbLignesIdentique,
  };
}
