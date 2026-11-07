// Écriture E5 : pièce payée par la société avec une part personnelle (jamais de crédit au compte de la personne).
import { centimes, soustraire, type Centimes } from '../argent/index.js';
import { verifierEcriture, type Ecriture, type LigneEcriture } from '../ecritures/modele.js';
import { repartirPiece, type EntreePiece } from './part-perso.js';
import { ErreurFrais, type ComptesFrais } from './types.js';

export interface EnteteE5 {
  id: string;
  journal: string;
  date: string;
  soldePersonneAvant: Centimes;
}

export interface ResultatE5 {
  ecriture: Ecriture;
  /** Signal seulement : le compte de la personne devient débiteur (V3-MOT-064). */
  compteDebiteur: boolean;
}

const LIBELLE = 'Pièce payée par la société, part personnelle';

export function proposerEcriturePartPerso(
  piece: EntreePiece,
  comptes: ComptesFrais & { compteCharge: string },
  entete: EnteteE5,
): ResultatE5 {
  if (!Number.isSafeInteger(entete.soldePersonneAvant)) {
    throw new ErreurFrais('entree_invalide', 'Solde de la personne : entier de centimes attendu');
  }
  const { societe, perso } = repartirPiece(piece);
  if (piece.ttc === 0) throw new ErreurFrais('entree_invalide', 'Pièce de montant nul : aucune écriture');
  const zero = centimes(0);
  const lignes: LigneEcriture[] = [];
  if (societe.ht > 0) lignes.push({ compte: comptes.compteCharge, libelle: LIBELLE, debit: societe.ht, credit: zero });
  if (societe.tva > 0) lignes.push({ compte: comptes.tvaDeductible, libelle: LIBELLE, debit: societe.tva, credit: zero });
  if (perso.ttc > 0) lignes.push({ compte: comptes.comptePersonne, libelle: LIBELLE, debit: perso.ttc, credit: zero });
  lignes.push({ compte: comptes.banque, libelle: LIBELLE, debit: zero, credit: piece.ttc });
  const ecriture: Ecriture = { id: entete.id, journal: entete.journal, date: entete.date, statut: 'propose', lignes };
  verifierEcriture(ecriture);
  return { ecriture, compteDebiteur: soustraire(entete.soldePersonneAvant, perso.ttc) < 0 };
}
