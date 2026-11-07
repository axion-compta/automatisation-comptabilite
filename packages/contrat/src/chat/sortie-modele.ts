import { validerEntree } from './outils.js';

export type CodeRejet = 'hors_schema' | 'outil_hors_liste' | 'parametre_invalide';
export type SortieModele =
  | { sorte: 'outil'; outil: string; arguments: unknown }
  | { sorte: 'texte'; texte: string }
  | { sorte: 'rejet'; code: CodeRejet };
export type SortieAvecEssai = SortieModele | { sorte: 'sans_modele' };

const HORS_SCHEMA: SortieModele = { sorte: 'rejet', code: 'hors_schema' };
const BALISES = /```(?:json)?[ \t]*\r?\n([\s\S]*?)```/i;

function extraire(texte: string): string {
  const balise = BALISES.exec(texte);
  return (balise?.[1] ?? texte).trim();
}

function lire(brut: string): { json: true; valeur: unknown } | { json: false } {
  const debut = brut.charAt(0);
  try {
    return { json: true, valeur: JSON.parse(brut) as unknown };
  } catch {
    return debut === '{' || debut === '[' ? { json: true, valeur: undefined } : { json: false };
  }
}

export function analyserSortie(texte: string, outilsPermis: readonly string[]): SortieModele {
  const brut = extraire(texte);
  if (brut === '') return HORS_SCHEMA;
  const lu = lire(brut);
  if (!lu.json) return { sorte: 'texte', texte };
  const v = lu.valeur;
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return HORS_SCHEMA;
  const cles = Object.keys(v).sort();
  const { outil, arguments: args } = v as { outil?: unknown; arguments?: unknown };
  if (cles.join() !== 'arguments,outil' || typeof outil !== 'string') return HORS_SCHEMA;
  if (!outilsPermis.includes(outil)) return { sorte: 'rejet', code: 'outil_hors_liste' };
  const r = validerEntree(outil, args);
  return r.ok ? { sorte: 'outil', outil, arguments: r.valeur } : { sorte: 'rejet', code: r.code };
}

export async function avecUnNouvelEssai(
  appeler: () => Promise<string>,
  outilsPermis: readonly string[],
): Promise<SortieAvecEssai> {
  const premier = analyserSortie(await appeler(), outilsPermis);
  if (premier.sorte !== 'rejet' || premier.code !== 'hors_schema') return premier;
  const second = analyserSortie(await appeler(), outilsPermis);
  return second.sorte === 'rejet' && second.code === 'hors_schema' ? { sorte: 'sans_modele' } : second;
}
