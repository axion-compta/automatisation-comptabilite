// Dépôts du profil : interfaces et adaptateur en mémoire (aucune base réelle ; l'adaptateur PostgreSQL attend le feu vert J10).
import { ajouterValeur, confirmer, valeurEnVigueur, type Confirmant, type NouvelleValeur } from '../../../../packages/noyau/src/profil/champs.js';
import { verifierRepartition, type Associe } from '../../../../packages/noyau/src/profil/associes.js';
import { ajouterLigneImposition, impositionAuJour, type LigneImposition } from '../../../../packages/noyau/src/profil/fiscal/imposition.js';
import type { TailleExercice } from '../../../../packages/noyau/src/profil/fiscal/micro-comptable.js';
import { ErreurProfil, type ChampProfil } from '../../../../packages/noyau/src/profil/types.js';
import { ajouterLecture, type Lecture } from '../../../../packages/parametres/src/lectures.js';

export type CodeErreurDepotProfil = 'ajout_seul' | 'chevauchement' | 'confirme_sans_personne' | 'centimes_invalides' | 'societe_invalide' | 'repartition_invalide';
export class ErreurDepotProfil extends Error {
  override name = 'ErreurDepotProfil';
  constructor(readonly code: CodeErreurDepotProfil) { super(code); }
}
/** La société vient toujours du contexte, jamais d'une ligne. */
export type ContexteSociete = { readonly societeId: string };
type SansSociete<T> = Omit<T, 'societeId'>;

interface AjoutSeul { modifier(...args: unknown[]): never; supprimer(...args: unknown[]): never }
export interface DepotChampsProfil extends AjoutSeul {
  ajouter(ctx: ContexteSociete, nouvelle: SansSociete<NouvelleValeur>, dateSaisie: string): void;
  confirmer(ctx: ContexteSociete, ref: { cle: string; effetDebut: string }, confirmant: Confirmant, horodatage: string): void;
  lire(ctx: ContexteSociete, cle: string, date: string): Readonly<ChampProfil> | null;
  lister(ctx: ContexteSociete): readonly Readonly<ChampProfil>[];
}
export interface DepotImposition {
  ajouter(ctx: ContexteSociete, ligne: SansSociete<LigneImposition>, confirmePar?: string | null): void;
  auJour(ctx: ContexteSociete, date: string): Readonly<LigneImposition> | null;
  lister(ctx: ContexteSociete): readonly Readonly<LigneImposition>[];
}
export interface DepotTaille { enregistrer(ctx: ContexteSociete, exerciceId: string, taille: TailleExercice): string; lire(ctx: ContexteSociete, exerciceId: string): Readonly<TailleExercice> | undefined }
export interface DepotAssocies { remplacer(ctx: ContexteSociete, associes: readonly Associe[]): void; lister(ctx: ContexteSociete): readonly Readonly<Associe>[] }
export interface DepotLecturesParametre extends AjoutSeul {
  ajouter(ctx: ContexteSociete, lecture: unknown): void;
  lister(ctx: ContexteSociete, cle: string): readonly Readonly<Lecture>[];
}
export type DepotsProfil = { champs: DepotChampsProfil; imposition: DepotImposition; taille: DepotTaille; associes: DepotAssocies; lectures: DepotLecturesParametre };

const copie = <T>(v: T): Readonly<T> => Object.freeze(structuredClone(v));
const refuserModification = (): never => { throw new ErreurDepotProfil('ajout_seul'); };
const renseigne = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const entierOuNul = (n: unknown): boolean => n === null || (typeof n === 'number' && Number.isSafeInteger(n) && n >= 0);

function societe(ctx: ContexteSociete): string {
  if (!renseigne(ctx?.societeId)) throw new ErreurDepotProfil('societe_invalide');
  return ctx.societeId;
}
const parSociete = <T>(base: Map<string, T[]>, id: string): T[] => base.get(id) ?? [];

export function creerDepotProfilMemoire({ nouvelId }: { nouvelId: () => string }): DepotsProfil {
  const champs = new Map<string, ChampProfil[]>();
  const lignes = new Map<string, LigneImposition[]>();
  const tailles = new Map<string, TailleExercice>();
  const associes = new Map<string, Associe[]>();
  const lectures = new Map<string, Lecture[]>();
  const idsTaille = new Map<string, string>();

  return {
    champs: {
      ajouter(ctx, nouvelle, dateSaisie) {
        const id = societe(ctx);
        const h = parSociete(champs, id);
        champs.set(id, [...ajouterValeur(h, { ...structuredClone(nouvelle), societeId: id }, dateSaisie)]);
      },
      confirmer(ctx, ref, confirmant, horodatage) {
        const id = societe(ctx);
        if (confirmant?.type !== 'personne' || !renseigne(confirmant.id)) throw new ErreurDepotProfil('confirme_sans_personne');
        champs.set(id, [...confirmer(parSociete(champs, id), { ...ref, societeId: id }, confirmant, horodatage)]);
      },
      lire(ctx, cle, date) {
        const id = societe(ctx);
        const v = valeurEnVigueur(parSociete(champs, id), id, cle, date);
        return v === null ? null : copie(v);
      },
      lister: (ctx) => Object.freeze(parSociete(champs, societe(ctx)).map(copie)),
      modifier: refuserModification,
      supprimer: refuserModification,
    },
    imposition: {
      ajouter(ctx, ligne, confirmePar = null) {
        const id = societe(ctx);
        if (ligne.statut === 'confirme' && !renseigne(confirmePar)) throw new ErreurDepotProfil('confirme_sans_personne');
        try {
          lignes.set(id, [...ajouterLigneImposition(parSociete(lignes, id), { ...structuredClone(ligne), societeId: id })]);
        } catch (e) {
          if (e instanceof ErreurProfil && e.code === 'chevauchement') throw new ErreurDepotProfil('chevauchement');
          throw e;
        }
      },
      auJour(ctx, date) {
        const id = societe(ctx);
        const l = impositionAuJour(parSociete(lignes, id), id, date);
        return l === null ? null : copie(l);
      },
      lister: (ctx) => Object.freeze(parSociete(lignes, societe(ctx)).map(copie)),
    },
    taille: {
      enregistrer(ctx, exerciceId, taille) {
        const id = societe(ctx);
        if (![taille.totalBilanCentimes, taille.caNetCentimes, taille.effectifMoyen].every(entierOuNul)) throw new ErreurDepotProfil('centimes_invalides');
        const cle = JSON.stringify([id, exerciceId]);
        tailles.set(cle, structuredClone(taille));
        const ligneId = idsTaille.get(cle) ?? nouvelId();
        idsTaille.set(cle, ligneId);
        return ligneId;
      },
      lire(ctx, exerciceId) {
        const t = tailles.get(JSON.stringify([societe(ctx), exerciceId]));
        return t === undefined ? undefined : copie(t);
      },
    },
    associes: {
      remplacer(ctx, liste) {
        const id = societe(ctx);
        if (!verifierRepartition(liste).valide) throw new ErreurDepotProfil('repartition_invalide');
        associes.set(id, structuredClone([...liste]));
      },
      lister: (ctx) => Object.freeze((associes.get(societe(ctx)) ?? []).map(copie)),
    },
    lectures: {
      ajouter(ctx, lecture) {
        const id = societe(ctx);
        lectures.set(id, [...ajouterLecture(parSociete(lectures, id), lecture)]);
      },
      lister: (ctx, cle) => Object.freeze(parSociete(lectures, societe(ctx)).filter((l) => l.parametreCle === cle).map(copie)),
      modifier: refuserModification,
      supprimer: refuserModification,
    },
  };
}
