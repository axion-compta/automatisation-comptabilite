// Dates frontières d'un catalogue de paramètres (spec 09 §03 règle 5). Aucune valeur légale ici.
import { ErreurParametre, parametreAuJour, type ParametreLegal } from './au-jour.js';

export class ErreurFrontiere extends Error {
  readonly code = 'date_invalide';
  constructor(detail: string) {
    super(`date_invalide : ${detail}`);
    this.name = 'ErreurFrontiere';
  }
}

function pad(n: number, l: number): string {
  return String(n).padStart(l, '0');
}

function jourVoisin(date: string, n: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (m === null) throw new ErreurFrontiere(date);
  const [a, mo, j] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(2000, 0, 1));
  d.setUTCFullYear(a, mo - 1, j);
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== j) throw new ErreurFrontiere(date);
  d.setUTCDate(d.getUTCDate() + n);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1, 2)}-${pad(d.getUTCDate(), 2)}`;
}

export function datesFrontieres(effetDebut: string): { veille: string; jour: string; lendemain: string } {
  return { veille: jourVoisin(effetDebut, -1), jour: jourVoisin(effetDebut, 0), lendemain: jourVoisin(effetDebut, 1) };
}

export type EcartFrontiere = { cle: string; effet_debut: string; date: string; attendu: string; obtenu: string };

function lire(catalogue: readonly ParametreLegal[], cle: string, pays: string, date: string): ParametreLegal | string {
  try {
    return parametreAuJour(catalogue, cle, pays, date);
  } catch (e) {
    if (e instanceof ErreurParametre) return e.code;
    throw e;
  }
}

/** Écarts à la veille, au jour et au lendemain de chaque `effet_debut` (lignes non retirées du pays). */
export function verifierFrontieres(catalogue: readonly ParametreLegal[], pays: string): EcartFrontiere[] {
  const lignes = catalogue.filter((p) => p.pays === pays && p.statut !== 'retire');
  const ecarts: EcartFrontiere[] = [];
  for (const l of lignes) {
    const f = datesFrontieres(l.effet_debut);
    const precedente = lignes
      .filter((p) => p.cle === l.cle && p.effet_debut < l.effet_debut)
      .sort((a, b) => (a.effet_debut < b.effet_debut ? 1 : -1))[0];
    const cas: [string, ParametreLegal | undefined][] = [
      [f.veille, precedente],
      [f.jour, l],
      [f.lendemain, l],
    ];
    for (const [date, attendu] of cas) {
      const r = lire(lignes, l.cle, pays, date);
      const ok = attendu === undefined ? r === 'parametre_absent' : r === attendu;
      if (ok) continue;
      ecarts.push({
        cle: l.cle,
        effet_debut: l.effet_debut,
        date,
        attendu: attendu === undefined ? 'parametre_absent' : attendu.effet_debut,
        obtenu: typeof r === 'string' ? r : r.effet_debut,
      });
    }
  }
  return ecarts;
}
