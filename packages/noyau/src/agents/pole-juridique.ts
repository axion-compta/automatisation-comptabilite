// Pôle juridique : transforme les constats existants (compte courant d'associé, libération du capital) en escalades.
// Fonction pure, aucun appel à un modèle. Montants en centimes entiers. Seulement des codes, aucun texte affiché.

export type MotifJuridique = 'compte_courant_debiteur' | 'liberation_incomplete';

/** Issu de `croiserCompteCourant` : solde = crédit moins débit, négatif = l'associé doit à la société. */
export interface ConstatCompteCourant {
  nature: 'compte_courant';
  id: string;
  solde: number;
}

/** Issu de `liberationMinimale` : `resteALiberer` > 0 = capital non entièrement libéré. */
export interface ConstatLiberation {
  nature: 'liberation';
  id: string;
  resteALiberer: number;
}

export type ConstatJuridique = ConstatCompteCourant | ConstatLiberation;

export interface EscaladeJuridique {
  id: string;
  pole: 'juridique';
  motif: MotifJuridique;
  vers: 'utilisateur';
}

export class ErreurPoleJuridique extends Error {
  override name = 'ErreurPoleJuridique';
  readonly code = 'constat_invalide';
  constructor() {
    super('constat_invalide');
  }
}

const parId = (a: EscaladeJuridique, b: EscaladeJuridique): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Une escalade par compte courant débiteur et par libération incomplète, triées par identifiant. */
export function escaladesJuridiques(constats: readonly ConstatJuridique[]): EscaladeJuridique[] {
  const vus = new Set<string>();
  const sortie: EscaladeJuridique[] = [];
  for (const c of constats) {
    if (typeof c.id !== 'string' || c.id.trim() === '' || vus.has(c.id)) throw new ErreurPoleJuridique();
    vus.add(c.id);
    if (c.nature === 'compte_courant') {
      if (!Number.isSafeInteger(c.solde)) throw new ErreurPoleJuridique();
      if (c.solde < 0) sortie.push({ id: c.id, pole: 'juridique', motif: 'compte_courant_debiteur', vers: 'utilisateur' });
    } else if (c.nature === 'liberation') {
      if (!Number.isSafeInteger(c.resteALiberer) || c.resteALiberer < 0) throw new ErreurPoleJuridique();
      if (c.resteALiberer > 0) sortie.push({ id: c.id, pole: 'juridique', motif: 'liberation_incomplete', vers: 'utilisateur' });
    } else {
      throw new ErreurPoleJuridique();
    }
  }
  return sortie.sort(parId);
}
