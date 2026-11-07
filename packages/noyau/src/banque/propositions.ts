// Écritures proposées pour les frais bancaires et le virement interne.
// Les numéros de compte sont des arguments : aucun compte en dur ici.
// Sorties toujours en `brouillon` : jamais `valide`.
import { ajouter, centimes, soustraire, type Centimes } from '../argent/index.js';
import type { Ecriture } from '../ecritures/modele.js';

export class ErreurBanque extends Error {
  override name = 'ErreurBanque';
  readonly code: 'montant_invalide' | 'meme_compte';
  constructor(code: 'montant_invalide' | 'meme_compte', message: string) {
    super(message);
    this.code = code;
  }
}

/** Écriture proposée, avec sa ligne bancaire d'origine citée en source. */
export type EcritureProposee = Ecriture & { source?: { ligneBancaireId: string } };

function montantStrict(montant: number): Centimes {
  if (!Number.isSafeInteger(montant) || montant <= 0) {
    throw new ErreurBanque('montant_invalide', 'Le montant doit être un entier de centimes positif.');
  }
  return centimes(montant);
}

export function proposerFrais(
  entree: {
    id: string;
    date: string;
    journal: string;
    libelle: string;
    montant: number;
    ligneBancaireId: string;
  },
  comptes: { frais: string; banque: string },
): EcritureProposee {
  const m = montantStrict(entree.montant);
  const zero = centimes(0);
  return {
    id: entree.id,
    journal: entree.journal,
    date: entree.date,
    statut: 'brouillon',
    lignes: [
      { compte: comptes.frais, libelle: entree.libelle, debit: m, credit: zero },
      { compte: comptes.banque, libelle: entree.libelle, debit: zero, credit: m },
    ],
    source: { ligneBancaireId: entree.ligneBancaireId },
  };
}

export function proposerVirementInterne(
  entree: { idSortie: string; idEntree: string; date: string; journal: string; montant: number },
  comptes: { attente: string; banqueSource: string; banqueCible: string },
): [EcritureProposee, EcritureProposee] {
  const m = montantStrict(entree.montant);
  if (comptes.banqueSource === comptes.banqueCible) {
    throw new ErreurBanque('meme_compte', 'Le virement interne exige deux comptes de banque différents.');
  }
  const zero = centimes(0);
  const libelle = 'Virement interne';
  const base = { journal: entree.journal, date: entree.date, statut: 'brouillon' as const };
  return [
    {
      ...base,
      id: entree.idSortie,
      lignes: [
        { compte: comptes.attente, libelle, debit: m, credit: zero },
        { compte: comptes.banqueSource, libelle, debit: zero, credit: m },
      ],
    },
    {
      ...base,
      id: entree.idEntree,
      lignes: [
        { compte: comptes.banqueCible, libelle, debit: m, credit: zero },
        { compte: comptes.attente, libelle, debit: zero, credit: m },
      ],
    },
  ];
}

/** Débits moins crédits du compte d'attente, en centimes. */
export function soldeAttente(ecritures: readonly Ecriture[], compteAttente: string): Centimes {
  let solde = centimes(0);
  for (const e of ecritures) {
    for (const l of e.lignes) {
      if (l.compte === compteAttente) solde = ajouter(solde, soustraire(l.debit, l.credit));
    }
  }
  return solde;
}
