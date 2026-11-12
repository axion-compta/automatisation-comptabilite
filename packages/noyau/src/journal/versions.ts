// Historique des versions d'un objet reconstruit depuis le journal chaîné (aucune table de plus).
// Fonctions pures : la chaîne est vérifiée avant toute lecture.
import type { EntreeJournal } from './chaine.js';
import { verifierChaine, type ParametresVerification } from './verifier.js';

export class ErreurVersions extends Error {
  override name = 'ErreurVersions';
  readonly code: 'journal_non_verifie';
  constructor(code: 'journal_non_verifie') {
    super(code);
    this.code = code;
  }
}

export type VersionObjet = {
  numero: number;
  sequence: number;
  horodatage: string;
  auteur: string;
  etat: unknown;
};

export type ComparaisonVersions = {
  ajoutes: string[];
  retires: string[];
  modifies: { champ: string; avant: unknown; apres: unknown }[];
};

const estObjet = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

function identifiant(e: EntreeJournal): unknown {
  for (const etat of [e.apres, e.avant]) if (estObjet(etat) && etat.id !== undefined) return etat.id;
  return undefined;
}

export function versionsObjet(
  entrees: readonly EntreeJournal[],
  cible: { typeObjet: string; objetId: string },
  parametresJournal: ParametresVerification,
): VersionObjet[] {
  if (!verifierChaine(entrees, parametresJournal).ok) throw new ErreurVersions('journal_non_verifie');
  const prefixe = `${cible.typeObjet}.`;
  return entrees
    .filter(
      (e) =>
        e.societeId === parametresJournal.societeId &&
        e.evenement.startsWith(prefixe) &&
        identifiant(e) === cible.objetId,
    )
    .map((e, i) => ({
      numero: i + 1,
      sequence: e.sequence,
      horodatage: e.horodatage,
      auteur: e.acteur,
      etat: e.apres,
    }));
}

function identique(a: unknown, b: unknown): boolean {
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
}

function canon(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canon);
  if (estObjet(v)) return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]));
  return v;
}

/** Compare les seules clés de premier niveau de deux versions. */
export function comparerVersions(a: VersionObjet, b: VersionObjet): ComparaisonVersions {
  const x = estObjet(a.etat) ? a.etat : {};
  const y = estObjet(b.etat) ? b.etat : {};
  const modifies: ComparaisonVersions['modifies'] = [];
  for (const champ of Object.keys(x)) {
    if (champ in y && !identique(x[champ], y[champ])) modifies.push({ champ, avant: x[champ], apres: y[champ] });
  }
  return {
    ajoutes: Object.keys(y).filter((k) => !(k in x)),
    retires: Object.keys(x).filter((k) => !(k in y)),
    modifies,
  };
}
