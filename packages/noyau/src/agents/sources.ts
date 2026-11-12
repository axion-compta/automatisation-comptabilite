// Citations légales des agents : identifiants du registre des sources (DEC-001), jamais de valeur légale ici.
import { estDateValide } from '../dates/civiles.js';

export type Citation = { registre: 'DEC-001'; id: string; version: string };
export type EntreeRegistre = {
  id: string; version: string; source?: string; dateReleve?: string; lectures: number;
  /** Premier jour de validité (inclus), AAAA-MM-JJ. */
  debutValidite?: string;
  /** Premier jour sans validité (exclu), AAAA-MM-JJ. */
  finValidite?: string;
};
export type VerdictCitations =
  | { valide: true }
  | { valide: false; inconnues: string[]; malFormees: string[]; perimees?: string[] };

const FORME = /^DEC-001:([A-Z0-9-]+)@(\S+)$/;

export function lireCitation(texte: string): Citation | null {
  const m = typeof texte === 'string' ? FORME.exec(texte) : null;
  return m?.[1] !== undefined && m[2] !== undefined ? { registre: 'DEC-001', id: m[1], version: m[2] } : null;
}

function couvre(e: EntreeRegistre, date: string): boolean {
  if (e.debutValidite !== undefined && date < e.debutValidite) return false;
  return e.finValidite === undefined || date < e.finValidite;
}

/** Avec `dateOperation` (AAAA-MM-JJ), une entrée dont la validité ne couvre pas la date est « périmée ». */
export function verifierCitations(
  citations: readonly string[], registre: readonly EntreeRegistre[], dateOperation?: string,
): VerdictCitations {
  const inconnues: string[] = [];
  const malFormees: string[] = [];
  const perimees: string[] = [];
  for (const c of citations) {
    const lue = lireCitation(c);
    if (lue === null) malFormees.push(c);
    else {
      const trouvees = registre.filter((e) => e.id === lue.id && e.version === lue.version);
      if (trouvees.length === 0) inconnues.push(c);
      else if (dateOperation !== undefined && !trouvees.some((e) => couvre(e, dateOperation))) perimees.push(c);
    }
  }
  if (inconnues.length === 0 && malFormees.length === 0 && perimees.length === 0) return { valide: true };
  return dateOperation === undefined
    ? { valide: false, inconnues, malFormees }
    : { valide: false, inconnues, malFormees, perimees };
}

/** « sourcée » : source officielle citée, date de relevé valide et deux lectures indépendantes au moins. */
export function statutAffiche(entree: EntreeRegistre): 'sourcee' | 'a_verifier' {
  const source = typeof entree.source === 'string' && entree.source.trim() !== '';
  const date = typeof entree.dateReleve === 'string' && estDateValide(entree.dateReleve);
  const lectures = Number.isSafeInteger(entree.lectures) && entree.lectures >= 2;
  return source && date && lectures ? 'sourcee' : 'a_verifier';
}
