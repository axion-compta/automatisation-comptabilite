// Adaptateurs EN MÉMOIRE (données fictives, aucune base). Les règles viennent du noyau, jamais recopiées.
import { centimes } from '../../../../packages/noyau/src/argent/index.js';
import { ajouterVersion, valider, type DocumentProduit } from '../../../../packages/noyau/src/documents/historique.js';
import { changerStatut, type PeriodeDeclaration } from '../../../../packages/noyau/src/tva/periodes.js';
import { ErreurDepot, STATUTS_DOCUMENT, type AccuseDepot, type DeclarationEnregistree, type DepotDocumentsProduits, type DepotTva, type PeriodeTvaEnregistree } from './declarations.js';

const copie = <T>(x: T): T => structuredClone(x);
function societe(id: string): string {
  if (typeof id !== 'string' || id.trim() === '') throw new ErreurDepot('societe_invalide');
  return id;
}
const introuvable = (): ErreurDepot => new ErreurDepot('introuvable');
const copieOuNull = <T>(x: T | undefined): T | null => (x === undefined ? null : copie(x));

export class DepotDocumentsMemoire implements DepotDocumentsProduits {
  private lignes: { societeId: string; doc: DocumentProduit }[] = [];
  private de(societeId: string): DocumentProduit[] {
    return this.lignes.filter((l) => l.societeId === societeId).map((l) => l.doc);
  }
  private remplacer(societeId: string, nouvelle: DocumentProduit[]): void {
    this.lignes = [...this.lignes.filter((l) => l.societeId !== societeId), ...nouvelle.map((doc) => ({ societeId, doc }))];
  }
  historique(societeId: string, type: DocumentProduit['type'], exerciceId: string): DocumentProduit[] {
    return copie(this.de(societe(societeId)).filter((d) => d.type === type && d.exerciceId === exerciceId));
  }
  parId(societeId: string, id: string): DocumentProduit | null {
    return copieOuNull(this.de(societe(societeId)).find((x) => x.id === id));
  }
  ajouterVersion(societeId: string, nouveau: Parameters<DepotDocumentsProduits['ajouterVersion']>[1]): DocumentProduit {
    const s = societe(societeId);
    if (!STATUTS_DOCUMENT.includes(nouveau.statut)) throw new ErreurDepot('statut_invalide');
    const suite = ajouterVersion(this.de(s), copie(nouveau));
    this.remplacer(s, suite);
    return copie(suite[suite.length - 1] as DocumentProduit);
  }
  valider(societeId: string, id: string, validation: { par: string; le: string }): DocumentProduit {
    const s = societe(societeId);
    if (!this.de(s).some((d) => d.id === id)) throw introuvable();
    const suite = valider(this.de(s), id, validation);
    this.remplacer(s, suite);
    return copie(suite.find((d) => d.id === id) as DocumentProduit);
  }
}

export class DepotTvaMemoire implements DepotTva {
  private periodesStock: PeriodeTvaEnregistree[] = [];
  private declarations: DeclarationEnregistree[] = [];
  private accuses: AccuseDepot[] = [];

  private trouver(s: string, id: string): PeriodeTvaEnregistree | undefined {
    return this.periodesStock.find((p) => p.societeId === s && p.id === id);
  }
  private requise(s: string, id: string): PeriodeTvaEnregistree {
    return this.trouver(s, id) ?? (() => { throw introuvable(); })();
  }
  enregistrerPeriodes(societeId: string, exerciceId: string, periodes: Parameters<DepotTva['enregistrerPeriodes']>[2]): PeriodeTvaEnregistree[] {
    const s = societe(societeId);
    const ajouts: PeriodeTvaEnregistree[] = [];
    const vus = (id: string): PeriodeTvaEnregistree | undefined => this.trouver(s, id) ?? ajouts.find((p) => p.id === id);
    const rendues = periodes.map((p) => {
      const id = `periode-${exerciceId}-${p.debut}`;
      const existante = vus(id);
      if (existante === undefined) return ajouts[ajouts.push({ ...copie(p), statut: 'ouverte', id, societeId: s, exerciceId }) - 1] as PeriodeTvaEnregistree;
      const cle = (x: PeriodeDeclaration): string => JSON.stringify([x.debut, x.fin, x.periodicite, x.formulaire]);
      if (cle(existante) !== cle(p)) throw new ErreurDepot('deja_enregistre');
      return existante;
    });
    this.periodesStock.push(...ajouts);
    return copie(rendues);
  }
  periodes(societeId: string, exerciceId: string): PeriodeTvaEnregistree[] {
    const s = societe(societeId);
    return copie(this.periodesStock.filter((p) => p.societeId === s && p.exerciceId === exerciceId));
  }
  periode(societeId: string, id: string): PeriodeTvaEnregistree | null {
    return copieOuNull(this.trouver(societe(societeId), id));
  }
  changerStatutPeriode(societeId: string, id: string, vers: Parameters<DepotTva['changerStatutPeriode']>[2]): PeriodeTvaEnregistree {
    const p = this.requise(societe(societeId), id);
    Object.assign(p, changerStatut(p, vers, {}));
    return copie(p);
  }
  enregistrerDeclaration(societeId: string, d: Parameters<DepotTva['enregistrerDeclaration']>[1]): DeclarationEnregistree {
    const s = societe(societeId);
    if (d.resultat.bloque) throw new ErreurDepot('declaration_bloquee', d.resultat.code);
    this.requise(s, d.periodeId);
    const cases = d.resultat.cases.map((c) => ({ ...copie(c), montant: centimes(c.montant) }));
    if (this.declarations.some((x) => x.societeId === s && x.id === d.id)) throw new ErreurDepot('deja_enregistre');
    const neuve: DeclarationEnregistree = { id: d.id, societeId: s, periodeId: d.periodeId, documentId: d.documentId, cases };
    this.declarations.push(neuve);
    return copie(neuve);
  }
  declaration(societeId: string, id: string): DeclarationEnregistree | null {
    const s = societe(societeId);
    return copieOuNull(this.declarations.find((x) => x.societeId === s && x.id === id));
  }
  enregistrerAccuse(societeId: string, accuse: Parameters<DepotTva['enregistrerAccuse']>[1]): AccuseDepot {
    const s = societe(societeId);
    const p = this.requise(s, accuse.periodeId);
    const suite = changerStatut(p, 'deposee_par_client', { accusePieceId: accuse.pieceId });
    if (this.accuses.some((a) => a.societeId === s && a.id === accuse.id)) throw new ErreurDepot('deja_enregistre');
    const neuf: AccuseDepot = { ...copie(accuse), societeId: s };
    this.accuses.push(neuf);
    Object.assign(p, suite);
    return copie(neuf);
  }
}
