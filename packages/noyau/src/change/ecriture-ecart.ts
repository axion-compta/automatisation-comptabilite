// Règlement fournisseur en devise : écriture proposée (brouillon) avec écart de change et frais à part.
import { centimes, type Centimes } from '../argent/index.js';
import { verifierEcriture, type Ecriture, type LigneEcriture } from '../ecritures/modele.js';
import type { ResultatPaiementPartiel } from './paiement-partiel.js';

export interface ComptesReglement {
  fournisseur: string;
  banque: string;
  perte: string;
  gain: string;
  frais: string;
}

export interface ContexteReglement {
  id: string;
  date: string;
  journal: string;
}

function ligne(compte: string, libelle: string, debit: number, credit: number): LigneEcriture {
  return { compte, libelle, debit: centimes(debit), credit: centimes(credit) };
}

export function ecritureReglementFournisseur(
  resultat: Pick<ResultatPaiementPartiel, 'partEuros' | 'eurosImputes' | 'ecart'>,
  frais: number,
  comptes: ComptesReglement,
  ctx: ContexteReglement,
): Ecriture {
  if (frais < 0) throw new RangeError('Des frais bancaires ne peuvent pas être négatifs : ' + String(frais));
  const { partEuros, eurosImputes, ecart } = resultat;
  const lignes = [
    ligne(comptes.fournisseur, 'Règlement fournisseur', partEuros, 0),
    ligne(comptes.frais, 'Frais bancaires', frais, 0),
    ligne(comptes.perte, 'Perte de change', ecart > 0 ? ecart : 0, 0),
    ligne(comptes.banque, 'Paiement en banque', 0, eurosImputes),
    ligne(comptes.gain, 'Gain de change', 0, ecart < 0 ? -ecart : 0),
  ].filter((l) => l.debit !== 0 || l.credit !== 0);
  const ecriture: Ecriture = { id: ctx.id, journal: ctx.journal, date: ctx.date, statut: 'brouillon', lignes };
  // Une proposition déséquilibrée (frais différents de ceux du paiement) ne sort jamais d'ici.
  verifierEcriture(ecriture);
  return ecriture;
}

/** Débits moins crédits du compte. */
export function soldeTiers(ecritures: readonly Ecriture[], compte: string): Centimes {
  let total = 0;
  for (const e of ecritures) {
    for (const l of e.lignes) if (l.compte === compte) total += l.debit - l.credit;
  }
  return centimes(total);
}
