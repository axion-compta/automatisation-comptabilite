// Affectation des comptes d'une balance aux postes d'un état (table passée en argument).
import { centimes, type Centimes } from '../argent/index.js';
import type { Balance } from '../livres/balance.js';

export class ErreurEtats extends Error {
  override name = 'ErreurEtats';
}

export interface PosteEtat {
  poste: string;
  cote: 'actif' | 'passif' | 'charges' | 'produits';
  prefixes: readonly string[];
  sens: 'debiteur' | 'crediteur' | 'tous';
}

export interface PosteAffecte {
  poste: string;
  cote: PosteEtat['cote'];
  montant: Centimes;
  comptes: string[];
}

export interface ResultatAffectation {
  postes: PosteAffecte[];
  nonAffectes: string[];
  ambigus: { compte: string; postes: string[] }[];
}

function comparer(a: string, b: string): number {
  if (a < b) return -1;
  return a > b ? 1 : 0;
}

function sensCorrespond(sens: PosteEtat['sens'], solde: number): boolean {
  if (sens === 'tous') return true;
  return sens === 'debiteur' ? solde > 0 : solde < 0;
}

export function affecterPostes(balance: Balance, table: readonly PosteEtat[]): ResultatAffectation {
  for (const p of table) {
    if (p.prefixes.some((x) => x === '')) {
      throw new ErreurEtats('Préfixe vide refusé pour le poste : ' + p.poste);
    }
  }
  const cumuls = new Map<PosteEtat, { montant: number; comptes: string[] }>();
  const nonAffectes: string[] = [];
  const ambigus: { compte: string; postes: string[] }[] = [];
  for (const l of balance.lignes) {
    if (l.solde === 0) continue;
    const trouves = table.filter(
      (p) => sensCorrespond(p.sens, l.solde) && p.prefixes.some((x) => l.compte.startsWith(x)),
    );
    const [seul] = trouves;
    if (seul === undefined) {
      nonAffectes.push(l.compte);
    } else if (trouves.length > 1) {
      ambigus.push({ compte: l.compte, postes: trouves.map((p) => p.poste).sort(comparer) });
    } else {
      const c = cumuls.get(seul) ?? { montant: 0, comptes: [] };
      c.montant += Math.abs(l.solde);
      c.comptes.push(l.compte);
      cumuls.set(seul, c);
    }
  }
  const postes = [...cumuls.entries()]
    .map(([p, c]) => ({
      poste: p.poste,
      cote: p.cote,
      montant: centimes(c.montant),
      comptes: c.comptes.sort(comparer),
    }))
    .sort((a, b) => comparer(a.poste, b.poste) || comparer(a.cote, b.cote));
  return {
    postes,
    nonAffectes: nonAffectes.sort(comparer),
    ambigus: ambigus.sort((a, b) => comparer(a.compte, b.compte)),
  };
}

export function preparationPossible(resultat: ResultatAffectation): boolean {
  return resultat.nonAffectes.length === 0 && resultat.ambigus.length === 0;
}
