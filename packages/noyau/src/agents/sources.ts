// Citations légales des agents : identifiants du registre des sources (DEC-001), jamais de valeur légale ici.
import { estDateValide } from '../dates/civiles.js';

export type Citation = { registre: 'DEC-001'; id: string; version: string };
export type EntreeRegistre = {
  id: string; version: string; source?: string; dateReleve?: string; lectures: number;
};
export type VerdictCitations =
  | { valide: true }
  | { valide: false; inconnues: string[]; malFormees: string[] };

const FORME = /^DEC-001:([A-Z0-9-]+)@(\S+)$/;

export function lireCitation(texte: string): Citation | null {
  const m = typeof texte === 'string' ? FORME.exec(texte) : null;
  return m?.[1] !== undefined && m[2] !== undefined ? { registre: 'DEC-001', id: m[1], version: m[2] } : null;
}

export function verifierCitations(citations: readonly string[], registre: readonly EntreeRegistre[]): VerdictCitations {
  const inconnues: string[] = [];
  const malFormees: string[] = [];
  for (const c of citations) {
    const lue = lireCitation(c);
    if (lue === null) malFormees.push(c);
    else if (!registre.some((e) => e.id === lue.id && e.version === lue.version)) inconnues.push(c);
  }
  return inconnues.length === 0 && malFormees.length === 0 ? { valide: true } : { valide: false, inconnues, malFormees };
}

/** « sourcée » : source officielle citée, date de relevé valide et deux lectures indépendantes au moins. */
export function statutAffiche(entree: EntreeRegistre): 'sourcee' | 'a_verifier' {
  const source = typeof entree.source === 'string' && entree.source.trim() !== '';
  const date = typeof entree.dateReleve === 'string' && estDateValide(entree.dateReleve);
  const lectures = Number.isSafeInteger(entree.lectures) && entree.lectures >= 2;
  return source && date && lectures ? 'sourcee' : 'a_verifier';
}
