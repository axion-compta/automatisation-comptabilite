import { describe, expect, it } from 'vitest';
import {
  ErreurDoublons,
  empreinteLigne,
  fichierDejaImporte,
  lignesNouvelles,
  numeroterOccurrences,
  type EntreeEmpreinte,
} from '../doublons.js';

const base: EntreeEmpreinte = { compteId: 'c1', dateOperation: '2026-03-02', montant: -250, devise: 'EUR', libelleNormalise: 'CAFE' };
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return (e as ErreurDoublons).code;
  }
  return undefined;
};
// n lignes distinctes (jour = rang) à partir d'un rang de départ.
const jours = (debut: number, n: number) =>
  Array.from({ length: n }, (_, i) => ({
    ...base,
    dateOperation: `2026-04-${String(debut + i).padStart(2, '0')}`,
    libelleNormalise: `L${debut + i}`,
    rang: debut + i,
  }));
const num = (ls: ReturnType<typeof jours>) => numeroterOccurrences(ls);
const cafes = (n: number, debut: number) => Array.from({ length: n }, (_, i) => ({ ...base, rang: debut + i }));

describe('doublons', () => {
  it('t10-1-deux-cafes-deux-lignes', () => {
    const lues = num([...jours(1, 28), ...cafes(2, 29)]);
    expect(lues).toHaveLength(30);
    expect(lignesNouvelles([], lues)).toHaveLength(30);
    expect(lues.slice(-2).map((l) => l.occurrence)).toEqual([1, 2]);
    expect(lues[28]!.empreinte).toBe(lues[29]!.empreinte);
  });
  it('t10-1-reimport-zero', () => {
    const lues = num([...jours(1, 28), ...cafes(2, 29)]);
    expect(lignesNouvelles(lues, num([...jours(1, 28), ...cafes(2, 29)]))).toEqual([]);
    expect(lignesNouvelles([], [])).toEqual([]);
  });
  it('t10-2-chevauchement-trente-neuf', () => {
    const a = num(jours(1, 25));
    const nouvelles = lignesNouvelles(a, num(jours(12, 28)));
    expect(nouvelles).toHaveLength(14);
    expect(a.length + nouvelles.length).toBe(39);
    expect(nouvelles.map((l) => l.rang)).toEqual(Array.from({ length: 14 }, (_, i) => 26 + i));
  });
  it('t10-3-troisieme-occurrence', () => {
    const existantes = num(cafes(2, 1));
    const lues = num(cafes(3, 1));
    const nouvelles = lignesNouvelles(existantes, lues);
    expect(nouvelles).toHaveLength(1);
    expect(nouvelles[0]!.occurrence).toBe(3);
    expect(nouvelles[0]!.rang).toBe(3);
  });
  it('empreinte-stable', () => {
    expect(empreinteLigne(base)).toBe(empreinteLigne({ ...base }));
    expect(empreinteLigne(base)).toMatch(/^[0-9a-f]{64}$/);
    const norm = (s: string) => s.trim().toUpperCase();
    expect(empreinteLigne({ ...base, libelleNormalise: norm(' café ') })).toBe(empreinteLigne({ ...base, libelleNormalise: norm('CAFÉ') }));
    expect(empreinteLigne({ ...base, montant: 0 })).toMatch(/^[0-9a-f]{64}$/);
    expect(empreinteLigne({ ...base, libelleNormalise: '' })).not.toBe(empreinteLigne(base));
    for (const k of ['dateOperation', 'devise', 'libelleNormalise'] as const)
      expect(empreinteLigne({ ...base, [k]: 'x' })).not.toBe(empreinteLigne(base));
    expect(empreinteLigne({ ...base, montant: -251 })).not.toBe(empreinteLigne(base));
  });
  it('compte-different-empreinte-differente', () => {
    expect(empreinteLigne({ ...base, compteId: 'c2' })).not.toBe(empreinteLigne(base));
    for (const montant of [Number.NaN, Infinity, -Infinity, 1.5, 2 ** 60])
      expect(code(() => empreinteLigne({ ...base, montant }))).toBe('montant_invalide');
    expect(code(() => empreinteLigne({ ...base, libelleNormalise: 'a\u001fb' }))).toBe('separateur_interdit');
    expect(code(() => empreinteLigne({ ...base, compteId: 'c\u001f' }))).toBe('separateur_interdit');
    // sans échappement, ces deux entrées donneraient la même forme canonique
    expect(empreinteLigne({ ...base, devise: 'EUR', libelleNormalise: 'A' })).not.toBe(empreinteLigne({ ...base, devise: 'EURA', libelleNormalise: '' }));
    expect(code(() => numeroterOccurrences([{ ...base, montant: Number.NaN, rang: 1 }]))).toBe('montant_invalide');
  });
  it('fichier-deja-importe-date-rendue', () => {
    const connus = [{ empreinte: 'aa', recuLe: '2026-03-01T10:00:00Z' }, { empreinte: 'bb', recuLe: '2026-03-05T10:00:00Z' }];
    expect(fichierDejaImporte('bb', connus)).toEqual({ deja: true, recuLe: '2026-03-05T10:00:00Z' });
    expect(fichierDejaImporte('cc', connus)).toEqual({ deja: false });
    expect(fichierDejaImporte('aa', [])).toEqual({ deja: false });
  });
  it('ordre-des-rangs-fait-foi', () => {
    const ls = [...jours(1, 3), ...cafes(3, 4)];
    const melange = [ls[5]!, ls[0]!, ls[4]!, ls[2]!, ls[3]!, ls[1]!];
    const r = num(melange);
    expect(r).toEqual(num(ls));
    expect(r.map((l) => l.rang)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(r.slice(3).map((l) => l.occurrence)).toEqual([1, 2, 3]);
    expect(num([])).toEqual([]);
    const inverse = lignesNouvelles([], [...r].reverse());
    expect(inverse.map((l) => l.rang)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(lignesNouvelles(r.slice(0, 4), r).map((l) => l.rang)).toEqual([5, 6]);
  });
});
