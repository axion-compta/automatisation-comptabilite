// Compte courant d'associé : chaque ligne doit être justifiée par une écriture, une pièce
// ou une ligne bancaire. Montants en centimes entiers.
// Convention de signe : crédit moins débit. Positif = dû à l'associé ; négatif = l'associé
// doit à la société (solde débiteur, geste G07). Règle pure, rien n'est corrigé.

export type TypeLien = 'ecriture' | 'piece' | 'ligne_bancaire';

export interface LienCompteCourant {
  type: TypeLien;
  id: string;
}

export interface LigneCompteCourant {
  id: string;
  montant: number;
  lien?: LienCompteCourant;
}

export interface ResultatCompteCourant {
  solde: number;
  explique: number;
  nonExplique: number;
  lignesNonExpliquees: string[];
  debiteur: boolean;
  gesteRequis?: 'G07';
}

export type CodeErreurCompteCourant = 'ligne_en_double' | 'montant_invalide';

export class ErreurCompteCourant extends Error {
  override name = 'ErreurCompteCourant';
  readonly code: CodeErreurCompteCourant;
  constructor(code: CodeErreurCompteCourant, message: string) {
    super(message);
    this.code = code;
  }
}

/** Solde = expliqué + non expliqué ; la somme des lignes sans lien est l'écart. */
export function croiserCompteCourant(lignes: readonly LigneCompteCourant[]): ResultatCompteCourant {
  const vus = new Set<string>();
  const nonExpliquees: string[] = [];
  let explique = 0;
  let nonExplique = 0;
  for (const l of lignes) {
    if (!Number.isSafeInteger(l.montant)) {
      throw new ErreurCompteCourant('montant_invalide', 'Un montant doit être un entier de centimes.');
    }
    if (vus.has(l.id)) {
      throw new ErreurCompteCourant('ligne_en_double', 'Identifiant de ligne en double.');
    }
    vus.add(l.id);
    if (l.lien !== undefined && l.lien.id.trim() !== '') {
      explique += l.montant;
    } else {
      nonExplique += l.montant;
      nonExpliquees.push(l.id);
    }
  }
  const solde = explique + nonExplique;
  if (!Number.isSafeInteger(solde)) {
    throw new ErreurCompteCourant('montant_invalide', 'Le solde dépasse la plage des entiers sûrs.');
  }
  const resultat: ResultatCompteCourant = {
    solde,
    explique,
    nonExplique,
    lignesNonExpliquees: nonExpliquees.sort(),
    debiteur: solde < 0,
  };
  if (solde < 0) resultat.gesteRequis = 'G07';
  return resultat;
}
