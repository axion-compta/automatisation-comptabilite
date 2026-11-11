import { ajouterEntree, teteInitiale, type Brouillon, type EntreeJournal, type Tete } from '../../../../packages/noyau/src/journal/chaine.js';

/** Tables du journal : seul ce fichier a le droit de les écrire (garde:audit). */
export const TABLE_ENTREES = 'a_compta.entree_journal';
export const TABLE_TETE = 'a_compta.tete_journal';

export class ErreurAudit extends Error {
  override name = 'ErreurAudit';
  constructor(readonly code: 'ajout_seul' | 'tete_absente' | 'societe_differente') {
    super(code);
  }
}

/** Prise de la transaction de l'appelant : la vraie base se branchera plus tard sans changer ServiceAudit. */
export interface TransactionJournal {
  /** Équivalent de SELECT … FOR UPDATE sur la tête de la société ; `undefined` si le journal est neuf. */
  verrouillerTete(societeId: string): Promise<Tete | undefined>;
  ajouter(entree: EntreeJournal): Promise<void>;
  ecrireTete(tete: Tete): Promise<void>;
}

/** Écrivain unique du journal : toute entrée passe ici, dans la transaction du changement qu'elle décrit. */
export class ServiceAudit {
  constructor(private readonly creeLe: () => string) {}

  async ecrire(tx: TransactionJournal, b: Brouillon): Promise<EntreeJournal> {
    const courante = (await tx.verrouillerTete(b.societeId)) ?? teteInitiale(b.societeId, this.creeLe());
    const { entree, tete } = ajouterEntree(courante, b);
    await tx.ajouter(entree);
    await tx.ecrireTete(tete);
    return entree;
  }
}

/** Faux dépôt : transaction avec annulation, verrou par société, ajout seul. */
export class DepotMemoire {
  private entrees: EntreeJournal[] = [];
  private tetes = new Map<string, Tete>();
  private files = new Map<string, Promise<unknown>>();

  lire(societeId: string): EntreeJournal[] {
    return this.entrees.filter((e) => e.societeId === societeId);
  }
  tete(societeId: string): Tete | undefined {
    return this.tetes.get(societeId);
  }
  modifier(): never {
    throw new ErreurAudit('ajout_seul');
  }
  supprimer(): never {
    throw new ErreurAudit('ajout_seul');
  }

  /** Les transactions d'une même société passent l'une après l'autre (verrou sur la tête). */
  async transaction<T>(societeId: string, travail: (tx: TransactionJournal) => Promise<T>): Promise<T> {
    const precedente = this.files.get(societeId) ?? Promise.resolve();
    const courante = precedente.catch(() => undefined).then(() => this.executer(societeId, travail));
    this.files.set(societeId, courante);
    return courante;
  }

  private async executer<T>(societeId: string, travail: (tx: TransactionJournal) => Promise<T>): Promise<T> {
    const ajoutees: EntreeJournal[] = [];
    let nouvelle: Tete | undefined;
    const tx: TransactionJournal = {
      verrouillerTete: async (id) => {
        if (id !== societeId) throw new ErreurAudit('societe_differente');
        return nouvelle ?? this.tetes.get(id);
      },
      ajouter: async (e) => {
        ajoutees.push(e);
      },
      ecrireTete: async (t) => {
        nouvelle = t;
      },
    };
    const resultat = await travail(tx);
    this.entrees.push(...ajoutees);
    if (nouvelle) this.tetes.set(societeId, nouvelle);
    return resultat;
  }
}
