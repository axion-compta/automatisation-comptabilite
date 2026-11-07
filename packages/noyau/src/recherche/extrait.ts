// Extrait échappé avec surlignage, tri, pages et groupes (spec 15, RE-R4).
// Le rendu ne produit que <mark> et </mark> comme balises ; le reste est échappé.
import { normaliser } from './requete.js';

export class ErreurExtrait extends Error {
  override name = 'ErreurExtrait';
  constructor(readonly code: 'curseur_invalide' | 'limite_invalide') {
    super(code);
  }
}

const ECHAPPEMENTS: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function echapperHtml(s: string): string {
  return s.replace(/[&<>"']/gu, (c) => ECHAPPEMENTS[c] ?? c);
}

const estMot = (c: string | undefined): boolean => c !== undefined && /[\p{L}\p{N}]/u.test(c);

/** Intervalles [début, fin[ (en points de code) des mots du texte qui correspondent. */
function trouver(cps: string[], mots: string[], prefixe: boolean): [number, number][] {
  const cibles = mots.map(normaliser).filter((m) => m !== '');
  const dernier = cibles.length - 1;
  const trouves: [number, number][] = [];
  let i = 0;
  while (i < cps.length) {
    if (!estMot(cps[i])) {
      i += 1;
      continue;
    }
    let j = i;
    while (estMot(cps[j])) j += 1;
    const mot = normaliser(cps.slice(i, j).join(''));
    if (cibles.some((c, k) => (prefixe && k === dernier ? mot.startsWith(c) : mot === c))) trouves.push([i, j]);
    i = j;
  }
  return trouves;
}

export function extrait(texte: string, mots: string[], prefixe: boolean, longueur: number): string {
  const cps = [...texte];
  const trouves = trouver(cps, mots, prefixe);
  const premier = trouves[0];
  const cible = premier?.[0] ?? 0;
  let debut = Math.max(0, cible - (longueur >> 2));
  while (debut > 0 && debut < cible && estMot(cps[debut - 1]) && estMot(cps[debut])) debut += 1;
  let fin = Math.min(cps.length, debut + longueur);
  const plancher = premier?.[1] ?? 0;
  while (fin < cps.length && fin > plancher && estMot(cps[fin - 1]) && estMot(cps[fin])) fin -= 1;
  if (fin < plancher) fin = plancher;
  while (fin > plancher && /\s/u.test(cps[fin - 1] ?? '')) fin -= 1;
  let rendu = '';
  let pos = debut;
  for (const [a, b] of trouves) {
    if (b <= debut || a >= fin) continue;
    const de = Math.max(a, pos);
    const jusque = Math.min(b, fin);
    rendu += echapperHtml(cps.slice(pos, de).join(''));
    rendu += `<mark>${echapperHtml(cps.slice(de, jusque).join(''))}</mark>`;
    pos = jusque;
  }
  return rendu + echapperHtml(cps.slice(pos, fin).join(''));
}

export type Resultat = { score: number; date: string; id: string };

const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export function trier<T extends Resultat>(resultats: readonly T[]): T[] {
  return [...resultats].sort(
    (a, b) => b.score - a.score || compare(b.date, a.date) || compare(a.id, b.id),
  );
}

const entierPositif = (n: number): boolean => Number.isSafeInteger(n) && n >= 0;

function lireCurseur(curseur: string, taille: number): number {
  const invalide = (): never => {
    throw new ErreurExtrait('curseur_invalide');
  };
  if (!/^[A-Za-z0-9_-]+$/u.test(curseur)) return invalide();
  const brut = Buffer.from(curseur, 'base64url');
  if (brut.toString('base64url') !== curseur) return invalide();
  let valeur: unknown;
  try {
    valeur = JSON.parse(brut.toString('utf8'));
  } catch {
    return invalide();
  }
  const d = (valeur as { d?: unknown } | null)?.d;
  return typeof d === 'number' && entierPositif(d) && d <= taille ? d : invalide();
}

export function paginer<T>(
  liste: readonly T[],
  options: { limite: number; curseur?: string | undefined },
): { elements: T[]; curseurSuivant?: string } {
  const { limite, curseur } = options;
  if (!Number.isSafeInteger(limite) || limite < 1) throw new ErreurExtrait('limite_invalide');
  const debut = curseur === undefined ? 0 : lireCurseur(curseur, liste.length);
  const fin = debut + limite;
  const elements = liste.slice(debut, fin);
  if (fin >= liste.length) return { elements };
  return { elements, curseurSuivant: Buffer.from(JSON.stringify({ d: fin })).toString('base64url') };
}

export function grouper<T extends { type: string }>(liste: readonly T[], parType: number): Map<string, T[]> {
  if (!Number.isSafeInteger(parType) || parType < 1) throw new ErreurExtrait('limite_invalide');
  const groupes = new Map<string, T[]>();
  for (const x of liste) {
    const g = groupes.get(x.type) ?? [];
    if (g.length < parType) g.push(x);
    groupes.set(x.type, g);
  }
  return groupes;
}
