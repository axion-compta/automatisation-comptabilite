// Archive datée des rapports (V3-JUR-014, V3-JUR-002) : pur, sans E/S. L'empreinte porte sur les octets RENDUS.
import { empreinteSha256, manifeste, verifierManifeste, type ResultatVerification } from '../documents/empreinte.js';
import { etatMention, type Filigrane } from '../documents/mention.js';

export type CodeArchiveRapport = 'non_valide' | 'octets_vides' | 'date_invalide' | 'exercice_vide';

export class ErreurArchiveRapport extends Error {
  override name = 'ErreurArchiveRapport';
  constructor(readonly code: CodeArchiveRapport, message: string) {
    super(message);
  }
}

export type TypeRapport = 'gestion' | 'sci';
export interface ValidationRapport {
  par: string;
  le: string;
}
export interface DocumentRapport<R = unknown> {
  type: TypeRapport;
  exerciceId: string;
  rubriques: readonly R[];
  filigrane: Filigrane;
  mention: 'prepare_par_ia';
  validation?: ValidationRapport;
  mentions: readonly ['pas_de_depot_greffe'];
}
export interface EntreeArchive {
  nom: string;
  exerciceId: string;
  type: TypeRapport;
  par: string;
  valideLe: string;
  archiveLe: string;
  sha256: string;
  manifeste: string;
}

export function documentRapport<R>(e: {
  type: TypeRapport;
  exerciceId: string;
  rubriques: readonly R[];
  validation: ValidationRapport | null;
}): DocumentRapport<R> {
  const v = e.validation;
  const m = etatMention(
    v === null
      ? { statut: 'a_valider', nature: 'officiel' }
      : { statut: 'valide', nature: 'officiel', validePar: v.par, valideLe: v.le },
  );
  const { type, exerciceId, rubriques } = e;
  return { type, exerciceId, rubriques, filigrane: m.filigrane, mention: m.mention, ...(m.validation === undefined ? {} : { validation: m.validation }), mentions: ['pas_de_depot_greffe'] };
}

const FORME_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
function dateReelle(s: string): boolean {
  const m = FORME_DATE.exec(s);
  if (m === null) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, s.length) === s;
}

export function entreeArchive(octets: Uint8Array, document: DocumentRapport, le: string): EntreeArchive {
  const v = document.validation;
  if (v === undefined) throw new ErreurArchiveRapport('non_valide', 'Rapport non validé.');
  if (octets.length === 0) throw new ErreurArchiveRapport('octets_vides', 'Aucun octet à archiver.');
  if (document.exerciceId.trim() === '') throw new ErreurArchiveRapport('exercice_vide', 'Exercice manquant.');
  if (!dateReelle(le) || (dateReelle(v.le) && le < v.le)) {
    throw new ErreurArchiveRapport('date_invalide', 'Date d’archive invalide.');
  }
  const nom = `rapport-${document.type}-${document.exerciceId}.pdf`;
  const { exerciceId, type } = document;
  return { nom, exerciceId, type, par: v.par, valideLe: v.le, archiveLe: le, sha256: empreinteSha256(octets), manifeste: manifeste([{ nom, octets }]) };
}

export function verifierArchive(octets: Uint8Array, entree: EntreeArchive): ResultatVerification {
  return verifierManifeste(entree.manifeste, [{ nom: entree.nom, octets }]);
}
