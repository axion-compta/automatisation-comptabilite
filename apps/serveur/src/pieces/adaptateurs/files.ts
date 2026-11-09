// Files de traitement des pièces (5 étapes) : écrites contre une prise ServiceFiles ; la vraie file de la console se branchera plus tard.
import { appliquerTransition, prochaineRelance, ETAPES, cleTache, type Etape } from '../../../../../packages/noyau/src/pieces/etats.js';
import { etapeAntivirus, etapeEntree, type ContexteEntree } from '../etape-entree.js';
import { etapeClassement, type ContexteClassement } from '../etape-classement.js';
import { etapeLecture, type ContexteLecture, type JournalTaches, type ResultatLecture } from '../etape-lecture.js';
import { etapePreparation, type ContextePreparation, type ResultatPreparation } from '../etape-preparation.js';
import type { Horloge } from '../ports.js';

const MS_PAR_MINUTE = 60_000;
export const NOMS_FILES: Record<Etape, string> = Object.fromEntries(ETAPES.map((e) => [e, `compta-pieces-${e}`])) as Record<Etape, string>;
export type Priorite = 'unitaire' | 'lot' | 'gros_documents';
const RANG: Record<Priorite, number> = { unitaire: 0, lot: 1, gros_documents: 2 };
export interface Tache { cle: string; pieceId: string; priorite: Priorite }
/** Prise de la file : la console la fournit plus tard, FilesMemoire sert de faux service. */
export interface ServiceFiles {
  publier(file: string, tache: Tache): Promise<'ajoutee' | 'existe'>;
  prendre(file: string, maintenant: string): Promise<Tache | null>;
  terminer(file: string, cle: string): Promise<void>;
  reporter(file: string, cle: string, disponibleA: string): Promise<void>;
  rendre(file: string, cle: string): Promise<void>;
}
export type Issue = { pieces: string[] } | { relanceA: string } | { fin: true };
export type Executeur = (pieceId: string) => Promise<Issue>;
export interface ContexteFiles { service: ServiceFiles; executeurs: Record<Etape, Executeur>; horloge: Horloge }
export interface ReglagePriorite { seuilGrosOctets: number }

const entier = (n: number): number => {
  if (!Number.isInteger(n) || n < 0) throw new RangeError('valeur invalide');
  return n;
};
export function prioriteDe(depot: { tailleOctets: number; nombreFichiers: number }, reglage: ReglagePriorite): Priorite {
  if (entier(depot.tailleOctets) > entier(reglage.seuilGrosOctets)) return 'gros_documents';
  return entier(depot.nombreFichiers) > 1 ? 'lot' : 'unitaire';
}

interface Ligne extends Tache { ordre: number; prise: boolean; dispoA: string }
export class FilesMemoire implements ServiceFiles {
  private readonly lignes = new Map<string, Map<string, Ligne>>();
  private readonly vues = new Map<string, Set<string>>();
  private ordre = 0;
  private de(file: string): Map<string, Ligne> { return this.lignes.get(file) ?? (this.lignes.set(file, new Map()), this.lignes.get(file)!); }
  async publier(file: string, tache: Tache): Promise<'ajoutee' | 'existe'> {
    const vues = this.vues.get(file) ?? (this.vues.set(file, new Set()), this.vues.get(file)!);
    if (vues.has(tache.cle)) return 'existe';
    vues.add(tache.cle);
    this.de(file).set(tache.cle, { ...tache, ordre: (this.ordre += 1), prise: false, dispoA: '' });
    return 'ajoutee';
  }
  async prendre(file: string, maintenant: string): Promise<Tache | null> {
    const pretes = [...this.de(file).values()].filter((l) => !l.prise && Date.parse(l.dispoA || maintenant) <= Date.parse(maintenant));
    const [premiere] = pretes.sort((a, b) => RANG[a.priorite] - RANG[b.priorite] || a.ordre - b.ordre);
    if (premiere === undefined) return null;
    premiere.prise = true;
    return { cle: premiere.cle, pieceId: premiere.pieceId, priorite: premiere.priorite };
  }
  async terminer(file: string, cle: string): Promise<void> { this.de(file).delete(cle); }
  async reporter(file: string, cle: string, disponibleA: string): Promise<void> {
    const l = this.de(file).get(cle);
    if (l) Object.assign(l, { prise: false, dispoA: disponibleA });
  }
  async rendre(file: string, cle: string): Promise<void> { await this.reporter(file, cle, ''); }
}

