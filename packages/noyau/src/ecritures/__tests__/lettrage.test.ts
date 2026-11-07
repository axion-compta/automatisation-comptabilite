import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { ErreurLettrage, lettrer, prochainCode, type LigneALettrer } from '../lettrage.js';

function ligne(id: string, debit: number, credit: number, extra: Partial<LigneALettrer> = {}): LigneALettrer {
  return { id, compte: '411', auxiliaire: 'CLIENT-FICTIF', debit: centimes(debit), credit: centimes(credit), ...extra };
}
function code(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurLettrage) return e.code;
    throw e;
  }
  return undefined;
}

describe('lettrage', () => {
  it('lettrage-total', () => {
    const r = lettrer([ligne('l1', 12000, 0), ligne('l2', 0, 7000), ligne('l3', 0, 5000)], 'A');
    expect(r.partiel).toBe(false);
    expect(r.reste).toBe(0);
    expect(r.code).toBe('A');
    expect(r.liens).toEqual([
      { ligneId: 'l1', code: 'A' },
      { ligneId: 'l2', code: 'A' },
      { ligneId: 'l3', code: 'A' },
    ]);
  });

  it('lettrage-partiel-reste', () => {
    const r = lettrer([ligne('l1', 12000, 0), ligne('l2', 0, 7000)], 'B');
    expect(r.partiel).toBe(true);
    expect(r.reste).toBe(5000);
    const inverse = lettrer([ligne('l1', 3000, 0), ligne('l2', 0, 8000)], 'B');
    expect(inverse.partiel).toBe(true);
    expect(inverse.reste).toBe(-5000);
  });

  it('comptes-differents-refuse', () => {
    expect(code(() => lettrer([ligne('l1', 100, 0), ligne('l2', 0, 100, { compte: '401' })], 'A'))).toBe(
      'comptes_differents',
    );
    expect(code(() => lettrer([ligne('l1', 100, 0), ligne('l2', 0, 100, { auxiliaire: 'AUTRE' })], 'A'))).toBe(
      'comptes_differents',
    );
    expect(code(() => lettrer([ligne('l1', 100, 0), ligne('l2', 0, 100, { auxiliaire: undefined })], 'A'))).toBe(
      'comptes_differents',
    );
    expect(code(() => lettrer([ligne('l1', 100, 0), ligne('l2', 50, 0), ligne('l3', 0, 150, { compte: '401' })], 'A'))).toBe(
      'comptes_differents',
    );
  });

  it('ligne-deja-lettree-refusee', () => {
    expect(code(() => lettrer([ligne('l1', 100, 0), ligne('l2', 0, 100, { lettre: 'A' })], 'B'))).toBe('deja_lettree');
    expect(code(() => lettrer([ligne('l1', 100, 0, { lettre: 'A' }), ligne('l2', 0, 100)], 'B'))).toBe('deja_lettree');
    expect(code(() => lettrer([ligne('l1', 100, 0)], 'B'))).toBe('moins_de_deux_lignes');
    expect(code(() => lettrer([], 'B'))).toBe('moins_de_deux_lignes');
    expect(code(() => lettrer([ligne('l1', 100, 0), ligne('l2', 0, 100)], 'a'))).toBe('code_invalide');
    expect(code(() => lettrer([ligne('l1', 100, 0), ligne('l2', 0, 100)], ''))).toBe('code_invalide');
    expect(code(() => lettrer([ligne('l1', 100, 0), ligne('l2', 0, 100)], 'A1'))).toBe('code_invalide');
    expect(code(() => lettrer([ligne('l1', 100, 0), ligne('l2', 0, 100)], '1A'))).toBe('code_invalide');
    expect(code(() => lettrer([ligne('l1', 100, 0), ligne('l2', 0, 100)], 'AB'))).toBeUndefined();
  });

  it('prochain-code-apres-z', () => {
    expect(prochainCode([])).toBe('A');
    expect(prochainCode(['A'])).toBe('B');
    expect(prochainCode(['B'])).toBe('A');
    expect(prochainCode(['A', 'C'])).toBe('B');
    const lettres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    expect(prochainCode(lettres)).toBe('AA');
    expect(prochainCode([...lettres, 'AA'])).toBe('AB');
    expect(prochainCode([...lettres, 'AA', 'AB', 'AC'])).toBe('AD');
    const colonneA = lettres.map((c) => 'A' + c);
    expect(prochainCode([...lettres, ...colonneA])).toBe('BA');
    const jusquaZZ = lettres.flatMap((a) => lettres.map((b) => a + b));
    expect(prochainCode([...lettres, ...jusquaZZ])).toBe('AAA');
    expect(prochainCode([...lettres, ...jusquaZZ, 'AAA'])).toBe('AAB');
    expect(prochainCode([...lettres.slice(0, 25)])).toBe('Z');
  });

  it('lignes-intactes', () => {
    const lignes = [ligne('l1', 12000, 0), ligne('l2', 0, 12000)];
    const avant = JSON.stringify(lignes);
    const r = lettrer(lignes, 'C');
    expect(JSON.stringify(lignes)).toBe(avant);
    expect(lignes[0]?.lettre).toBeUndefined();
    expect(r.liens.every((l) => Object.keys(l).sort().join() === 'code,ligneId')).toBe(true);
  });
});
