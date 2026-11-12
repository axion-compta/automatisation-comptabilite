// Journal de reprise : versions utilisées, lignes d'étapes (empreintes), versions du rapport, mentions acceptées.
// Pur et en ajout seul : chaque fonction rend un nouveau journal, l'ancien n'est jamais modifié.
export type CodeErreurJournal = 'version_manquante' | 'ligne_invalide' | 'rapport_invalide' | 'mention_invalide';

export class ErreurJournal extends Error {
  readonly code: CodeErreurJournal;
  constructor(code: CodeErreurJournal, message: string) {
    super(message);
    this.name = 'ErreurJournal';
    this.code = code;
  }
}

export interface ParametresJournal {
  versionRegles: string;
  versionConsignes: string;
  modeles: readonly string[];
  versionParametres: string;
}
export interface LigneJournal { etape: string; entreeEmpreinte: string; sortieEmpreinte: string }
export interface VersionRapport { version: number; empreinte: string; produitLe: string }
export interface MentionAcceptee { mention: string; par: string; horodatage: string }
export interface JournalReprise {
  readonly versions: Readonly<ParametresJournal>;
  readonly lignes: readonly LigneJournal[];
  readonly versionsRapport: readonly VersionRapport[];
  readonly mentionsAcceptees: readonly MentionAcceptee[];
}

const texte = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const SHA256 = /^[0-9a-f]{64}$/;
const empreinte = (v: unknown): v is string => typeof v === 'string' && SHA256.test(v);
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
function horodatageValide(v: unknown): v is string {
  if (typeof v !== 'string' || !ISO.test(v)) return false;
  const [annee, mois, jour] = v.slice(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(annee ?? 0, (mois ?? 1) - 1, jour ?? 1));
  return !Number.isNaN(Date.parse(v)) && date.getUTCMonth() === (mois ?? 0) - 1 && date.getUTCDate() === jour;
}

export function ouvrirJournal(p: ParametresJournal): JournalReprise {
  const modelesOk = Array.isArray(p.modeles) && p.modeles.length > 0 && p.modeles.every(texte);
  if (!texte(p.versionRegles) || !texte(p.versionConsignes) || !texte(p.versionParametres) || !modelesOk) {
    throw new ErreurJournal('version_manquante', 'Chaque version (règles, consignes, modèles, paramètres) est obligatoire.');
  }
  const versions = Object.freeze({
    versionRegles: p.versionRegles,
    versionConsignes: p.versionConsignes,
    modeles: Object.freeze([...p.modeles]),
    versionParametres: p.versionParametres,
  });
  return Object.freeze({ versions, lignes: Object.freeze([]), versionsRapport: Object.freeze([]), mentionsAcceptees: Object.freeze([]) });
}

const avec = (j: JournalReprise, patch: Partial<JournalReprise>): JournalReprise => Object.freeze({ ...j, ...patch });
export function ajouterLigne(j: JournalReprise, ligne: LigneJournal): JournalReprise {
  if (!texte(ligne.etape) || !empreinte(ligne.entreeEmpreinte) || !empreinte(ligne.sortieEmpreinte)) {
    throw new ErreurJournal('ligne_invalide', 'Étape non vide et deux empreintes sha256 en hexadécimal minuscule.');
  }
  const { etape, entreeEmpreinte, sortieEmpreinte } = ligne;
  return avec(j, { lignes: Object.freeze([...j.lignes, Object.freeze({ etape, entreeEmpreinte, sortieEmpreinte })]) });
}

/** Chaque dépôt crée la version suivante, même si l'empreinte est déjà connue : aucune version n'est écrasée. */
export function ajouterVersionRapport(j: JournalReprise, v: { empreinte: string; produitLe: string }): JournalReprise {
  if (!empreinte(v.empreinte) || !horodatageValide(v.produitLe)) {
    throw new ErreurJournal('rapport_invalide', 'Empreinte sha256 et horodatage ISO valides obligatoires.');
  }
  const version = j.versionsRapport.length + 1;
  return avec(j, { versionsRapport: Object.freeze([...j.versionsRapport, Object.freeze({ version, empreinte: v.empreinte, produitLe: v.produitLe })]) });
}

export function accepterMention(j: JournalReprise, m: MentionAcceptee): JournalReprise {
  if (!texte(m.mention) || !texte(m.par) || !horodatageValide(m.horodatage)) {
    throw new ErreurJournal('mention_invalide', 'Mention, auteur et horodatage ISO valides obligatoires.');
  }
  const { mention, par, horodatage } = m;
  return avec(j, { mentionsAcceptees: Object.freeze([...j.mentionsAcceptees, Object.freeze({ mention, par, horodatage })]) });
}

/** Rejoue chaque étape depuis son empreinte d'entrée : vrai seulement si toutes les sorties sont identiques. */
export function rejouer(j: JournalReprise, executer: (etape: string, entreeEmpreinte: string) => string): boolean {
  return j.lignes.every((l) => executer(l.etape, l.entreeEmpreinte) === l.sortieEmpreinte);
}