/** Traite une tâche de l'étape : suite publiée avant de terminer (rejeu sans doublon), panne = tâche rendue à la file. */
export async function traiterUne(etape: Etape, ctx: ContexteFiles): Promise<'vide' | 'fait' | 'reporte'> {
  const file = NOMS_FILES[etape];
  const tache = await ctx.service.prendre(file, ctx.horloge.maintenant());
  if (tache === null) return 'vide';
  let issue: Issue;
  try {
    issue = await ctx.executeurs[etape](tache.pieceId);
  } catch (e) {
    await ctx.service.rendre(file, tache.cle);
    throw e;
  }
  if ('relanceA' in issue) {
    await ctx.service.reporter(file, tache.cle, issue.relanceA);
    return 'reporte';
  }
  const suivante = ETAPES[ETAPES.indexOf(etape) + 1];
  if ('pieces' in issue && suivante !== undefined) {
    for (const id of issue.pieces) await ctx.service.publier(NOMS_FILES[suivante], { cle: `${id}:${suivante}`, pieceId: id, priorite: tache.priorite });
  }
  await ctx.service.terminer(file, tache.cle);
  return 'fait';
}

/** Branchement des étapes T36, T37 et T39 : chaque exécuteur reprend à la pièce enregistrée, sans rejouer ce qui est journalisé. */
export const executeurEntree = (ctx: ContexteEntree, source: { lire(depotId: string): Promise<Uint8Array | null> }, faits: JournalTaches<string[]>): Executeur => async (depotId) => {
  const connu = await faits.lire(depotId);
  if (connu !== undefined) return { pieces: connu };
  const octets = await source.lire(depotId);
  if (octets === null) return { fin: true };
  const r = await etapeEntree(octets, ctx);
  const pieces = [r.piece, ...r.enfants].filter((p) => p.etat === 'quarantaine').map((p) => p.id);
  await faits.ecrire(depotId, pieces);
  return { pieces };
};
export const executeurAntivirus = (ctx: ContexteEntree): Executeur => async (id) => {
  const piece = await ctx.depot.parId(id);
  if (piece === null) return { fin: true };
  const r = await etapeAntivirus(piece, ctx);
  if (r.etat === 'en_erreur' && r.prochaineRelanceA !== undefined && r.prochaineRelanceA !== 'abandon') return { relanceA: r.prochaineRelanceA };
  return r.etat === 'quarantaine' ? { pieces: [id] } : { fin: true };
};
export const executeurPreparation = (ctx: ContextePreparation & Pick<ContexteEntree, 'depot' | 'horloge'>, preparations: JournalTaches<ResultatPreparation>, reprise: { delaisRelanceMinutes: number[] }): Executeur => async (id) => {
  const piece = await ctx.depot.parId(id);
  if (piece === null) return { fin: true };
  const prep = await etapePreparation(piece, ctx);
  if (prep.etat === 'en_erreur') {
    // Comme l'antivirus : la pièce passe en erreur et la tâche est relancée ; abandon seulement après le dernier délai, état enregistré.
    const tentatives = (piece.tentatives ?? 0) + 1;
    const delai = prochaineRelance(tentatives - 1, reprise.delaisRelanceMinutes);
    const prochaineRelanceA = delai === 'abandon' ? delai : new Date(Date.parse(ctx.horloge.maintenant()) + delai * MS_PAR_MINUTE).toISOString();
    const etat = piece.etat === 'en_erreur' ? piece.etat : appliquerTransition(piece.etat, 'en_erreur');
    await ctx.depot.enregistrer({ ...piece, etat, tentatives, prochaineRelanceA, code: prep.motifs[0] ?? 'preparation_impossible' });
    return delai === 'abandon' ? { fin: true } : { relanceA: prochaineRelanceA };
  }
  await preparations.ecrire(id, prep);
  if (piece.etat === 'quarantaine' || piece.etat === 'en_erreur') await ctx.depot.enregistrer({ ...piece, etat: appliquerTransition(piece.etat, 'preparee') });
  return { pieces: [id] };
};
export const executeurLecture = (ctx: ContexteLecture, preparations: JournalTaches<ResultatPreparation>, lectures: JournalTaches<ResultatLecture>, reprise: { delaiIaMinutes: number }, horloge: Horloge): Executeur => async (id) => {
  const piece = await ctx.depot.parId(id);
  const prep = await preparations.lire(id);
  if (piece === null || prep === undefined) return { fin: true };
  const sortie = await etapeLecture(piece, prep, ctx);
  if ('erreur' in sortie) return { relanceA: new Date(Date.parse(horloge.maintenant()) + reprise.delaiIaMinutes * MS_PAR_MINUTE).toISOString() };
  await lectures.ecrire(cleTache(id, 'lecture', ctx.reglage.versionLecteur), sortie.resultat);
  return { pieces: [id] };
};
export const executeurClassement = (ctx: ContexteClassement, lectures: JournalTaches<ResultatLecture>, versionLecteur: string): Executeur => async (id) => {
  const piece = await ctx.depot.parId(id);
  const lecture = await lectures.lire(cleTache(id, 'lecture', versionLecteur));
  if (piece === null || lecture === undefined) return { fin: true };
  await etapeClassement(piece, lecture, ctx);
  return { fin: true };
};
