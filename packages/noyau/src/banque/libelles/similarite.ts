export class ErreurSimilarite extends Error {
  constructor(readonly code: 'seuil_invalide') {
    super(code);
    this.name = 'ErreurSimilarite';
  }
}

const MAX = 10000;

export function trigrammes(texte: string): Set<string> {
  const p = `  ${texte} `;
  const s = new Set<string>();
  for (let i = 0; i + 3 <= p.length; i++) s.add(p.slice(i, i + 3));
  return s;
}

// Taille de l'intersection et de l'union ; [0, 1] si un texte est vide (jamais « identiques »).
function comptes(a: string, b: string): [number, number] {
  if (a === '' || b === '') return [0, 1];
  const ta = trigrammes(a);
  const tb = trigrammes(b);
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return [inter, ta.size + tb.size - inter];
}

function points([inter, union]: [number, number]): number {
  let bas = 0;
  let haut = MAX;
  while (bas < haut) {
    const k = (bas + haut + 1) >> 1;
    if (k * union <= MAX * inter) bas = k;
    else haut = k - 1;
  }
  return bas;
}

export function similarite(a: string, b: string): number {
  return points(comptes(a, b));
}

const triMots = (s: string) => s.split(' ').filter((m) => m !== '').sort().join(' ');

export function similariteMots(a: string, b: string): number {
  return Math.max(similarite(a, b), points(comptes(triMots(a), triMots(b))));
}

export function atteint(a: string, b: string, seuilPb: number): boolean {
  if (!Number.isInteger(seuilPb) || seuilPb < 0 || seuilPb > MAX) throw new ErreurSimilarite('seuil_invalide');
  return [comptes(a, b), comptes(triMots(a), triMots(b))].some(([i, u]) => i * MAX >= seuilPb * u);
}
