import { ajouter, centimes, type Centimes } from '../../argent/index.js';
import { type Ecriture, type LigneEcriture, verifierEcriture } from '../../ecritures/modele.js';
import { type MotifAVerifier, nomParTaux, type TypePiece } from '../types.js';

export interface PiecePourProposition {
  id: string;
  sha256: string;
  type: TypePiece;
  comptee: boolean;
  sensible: boolean;
  classementAutomatiquePermis: boolean;
  aVerifier: MotifAVerifier[];
  date: string;
  journal: string;
  parTaux: { tauxPdb: number; ht: Centimes; tva: Centimes }[];
  ttc: Centimes;
}

export interface ComptesProposition {
  charge: string;
  tvaDeductible: string;
  fournisseur: string;
}

export type RaisonAucune = 'non_comptee' | 'sensible' | 'sous_le_seuil' | 'a_verifier' | 'plusieurs_factures' | 'desequilibre' | 'vide';

export type Proposition = { ecriture: Ecriture; cleIdempotence: string } | { aucune: RaisonAucune };

function construire(piece: PiecePourProposition, comptes: ComptesProposition, cle: string): Ecriture {
  const avoir = piece.ttc < 0;
  const signe = avoir ? -1 : 1;
  const ligne = (compte: string, libelle: string, montant: Centimes, estCharge: boolean): LigneEcriture => {
    const valeur = centimes(montant * signe);
    const debit = estCharge !== avoir;
    return { compte, libelle, debit: debit ? valeur : centimes(0), credit: debit ? centimes(0) : valeur };
  };
  const totalHt = piece.parTaux.reduce((somme, t) => ajouter(somme, t.ht), centimes(0));
  const lignes = [ligne(comptes.charge, 'charge', totalHt, true)];
  for (const t of piece.parTaux) {
    if (t.tva !== 0) lignes.push(ligne(comptes.tvaDeductible, nomParTaux('tva', t.tauxPdb), t.tva, true));
  }
  lignes.push(ligne(comptes.fournisseur, 'fournisseur', piece.ttc, false));
  return { id: `brouillon:${cle}`, journal: piece.journal, date: piece.date, statut: 'brouillon', lignes };
}

export function proposerEcriture(piece: PiecePourProposition, comptes: ComptesProposition): Proposition {
  const raison: RaisonAucune | null =
    piece.type === 'plusieurs_factures' ? 'plusieurs_factures'
    : !piece.comptee ? 'non_comptee'
    : piece.sensible ? 'sensible'
    : !piece.classementAutomatiquePermis ? 'sous_le_seuil'
    : piece.aVerifier.length > 0 ? 'a_verifier'
    : piece.parTaux.length === 0 ? 'vide'
    : null;
  if (raison !== null) return { aucune: raison };
  const cleIdempotence = `${piece.sha256}:${piece.type}`;
  try {
    const ecriture = construire(piece, comptes, cleIdempotence);
    const somme = piece.parTaux.reduce((s, t) => ajouter(ajouter(s, t.ht), t.tva), centimes(0));
    if (somme !== piece.ttc) return { aucune: 'desequilibre' };
    verifierEcriture(ecriture);
    return { ecriture, cleIdempotence };
  } catch {
    return { aucune: 'desequilibre' };
  }
}
