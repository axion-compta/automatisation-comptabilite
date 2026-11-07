// Ventilation analytique d'une ligne de classe 6 ou 7, par poids ou par montants.
// Les versions sont conservées : on n'efface jamais une ventilation validée.
import { centimes, repartir, type Centimes } from '../argent/index.js';

export type CodeErreurAnalytique =
  | 'somme_differente'
  | 'classe_non_ventilable'
  | 'section_inactive'
  | 'section_en_double'
  | 'entree_invalide';

export class ErreurAnalytique extends Error {
  override name = 'ErreurAnalytique';
  readonly code: CodeErreurAnalytique;
  constructor(code: CodeErreurAnalytique, message: string) {
    super(message);
    this.code = code;
  }
}

export interface LigneAVentiler {
  id: string;
  compte: string;
  montant: number;
}

export interface Section {
  id: string;
  actif: boolean;
}

export interface PartPoids {
  sectionId: string;
  poids: number;
}

export interface PartMontant {
  sectionId: string;
  montant: number;
}

export interface PartVentilee {
  sectionId: string;
  montant: Centimes;
}

export interface Ventilation {
  ligneId: string;
  parts: readonly PartVentilee[];
}

export interface VersionVentilation extends Ventilation {
  version: number;
  date: string;
}

function invalide(message: string): ErreurAnalytique {
  return new ErreurAnalytique('entree_invalide', message);
}

function verifierCommun(
  ligne: LigneAVentiler,
  ids: readonly string[],
  sections: readonly Section[],
): Centimes {
  if (typeof ligne.id !== 'string' || ligne.id.trim() === '') throw invalide('Identifiant de ligne absent.');
  if (typeof ligne.compte !== 'string' || !/^[67]/.test(ligne.compte)) {
    throw new ErreurAnalytique('classe_non_ventilable', 'Seules les lignes de classe 6 ou 7 sont ventilables.');
  }
  if (typeof ligne.montant !== 'number' || !Number.isSafeInteger(ligne.montant) || ligne.montant === 0) {
    throw invalide('Le montant de la ligne doit être un entier de centimes non nul.');
  }
  if (ids.length === 0) throw invalide('Aucune part.');
  if (new Set(ids).size !== ids.length) {
    throw new ErreurAnalytique('section_en_double', 'Une section ne peut apparaître qu’une fois.');
  }
  for (const id of ids) {
    const s = sections.find((x) => x.id === id);
    if (s === undefined || s.actif !== true) {
      throw new ErreurAnalytique('section_inactive', 'Section inconnue ou inactive : ' + String(id));
    }
  }
  return centimes(ligne.montant);
}

/** Répartit la ligne selon des poids entiers, au plus fort reste. */
export function ventilerParPoids(
  ligne: LigneAVentiler,
  parts: readonly PartPoids[],
  sections: readonly Section[],
): Ventilation {
  const total = verifierCommun(ligne, parts.map((p) => p.sectionId), sections);
  const poids = parts.map((p) => p.poids);
  if (poids.some((p) => typeof p !== 'number' || !Number.isSafeInteger(p) || p < 0) || poids.every((p) => p === 0)) {
    throw invalide('Les poids sont des entiers positifs ou nuls, au moins un non nul.');
  }
  const montants = repartir(total, poids);
  return { ligneId: ligne.id, parts: parts.map((p, k) => ({ sectionId: p.sectionId, montant: montants[k] ?? centimes(0) })) };
}

/** Ventile par montants : la somme doit égaler le montant de la ligne au centime. */
export function ventilerParMontants(
  ligne: LigneAVentiler,
  parts: readonly PartMontant[],
  sections: readonly Section[],
): Ventilation {
  const total = verifierCommun(ligne, parts.map((p) => p.sectionId), sections);
  if (parts.some((p) => typeof p.montant !== 'number' || !Number.isSafeInteger(p.montant))) {
    throw invalide('Les montants des parts sont des entiers de centimes.');
  }
  const somme = parts.reduce((s, p) => s + p.montant, 0);
  if (somme !== total) {
    throw new ErreurAnalytique('somme_differente', 'La somme des parts diffère du montant de la ligne.');
  }
  return { ligneId: ligne.id, parts: parts.map((p) => ({ sectionId: p.sectionId, montant: centimes(p.montant) })) };
}

/** Ajoute une version : nouvelle liste, version suivante, rien de modifié (même période verrouillée). */
export function ajouterVersion(
  historique: readonly VersionVentilation[],
  ventilation: Ventilation,
  date: string,
): VersionVentilation[] {
  if (typeof date !== 'string' || date.trim() === '') throw invalide('Date de version absente.');
  const version = historique.reduce((m, v) => Math.max(m, v.version), 0) + 1;
  return [...historique, { ligneId: ventilation.ligneId, parts: [...ventilation.parts], version, date }];
}
