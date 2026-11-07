import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ErreurParite, differences, empreinteEtat, etatCanonique, memeEtatHorsCanal } from '../parite.js';

function codeErreur(f: () => unknown): string | undefined {
  try {
    f();
  } catch (e) {
    if (e instanceof ErreurParite) return e.code;
    throw e;
  }
  return undefined;
}

function historique(canal: string): unknown {
  return {
    id: 'h1',
    canal,
    action: 'corriger',
    lignes: [
      { compte: '606000', debit: 10000, credit: 0 },
      { compte: '445660', debit: 2000, credit: 0 },
      { compte: '401000', debit: 0, credit: 12000 },
    ],
  };
}

describe('parite entre deux etats hors canal', () => {
  it('seul-canal-differe-egal', () => {
    const a = historique('ecran');
    const b = historique('chat');
    expect(memeEtatHorsCanal(a, b)).toBe(true);
    expect(differences(a, b)).toEqual([]);
    expect(etatCanonique(a)).toBe(etatCanonique(b));
    expect(etatCanonique(a)).not.toContain('canal');
    // sans l'ignorer, le canal fait la différence
    expect(differences(a, b, [])).toEqual(['canal']);
    expect(etatCanonique({ canal: 'x', a: 1 }, [])).toBe('{"a":1,"canal":"x"}');
  });

  it('autre-champ-differe', () => {
    const a = historique('ecran') as { lignes: { compte: string }[] };
    const b = JSON.parse(JSON.stringify(a)) as typeof a;
    b.lignes[2]!.compte = '401100';
    expect(memeEtatHorsCanal(a, b)).toBe(false);
    expect(differences(a, b)).toEqual(['lignes[2].compte']);
    expect(differences({ x: 1 }, { x: 1, y: 2 })).toEqual(['y']);
    expect(differences({ x: 1, y: 2 }, { x: 1 })).toEqual(['y']);
    expect(differences({ b: 1, a: 1 }, { b: 2, a: 2 })).toEqual(['a', 'b']);
    expect(differences({ l: [1, 2] }, { l: [1, 2, 3] })).toEqual(['l[2]']);
    expect(differences({ l: [1, 2, 3] }, { l: [1, 2] })).toEqual(['l[2]']);
    expect(differences({ x: { y: 1 } }, { x: 5 })).toEqual(['x']);
    expect(differences({ x: [1] }, { x: { 0: 1 } })).toEqual(['x']);
    expect(differences({ x: null }, { x: 0 })).toEqual(['x']);
    expect(differences({ x: 1 }, { x: '1' })).toEqual(['x']);
    expect(differences(1, 2)).toEqual(['(racine)']);
    expect(differences(1, 1)).toEqual([]);
    expect(differences({ p: { q: [{ r: 1 }] } }, { p: { q: [{ r: 2 }] } })).toEqual(['p.q[0].r']);
  });

  it('ordre-des-cles-sans-effet', () => {
    expect(etatCanonique({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
    expect(memeEtatHorsCanal({ b: 1, a: 2 }, { a: 2, b: 1 })).toBe(true);
    expect(differences({ b: 1, a: 2 }, { a: 2, b: 1 })).toEqual([]);
    expect(etatCanonique([])).toBe('[]');
    expect(etatCanonique({})).toBe('{}');
    expect(etatCanonique('é"')).toBe('"é\\""');
    expect(etatCanonique(null)).toBe('null');
    expect(etatCanonique(true)).toBe('true');
  });

  it('canal-profond-ignore', () => {
    const a = { lignes: [{ canal: 'ecran', compte: '1' }, { compte: '2', detail: { canal: 'x', v: 1 } }] };
    const b = { lignes: [{ canal: 'chat', compte: '1' }, { compte: '2', detail: { canal: 'y', v: 1 } }] };
    expect(memeEtatHorsCanal(a, b)).toBe(true);
    expect(etatCanonique(a)).toBe('{"lignes":[{"compte":"1"},{"compte":"2","detail":{"v":1}}]}');
    expect(etatCanonique(a, ['detail', 'canal'])).toBe('{"lignes":[{"compte":"1"},{"compte":"2"}]}');
    expect(differences({ l: [{ canal: 1 }] }, { l: [{ canal: 2 }] })).toEqual([]);
    // une clé ignorée n'est pas contrôlée
    expect(etatCanonique({ canal: undefined, a: 1 })).toBe('{"a":1}');
    expect(memeEtatHorsCanal({ canal: 1, a: 1 }, { a: 1 })).toBe(true);
  });

  it('ordre-des-tableaux-compte', () => {
    expect(memeEtatHorsCanal({ l: [1, 2] }, { l: [2, 1] })).toBe(false);
    expect(differences({ l: [1, 2] }, { l: [2, 1] })).toEqual(['l[0]', 'l[1]']);
    expect(etatCanonique([2, 1])).toBe('[2,1]');
  });

  it('valeurs-non-serialisables-refusees', () => {
    const circ: Record<string, unknown> = { a: 1 };
    circ['soi'] = circ;
    const circTab: unknown[] = [];
    circTab.push(circTab);
    const mauvaises: unknown[] = [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      undefined,
      1n,
      circ,
      circTab,
      () => 1,
      Symbol('s'),
      new Date(0),
      new Map(),
      { a: [1, { b: Number.NaN }] },
      { a: undefined },
      [undefined],
      { a: { b: { c: 1n } } },
    ];
    for (const v of mauvaises) {
      expect(codeErreur(() => etatCanonique(v))).toBe('valeur_non_serialisable');
      expect(codeErreur(() => empreinteEtat(v))).toBe('valeur_non_serialisable');
      expect(codeErreur(() => differences(v, 1))).toBe('valeur_non_serialisable');
      expect(codeErreur(() => differences(1, v))).toBe('valeur_non_serialisable');
      expect(codeErreur(() => memeEtatHorsCanal(v, v))).toBe('valeur_non_serialisable');
    }
    // une même sous-structure partagée sans cycle reste acceptée
    const partage = { v: 1 };
    expect(etatCanonique({ a: partage, b: partage })).toBe('{"a":{"v":1},"b":{"v":1}}');
    expect(etatCanonique(Object.create(null) as object)).toBe('{}');
  });

  it('empreinte-stable', () => {
    const a = { montant: 12000, compte: '401000', canal: 'ecran' };
    const b = { canal: 'chat', compte: '401000', montant: 12000 };
    expect(empreinteEtat(a)).toBe(empreinteEtat(b));
    expect(empreinteEtat(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(empreinteEtat(a)).toBe(createHash('sha256').update('{"compte":"401000","montant":12000}', 'utf8').digest('hex'));
    expect(empreinteEtat({ ...a, montant: 12001 })).not.toBe(empreinteEtat(a));
    expect(empreinteEtat({ ...a, montant: 11999 })).not.toBe(empreinteEtat(a));
  });
});
