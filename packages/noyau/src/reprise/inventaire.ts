import { estDateValide } from '../dates/civiles.js';
import { empreinteSha256 } from '../documents/empreinte.js';
import { classerDocument, estTypeDocument, type TypeClasse, type TypeDocument } from './types-document.js';

export class ErreurInventaire extends Error {
  readonly code: 'inventaire_valide' | 'argument_invalide' | 'ligne_inconnue';
  constructor(code: ErreurInventaire['code'], message?: string) {
    super(message ?? code);
    this.name = 'ErreurInventaire';
    this.code = code;
  }
}

export interface FichierReprise {
  nom: string;
  octets: Uint8Array;
  typeMime?: string;
  /** Date du document (AAAA-MM-JJ) ; prime sur celle lue dans le nom. */
  date?: string;
}
export interface ExerciceReprise {
  id: string;
  debut: string;
  fin: string;
}
export interface LigneInventaire {
  nom: string;
  empreinte: string;
  type: TypeClasse;
  exercice: string | null;
  doublonDe: string | null;
}
export interface Inventaire {
  lignes: readonly LigneInventaire[];
  validation: { par: string; le: string } | null;
}

const DATE_DANS_NOM = /(\d{4})-?(\d{2})-?(\d{2})/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[.]\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function dateDe(f: FichierReprise): string | null {
  if (f.date !== undefined) return estDateValide(f.date) ? f.date : null;
  const g = DATE_DANS_NOM.exec(f.nom);
  const d = g === null ? '' : `${g[1]}-${g[2]}-${g[3]}`;
  return estDateValide(d) ? d : null;
}

function exerciceDe(date: string | null, exercices: readonly ExerciceReprise[]): string | null {
  if (date === null) return null;
  return exercices.find((e) => e.debut <= date && date <= e.fin)?.id ?? null;
}

const figer = (lignes: LigneInventaire[], validation: Inventaire['validation']): Inventaire =>
  Object.freeze({ lignes: Object.freeze(lignes.map((l) => Object.freeze({ ...l }))), validation });

export function construireInventaire(
  fichiers: readonly FichierReprise[],
  exercices: readonly ExerciceReprise[],
): Inventaire {
  const premiers = new Map<string, string>();
  const lignes = fichiers.map((f): LigneInventaire => {
    const empreinte = empreinteSha256(f.octets);
    const doublonDe = premiers.get(empreinte) ?? null;
    if (doublonDe === null) premiers.set(empreinte, f.nom);
    return {
      nom: f.nom,
      empreinte,
      type: classerDocument(f.nom, f.typeMime ?? ''),
      exercice: exerciceDe(dateDe(f), exercices),
      doublonDe,
    };
  });
  return figer(lignes, null);
}

const refuserSiValide = (inv: Inventaire): void => {
  if (inv.validation !== null) throw new ErreurInventaire('inventaire_valide', 'inventaire_valide');
};

export function reclasserLigne(inv: Inventaire, nom: string, type: TypeDocument): Inventaire {
  refuserSiValide(inv);
  if (!estTypeDocument(type)) throw new ErreurInventaire('argument_invalide', 'type');
  if (!inv.lignes.some((l) => l.nom === nom)) throw new ErreurInventaire('ligne_inconnue', 'ligne_inconnue');
  return figer(inv.lignes.map((l) => (l.nom === nom ? { ...l, type } : { ...l })), null);
}

/** Fige l'inventaire : une personne nommée et un instant valide, une seule fois. */
export function validerInventaire(inv: Inventaire, personne: string, horodatage: string): Inventaire {
  refuserSiValide(inv);
  if (typeof personne !== 'string' || personne.trim() === '') throw new ErreurInventaire('argument_invalide', 'personne');
  if (typeof horodatage !== 'string' || !INSTANT.test(horodatage) || Number.isNaN(Date.parse(horodatage))) {
    throw new ErreurInventaire('argument_invalide', 'horodatage');
  }
  return figer(inv.lignes.map((l) => ({ ...l })), { par: personne, le: horodatage });
}
