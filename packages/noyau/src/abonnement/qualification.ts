// Qualification du client avant la vente : questionnaire fermé, documents à joindre, réponse archivée (ajout seul).
// Règle prudente : EI, SCI et tout client « non professionnel » reçoivent la clause de rétractation, sans chercher le lieu de la vente.
import { empreinteSha256 } from '../documents/empreinte.js';
import { documentEnVigueur, type DocumentContractuel } from './documents.js';
import { ErreurAbonnement, verifierHorodatage } from './types.js';

export const FORMES = ['EI', 'SCI', 'SARL', 'SAS', 'autre'] as const;
export const QUESTIONS = [
  { id: 'activite_professionnelle', choix: ['oui', 'non'] },
  { id: 'forme', choix: FORMES },
] as const;
export const TYPE_CLAUSE = 'clause_retractation';

export type Reponses = { activite_professionnelle: 'oui' | 'non'; forme: (typeof FORMES)[number] };
export type Qualification = { professionnel: boolean; documentsAJoindre: string[] };
export type ReponseArchivee = Readonly<{
  organisation: string; personne: string; reponses: Reponses; documents: readonly { type: string; version: number; empreinte: string }[];
  le: string; empreinte: string;
}>;

const invalide = (): ErreurAbonnement => new ErreurAbonnement('parametre_invalide');
const vide = (s: unknown): boolean => typeof s !== 'string' || s.trim() === '';

function verifierReponses(r: unknown): asserts r is Reponses {
  if (typeof r !== 'object' || r === null || Array.isArray(r)) throw invalide();
  const o = r as Record<string, unknown>;
  const ok = Object.keys(o).length === QUESTIONS.length && QUESTIONS.every((q) => (q.choix as readonly unknown[]).includes(o[q.id]));
  if (!ok) throw invalide();
}

export function qualifier(reponses: Reponses): Qualification {
  verifierReponses(reponses);
  const professionnel = reponses.activite_professionnelle === 'oui';
  const clause = !professionnel || reponses.forme === 'EI' || reponses.forme === 'SCI';
  return { professionnel, documentsAJoindre: clause ? [TYPE_CLAUSE] : [] };
}

const serialiser = (v: unknown): string =>
  Array.isArray(v) ? `[${v.map(serialiser).join(',')}]`
    : typeof v === 'object' && v !== null
      ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${serialiser((v as Record<string, unknown>)[k])}`).join(',')}}`
      : JSON.stringify(v);

export function archiverReponse(o: {
  organisation: string; personne: string; reponses: Reponses; documents: readonly DocumentContractuel[]; le: string;
}): ReponseArchivee {
  if (vide(o.organisation) || vide(o.personne)) throw invalide();
  verifierHorodatage(o.le);
  const { documentsAJoindre } = qualifier(o.reponses);
  const joints = documentsAJoindre.map((type) => {
    const d = documentEnVigueur(o.documents, type, o.le.slice(0, 10));
    if (d === null) throw new ErreurAbonnement('document_absent');
    return { type, version: d.version, empreinte: d.empreinte };
  });
  const corps = { organisation: o.organisation, personne: o.personne, reponses: Object.freeze({ ...o.reponses }), documents: Object.freeze(joints.map((j) => Object.freeze(j))), le: o.le };
  return Object.freeze({ ...corps, empreinte: empreinteSha256(serialiser(corps)) });
}
