export type TypeDocument =
  | "fec"
  | "declaration_tva"
  | "declaration"
  | "etat"
  | "pv"
  | "paquet";

export type StatutDocument =
  | "brouillon"
  | "a_valider"
  | "valide"
  | "remplace"
  | "indicatif";

export interface DocumentProduit {
  id: string;
  type: TypeDocument;
  exerciceId: string;
  version: number;
  statut: StatutDocument;
  sha256: string;
  versionLogiciel: string;
  versionPaquet: string;
  preparePar: string;
  prepareLe: string;
  resultatControles: "ok" | "ecarts";
  validePar?: string;
  valideLe?: string;
  motif?: string;
  destinataire?: string;
}

export type NouveauDocument = Omit<DocumentProduit, "version">;

export type CodeErreurHistorique =
  | "motif_obligatoire"
  | "version_invalide"
  | "deja_valide"
  | "validation_incomplete"
  | "document_inconnu"
  | "indicatif_non_validable";

export class ErreurHistorique extends Error {
  readonly code: CodeErreurHistorique;
  constructor(code: CodeErreurHistorique, message: string) {
    super(message);
    this.name = "ErreurHistorique";
    this.code = code;
  }
}

function vide(texte: string | undefined): boolean {
  return texte === undefined || texte.trim() === "";
}

function memeCouple(
  d: DocumentProduit,
  type: TypeDocument,
  exerciceId: string,
): boolean {
  return d.type === type && d.exerciceId === exerciceId;
}

function controler(historique: readonly DocumentProduit[]): void {
  const vus = new Set<string>();
  for (const d of historique) {
    if (!Number.isInteger(d.version) || d.version < 1) {
      throw new ErreurHistorique("version_invalide", "Version invalide.");
    }
    const cle = JSON.stringify([d.type, d.exerciceId, d.version]);
    if (vus.has(cle))
      throw new ErreurHistorique("version_invalide", "Version en double.");
    vus.add(cle);
  }
}

export function ajouterVersion(
  historique: readonly DocumentProduit[],
  nouveau: NouveauDocument,
): DocumentProduit[] {
  controler(historique);
  if (nouveau.statut === "valide" || nouveau.statut === "remplace") {
    throw new ErreurHistorique(
      "validation_incomplete",
      "Un nouveau document doit être validé après coup.",
    );
  }
  const couple = historique.filter((d) =>
    memeCouple(d, nouveau.type, nouveau.exerciceId),
  );
  const version = couple.reduce((max, d) => Math.max(max, d.version), 0) + 1;
  const remplace = couple.some((d) => d.statut === "valide");
  if (remplace && vide(nouveau.motif)) {
    throw new ErreurHistorique(
      "motif_obligatoire",
      "Un motif est obligatoire pour remplacer.",
    );
  }
  const copie = historique.map((d) =>
    remplace &&
    memeCouple(d, nouveau.type, nouveau.exerciceId) &&
    d.statut === "valide"
      ? { ...d, statut: "remplace" as const }
      : { ...d },
  );
  return [...copie, { ...nouveau, version }];
}

export function valider(
  historique: readonly DocumentProduit[],
  id: string,
  validation: { par: string; le: string },
): DocumentProduit[] {
  controler(historique);
  const cible = historique.find((d) => d.id === id);
  if (cible === undefined)
    throw new ErreurHistorique("document_inconnu", "Document inconnu.");
  if (cible.statut === "indicatif") {
    throw new ErreurHistorique(
      "indicatif_non_validable",
      "Un document indicatif ne se valide pas.",
    );
  }
  if (cible.statut === "valide" || cible.statut === "remplace") {
    throw new ErreurHistorique("deja_valide", "Document déjà validé.");
  }
  if (vide(validation.par) || vide(validation.le)) {
    throw new ErreurHistorique(
      "validation_incomplete",
      "Validateur et date obligatoires.",
    );
  }
  return historique.map((d) =>
    d === cible
      ? {
          ...d,
          statut: "valide" as const,
          validePar: validation.par,
          valideLe: validation.le,
        }
      : { ...d },
  );
}

export function dernierEnVigueur(
  historique: readonly DocumentProduit[],
  type: TypeDocument,
  exerciceId: string,
): DocumentProduit | undefined {
  let meilleur: DocumentProduit | undefined;
  for (const d of historique) {
    if (!memeCouple(d, type, exerciceId) || d.statut === "remplace") continue;
    if (meilleur === undefined || d.version > meilleur.version) meilleur = d;
  }
  return meilleur;
}
