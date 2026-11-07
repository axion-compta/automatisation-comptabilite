// Comparaison de deux états à un champ près (le canal) et empreinte stable.
import { createHash } from 'node:crypto';

export class ErreurParite extends Error {
  override name = 'ErreurParite';
  readonly code = 'valeur_non_serialisable';
}
const IGNORER_PAR_DEFAUT: readonly string[] = ['canal'];
const tableau = (v: unknown): v is readonly unknown[] => Array.isArray(v);
function objetSimple(v: unknown): v is Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const proto: unknown = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}
const cles = (o: Record<string, unknown>, ignorer: readonly string[]): string[] =>
  Object.keys(o).filter((k) => !ignorer.includes(k)).sort();
function canonique(v: unknown, ignorer: readonly string[], pile: readonly unknown[]): string {
  if (v === null) return 'null';
  if (typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new ErreurParite('Nombre non fini.');
    return JSON.stringify(v);
  }
  if (typeof v !== 'object') throw new ErreurParite(`Type non sérialisable : ${typeof v}.`);
  if (pile.includes(v)) throw new ErreurParite('Référence circulaire.');
  const suite = [...pile, v];
  if (tableau(v)) return `[${v.map((x) => canonique(x, ignorer, suite)).join(',')}]`;
  if (!objetSimple(v)) throw new ErreurParite('Objet non simple.');
  const morceaux = cles(v, ignorer).map((k) => `${JSON.stringify(k)}:${canonique(v[k], ignorer, suite)}`);
  return `{${morceaux.join(',')}}`;
}
export const etatCanonique = (valeur: unknown, ignorer: readonly string[] = IGNORER_PAR_DEFAUT): string =>
  canonique(valeur, ignorer, []);
function comparer(a: unknown, b: unknown, ignorer: readonly string[], chemin: string, sortie: string[]): void {
  if (tableau(a) && tableau(b)) {
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i += 1) {
      const sous = `${chemin}[${String(i)}]`;
      if (i >= a.length || i >= b.length) sortie.push(sous);
      else comparer(a[i], b[i], ignorer, sous, sortie);
    }
    return;
  }
  if (objetSimple(a) && objetSimple(b)) {
    const toutes = [...new Set([...cles(a, ignorer), ...cles(b, ignorer)])];
    for (const k of toutes) {
      const sous = chemin === '' ? k : `${chemin}.${k}`;
      if (!(k in a) || !(k in b)) sortie.push(sous);
      else comparer(a[k], b[k], ignorer, sous, sortie);
    }
    return;
  }
  if (canonique(a, ignorer, []) !== canonique(b, ignorer, [])) sortie.push(chemin === '' ? '(racine)' : chemin);
}
export function differences(a: unknown, b: unknown, ignorer: readonly string[] = IGNORER_PAR_DEFAUT): string[] {
  etatCanonique(a, ignorer);
  etatCanonique(b, ignorer);
  const sortie: string[] = [];
  comparer(a, b, ignorer, '', sortie);
  return sortie.sort();
}
export const memeEtatHorsCanal = (a: unknown, b: unknown): boolean => etatCanonique(a) === etatCanonique(b);
export const empreinteEtat = (valeur: unknown): string =>
  createHash('sha256').update(etatCanonique(valeur), 'utf8').digest('hex');
