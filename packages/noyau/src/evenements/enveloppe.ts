import { estCanal, type Canal } from '../securite/types.js';

export type TypeActeur = 'personne' | 'ia' | 'systeme';
export type Enveloppe = {
  readonly id: string; readonly type: string; readonly societe_id: string; readonly exercice_id: string | null;
  readonly objet_id: string; readonly version: number; readonly acteur: { readonly type: TypeActeur; readonly id: string };
  readonly canal: Canal; readonly horodatage: string; readonly correlation_id: string;
  readonly charge: Readonly<Record<string, string | boolean | null>>;
};
export type CodeErreurEvenement = 'type_invalide' | 'champ_manquant' | 'champ_interdit' | 'montant_interdit' | 'horodatage_non_utc' | 'version_invalide' | 'hors_transaction';

/** Le message ne porte que le code : jamais de valeur de la charge. */
export class ErreurEvenement extends Error {
  constructor(readonly code: CodeErreurEvenement) {
    super(code);
    this.name = 'ErreurEvenement';
  }
}

const CLES = ['id', 'type', 'societe_id', 'exercice_id', 'objet_id', 'version', 'acteur', 'canal', 'horodatage', 'correlation_id', 'charge'];
const ACTEURS: readonly string[] = ['personne', 'ia', 'systeme'];
const SEGMENTS_INTERDITS = ['montant', 'total', 'solde', 'prix', 'tarif', 'centime', 'ttc', 'nom', 'email', 'iban', 'adresse', 'telephone'];
const MOTIF_TYPE = /^compta(\.[a-z_]+){2,}$/;
const MOTIF_NOMBRE = /^[-+]?\d[\d\s.]*([.,]\d+)?([eE][-+]?\d+)?$/;
const MOTIF_ANNEE = /^\d{4}$/;
const CLES_ANNEE = ['annee', 'exercice'];

const echec = (c: CodeErreurEvenement): never => {
  throw new ErreurEvenement(c);
};
const objet = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : echec('champ_manquant'));
const texte = (v: unknown): string => (typeof v === 'string' && v !== '' ? v : echec('champ_manquant'));

function verifierCharge(charge: Record<string, unknown>): void {
  for (const [cle, v] of Object.entries(charge)) {
    if (typeof v === 'number') echec('montant_interdit');
    if (typeof v === 'string' && MOTIF_NOMBRE.test(v.trim()) && !(CLES_ANNEE.includes(cle) && MOTIF_ANNEE.test(v))) echec('montant_interdit');
    if (cle.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase().split(/[_-]/).some((s) => SEGMENTS_INTERDITS.includes(s))) echec('champ_interdit');
    if (typeof v === 'string' ? v.includes('@') : v !== null && typeof v !== 'boolean') echec('champ_interdit');
  }
}

/** Valide une enveloppe brute et rend une copie gelée, ou lève ErreurEvenement. */
export function creerEnveloppe(brut: unknown): Enveloppe {
  const b = objet(brut);
  if (Object.keys(b).some((k) => !CLES.includes(k))) echec('champ_interdit');
  const [id, type, societe_id, objet_id, horodatage, correlation_id] = ['id', 'type', 'societe_id', 'objet_id', 'horodatage', 'correlation_id'].map((k) => texte(b[k]));
  if (b.exercice_id !== null) texte(b.exercice_id);
  const a = objet(b.acteur);
  if (Object.keys(a).some((k) => k !== 'type' && k !== 'id')) echec('champ_interdit');
  if (typeof a.type !== 'string' || !ACTEURS.includes(a.type)) echec('champ_manquant');
  const canal = b.canal;
  if (!estCanal(canal)) echec('champ_manquant');
  if (b.version === undefined) echec('champ_manquant');
  const version = b.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) echec('version_invalide');
  if (!MOTIF_TYPE.test(type!)) echec('type_invalide');
  if (!horodatage!.endsWith('Z') || Number.isNaN(Date.parse(horodatage!))) echec('horodatage_non_utc');
  const charge = objet(b.charge);
  verifierCharge(charge);
  return Object.freeze({
    id: id!, type: type!, societe_id: societe_id!, exercice_id: b.exercice_id as string | null, objet_id: objet_id!,
    version: version as number, acteur: Object.freeze({ type: a.type as TypeActeur, id: texte(a.id) }), canal: canal as Canal,
    horodatage: horodatage!, correlation_id: correlation_id!, charge: Object.freeze({ ...charge }) as Enveloppe['charge'],
  });
}
