// Implémentation en mémoire du port du moteur : ajout seul, isolation par société, montants entiers.
import { ErreurPersistance, TABLES_MOTEUR, type LigneSnapshotCloture, type LignesMoteur, type NomTable, type PortMoteur, type TableMoteur } from './moteur-ports.js';

type Ligne = { id: string; societeId: string };

class TableMemoire<T extends Ligne> implements TableMoteur<T> {
  private readonly lignes = new Map<string, T>();
  constructor(private readonly nom: NomTable) {}
  private verifierMontants(ligne: T): void {
    for (const champ of TABLES_MOTEUR[this.nom].montants) {
      if (!Number.isSafeInteger((ligne as unknown as Record<string, unknown>)[champ])) {
        throw new ErreurPersistance('montant_invalide', `Montant invalide : ${champ}.`);
      }
    }
  }
  private verifierModifiable(): void {
    if (TABLES_MOTEUR[this.nom].mode === 'ajout_seul') throw new ErreurPersistance('ajout_seul', 'Table en ajout seul.');
  }
  private existante(societeId: string, id: string): T {
    const ligne = this.lignes.get(id);
    if (ligne === undefined || ligne.societeId !== societeId) throw new ErreurPersistance('absent', 'Ligne absente.');
    return ligne;
  }
  async ajouter(ligne: T): Promise<void> {
    this.verifierMontants(ligne);
    if (this.lignes.has(ligne.id)) throw new ErreurPersistance('doublon', 'Identifiant déjà utilisé.');
    this.lignes.set(ligne.id, structuredClone(ligne));
  }
  async modifier(ligne: T): Promise<void> {
    this.verifierModifiable();
    this.existante(ligne.societeId, ligne.id);
    this.verifierMontants(ligne);
    this.lignes.set(ligne.id, structuredClone(ligne));
  }
  async supprimer(societeId: string, id: string): Promise<void> {
    this.verifierModifiable();
    this.existante(societeId, id);
    this.lignes.delete(id);
  }
  async lire(societeId: string, id: string): Promise<T | null> {
    const ligne = this.lignes.get(id);
    return ligne === undefined || ligne.societeId !== societeId ? null : structuredClone(ligne);
  }
  async lister(societeId: string): Promise<T[]> {
    return [...this.lignes.values()]
      .filter((l) => l.societeId === societeId)
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .map((l) => structuredClone(l));
  }
}

export class PortMoteurMemoire implements PortMoteur {
  private readonly tables = new Map<NomTable, TableMemoire<Ligne>>();
  table<N extends NomTable>(nom: N): TableMoteur<LignesMoteur[N]> {
    let t = this.tables.get(nom);
    if (t === undefined) {
      t = new TableMemoire<Ligne>(nom);
      this.tables.set(nom, t);
    }
    return t as unknown as TableMoteur<LignesMoteur[N]>;
  }
  async dernierInstantane(societeId: string, exerciceId: string): Promise<LigneSnapshotCloture | null> {
    const lignes = (await this.table('snapshot_cloture').lister(societeId)).filter((l) => l.exerciceId === exerciceId);
    return lignes.reduce<LigneSnapshotCloture | null>((m, l) => (m === null || l.version > m.version ? l : m), null);
  }
}
