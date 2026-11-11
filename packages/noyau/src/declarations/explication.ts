// Explication « D'où vient ce montant ? » : l'IA reçoit une entrée pseudonymisée sans aucun chiffre,
// et tout chiffre du texte rendu passe par une référence {{ref:…}}. Elle explique, elle ne valide rien.
import { pseudonymiser, retablir } from '../banque/libelles/pseudonymiser.js';
import { resoudre, type Resultats, type Segment } from '../chat/references.js';
import type { Ecriture } from '../ecritures/modele.js';
import { marquerGenereParIA } from '../securite/marqueur-ia.js';
import type { CaseDeclaration } from './cases.js';

export type CodeErreurExplication = 'source_introuvable' | 'montant_invalide';

export class ErreurExplication extends Error {
  override name = 'ErreurExplication';
  readonly code: CodeErreurExplication;
  constructor(code: CodeErreurExplication, message: string) {
    super(message);
    this.code = code;
  }
}

export interface PortModele {
  completer(entree: string): Promise<{ texte: string; modele: string; version: string }>;
}

export type CodeRejet = 'vide' | 'trop_long' | 'reference_inconnue' | 'chiffre_hors_reference' | 'aucune_ecriture_citee';
export type VerificationExplication = { ok: true; segments: Segment[] } | { ok: false; code: CodeRejet };
export interface EtapeSource {
  reference: string;
  ecritureId: string;
  date: string;
  compte: string;
  montant: number;
}
export type ResultatExplication =
  | { sorte: 'ia'; segments: Segment[]; meta: Record<string, unknown> }
  | { sorte: 'sans_modele'; etapes: EtapeSource[] };

const TENTATIVES = ['premiere', 'nouvel_essai'] as const;
const CHIFFRE = /\d/;
const JETON = /\[(?:IBAN|CARTE|PERSONNE)_\d+\]/g;

function montantSur(m: number): number {
  if (!Number.isSafeInteger(m)) throw new ErreurExplication('montant_invalide', 'Montant non entier ou hors limite.');
  return m;
}

export function preparerEntree(
  c: CaseDeclaration,
  ecritures: readonly Ecriture[],
  personnes: readonly string[],
): { entree: string; resultats: Resultats; table: Map<string, string>; etapes: EtapeSource[] } {
  const resultats: Resultats = {
    case: { montant: { valeur: montantSur(c.montant), nature: 'montant', source: { type: 'case', id: c.code } } },
  };
  const etapes: EtapeSource[] = [];
  const libelles: string[] = [];
  c.sources.forEach((s, i) => {
    const e = ecritures.find((x) => x.id === s.ecritureId);
    const l = e?.lignes[s.ligneIndex];
    if (e === undefined || l === undefined) throw new ErreurExplication('source_introuvable', 'Écriture source absente des écritures fournies.');
    const reference = `e${i + 1}`;
    const montant = montantSur(l.debit !== 0 ? l.debit : l.credit);
    const source = { type: 'ecriture', id: e.id };
    resultats[reference] = {
      montant: { valeur: montant, nature: 'montant', source },
      date: { valeur: e.date, nature: 'date', source },
      compte: { valeur: l.compte, nature: 'compte', source },
    };
    etapes.push({ reference, ecritureId: e.id, date: e.date, compte: l.compte, montant });
    libelles.push(l.libelle);
  });
  const { textes, table } = pseudonymiser(libelles, personnes);
  const lignes = textes.map((t, i) => `e${i + 1} : ${t}`);
  return { entree: [`Case ${c.code}`, ...lignes].join('\n'), resultats, table, etapes };
}

export function verifierExplication(
  texte: string,
  resultats: Resultats,
  c: CaseDeclaration,
  table: Map<string, string>,
  longueurMax: number,
): VerificationExplication {
  if (texte.trim() === '') return { ok: false, code: 'vide' };
  if (!(texte.length <= longueurMax)) return { ok: false, code: 'trop_long' };
  const brut = resoudre(texte, resultats);
  if (brut.some((s) => s.sorte === 'inconnu')) return { ok: false, code: 'reference_inconnue' };
  const libre = (t: string): string => t.split(c.code).join(' ').replace(JETON, (j) => (table.has(j) ? ' ' : j));
  if (brut.some((s) => s.sorte === 'texte' && CHIFFRE.test(libre(s.texte)))) return { ok: false, code: 'chiffre_hors_reference' };
  const citee = brut.some((s) => s.sorte === 'valeur' && s.source.type === 'ecriture');
  if (c.sources.length > 0 && !citee) return { ok: false, code: 'aucune_ecriture_citee' };
  const segments = brut.map((s): Segment => (s.sorte === 'texte' ? { sorte: 'texte', texte: retablir(s.texte, table) } : s));
  return { ok: true, segments };
}

export async function expliquerCase(
  port: PortModele,
  c: CaseDeclaration,
  ecritures: readonly Ecriture[],
  personnes: readonly string[],
  reglage: { longueurMax: number },
): Promise<ResultatExplication> {
  const { entree, resultats, table, etapes } = preparerEntree(c, ecritures, personnes);
  for (const tentative of TENTATIVES) {
    if (tentative === undefined) break;
    try {
      const r = await port.completer(entree);
      const v = verifierExplication(r.texte, resultats, c, table, reglage.longueurMax);
      if (v.ok) return { sorte: 'ia', segments: v.segments, meta: marquerGenereParIA({}, { modele: r.modele, version: r.version }) };
    } catch {
      break;
    }
  }
  return { sorte: 'sans_modele', etapes };
}
