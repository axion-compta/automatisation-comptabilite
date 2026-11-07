// Affectation optimale (méthode hongroise) sur des coûts entiers : plus de paires d'abord, puis coût minimal.
export class ErreurAffectation extends Error {
  override name = 'ErreurAffectation';
}

export type Element = { readonly id: string; readonly cle: string };
export type Paire = { ligneId: string; pieceId: string; cout: number };
export type Affectation = { paires: Paire[]; coutTotal: number; unique: boolean };

const comparer = (a: Element, b: Element): number =>
  a.cle < b.cle ? -1 : a.cle > b.cle ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/** Hongroise carrée en entiers (additions et soustractions seulement) : colonne choisie par ligne. */
function hongroise(a: number[][], n: number): number[] {
  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(n + 1).fill(0);
  const p = new Array<number>(n + 1).fill(0);
  const way = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array<number>(n + 1).fill(Infinity);
    const utilise = new Array<boolean>(n + 1).fill(false);
    do {
      utilise[j0] = true;
      const i0 = p[j0] as number;
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (utilise[j]) continue;
        const cur = ((a[i0 - 1] as number[])[j - 1] as number) - (u[i0] as number) - (v[j] as number);
        if (cur < (minv[j] as number)) {
          minv[j] = cur;
          way[j] = j0;
        }
        if ((minv[j] as number) < delta) {
          delta = minv[j] as number;
          j1 = j;
        }
      }
      for (let j = 0; j <= n; j++) {
        if (utilise[j]) {
          u[p[j] as number] = (u[p[j] as number] as number) + delta;
          v[j] = (v[j] as number) - delta;
        } else minv[j] = (minv[j] as number) - delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0] as number;
      p[j0] = p[j1] as number;
      j0 = j1;
    } while (j0 !== 0);
  }
  const col = new Array<number>(n).fill(0);
  for (let j = 1; j <= n; j++) col[(p[j] as number) - 1] = j - 1;
  return col;
}

export function affecter(
  lignes: readonly Element[],
  pieces: readonly Element[],
  cout: (ligne: Element, piece: Element) => number | null,
  maximum: number,
): Affectation {
  if (!Number.isSafeInteger(maximum) || maximum < 1) throw new ErreurAffectation('maximum_invalide');
  const n = Math.max(lignes.length, pieces.length);
  if (n > maximum) throw new ErreurAffectation('trop_grand');
  const L = [...lignes].sort(comparer);
  const P = [...pieces].sort(comparer);
  const reel: (number | null)[][] = L.map((l) =>
    P.map((p) => {
      const c = cout(l, p);
      if (c === null) return null;
      if (!Number.isSafeInteger(c) || c < 0) throw new ErreurAffectation('cout_invalide');
      return c;
    }),
  );
  let grand = 1;
  for (const ligne of reel) for (const c of ligne) grand += c ?? 0;
  if (!Number.isSafeInteger(grand * (n + 1))) throw new ErreurAffectation('cout_invalide');
  const resoudre = (interdit: number): { col: number[]; objectif: number } => {
    const a = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        if (i >= L.length || j >= P.length) return 0;
        const c = (reel[i] as (number | null)[])[j] ?? null;
        return c === null || i * n + j === interdit ? grand : c;
      }),
    );
    const col = hongroise(a, n);
    return { col, objectif: col.reduce((s, j, i) => s + (a[i] as number[])[j]!, 0) };
  };
  const optimal = resoudre(-1);
  const paires: Paire[] = [];
  let coutTotal = 0;
  const retenues: number[] = [];
  optimal.col.forEach((j, i) => {
    const c = i < L.length && j < P.length ? ((reel[i] as (number | null)[])[j] ?? null) : null;
    if (c === null) return;
    paires.push({ ligneId: (L[i] as Element).id, pieceId: (P[j] as Element).id, cout: c });
    coutTotal += c;
    retenues.push(i * n + j);
  });
  const unique = retenues.every((k) => resoudre(k).objectif > optimal.objectif);
  return { paires, coutTotal, unique };
}
