import { ErreurPiece } from '../types.js';

export interface NumeroDecoupe {
  prefixe: string;
  nombre: bigint;
  largeur: number;
}

export function decouperNumero(n: string): NumeroDecoupe | null {
  const m = /^(.*?)(\d+)$/s.exec(n) as [string, string, string] | null;
  return m === null ? null : { prefixe: m[1], nombre: BigInt(m[2]), largeur: m[2].length };
}

export interface TrousSerie {
  trous: string[];
  tronque: boolean;
  ignores: string[];
}

export function trousDeSerie(numeros: string[], reglage: { sequentielle: boolean; trousMax: number }): TrousSerie {
  const { sequentielle, trousMax } = reglage;
  if (!Number.isInteger(trousMax) || trousMax < 0) throw new ErreurPiece('reglage_invalide', 'trousMax doit être un entier positif ou nul');
  if (!sequentielle) return { trous: [], tronque: false, ignores: [] };
  const decoupes = [...new Set(numeros)].sort().map((n) => ({ n, d: decouperNumero(n) }));
  const effectifs = new Map<string, number>();
  for (const { d } of decoupes) if (d !== null) effectifs.set(d.prefixe, (effectifs.get(d.prefixe) ?? 0) + 1);
  const prefixe = [...effectifs].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0];
  const gardes = decoupes.flatMap(({ d }) => (d !== null && d.prefixe === prefixe ? [d] : []));
  const ignores = decoupes.filter(({ d }) => d === null || d.prefixe !== prefixe).map(({ n }) => n);
  const nombres = [...new Set(gardes.map((d) => d.nombre))].sort((a, b) => (a < b ? -1 : 1));
  const largeur = Math.max(...gardes.map((d) => d.largeur));
  const trous: string[] = [];
  for (const [i, fin] of nombres.entries()) {
    for (let k = (nombres[i - 1] ?? fin) + 1n; k < fin; k++) {
      if (trous.length === trousMax) return { trous, tronque: true, ignores };
      trous.push(`${prefixe}${k.toString().padStart(largeur, '0')}`);
    }
  }
  return { trous, tronque: false, ignores };
}
