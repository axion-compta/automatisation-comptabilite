import { describe, expect, it } from 'vitest';
import type { Centimes } from '../../argent/index.js';
import { aCreer, cleDedoublonnage, dedoublonner } from '../dedoublonnage.js';

const ttc = (n: number): Centimes => n as Centimes;
const base = { sirenVendeur: '123456782', numero: 'F-2026-0047', dateFacture: '2026-02-10', ttc: ttc(12000) };
const cle = (o: Partial<{ sirenVendeur: string; numero: string; dateFacture: string; ttc: Centimes }> = {}): string | null =>
  cleDedoublonnage({ ...base, ...o });
const K = cle() as string;

describe('dedoublonnage ventes', () => {
  it('v20-deux-canaux-une-piece', () => {
    const r = dedoublonner([
      { id: 'depot', recuLe: '2026-02-10T08:00:00Z', cle: K },
      { id: 'plateforme', recuLe: '2026-02-11T08:00:00Z', cle: K },
    ]);
    expect(r).toEqual({ gardees: ['depot'], doublons: [{ id: 'plateforme', doublonDe: 'depot' }] });
    expect(dedoublonner([])).toEqual({ gardees: [], doublons: [] });
    const trois = dedoublonner([
      { id: 'a', recuLe: '1', cle: K },
      { id: 'b', recuLe: '2', cle: K },
      { id: 'c', recuLe: '3', cle: 'autre' },
    ]);
    expect(trois.gardees).toEqual(['a', 'c']);
    expect(trois.doublons).toEqual([{ id: 'b', doublonDe: 'a' }]);
  });

  it('v22-reimport-zero-cree', () => {
    const connues = new Set([K]);
    expect(aCreer(connues, [{ cle: K }])).toEqual([]);
    expect(aCreer(new Set(), [])).toEqual([]);
    const nouvelle = cle({ numero: 'F-2026-0048' });
    expect(aCreer(connues, [{ cle: K }, { cle: nouvelle }, { cle: nouvelle }])).toEqual([{ cle: nouvelle }]);
    expect(aCreer(connues, [{ cle: null }, { cle: null }])).toEqual([{ cle: null }, { cle: null }]);
  });

  it('numero-different-pas-doublon', () => {
    expect(cle({ numero: 'F-2026-0048' })).not.toBe(K);
    expect(cle({ sirenVendeur: '987654321' })).not.toBe(K);
    expect(cle({ dateFacture: '2026-02-11' })).not.toBe(K);
  });

  it('ttc-different-pas-doublon', () => {
    expect(cle({ ttc: ttc(12001) })).not.toBe(K);
    expect(cle({ ttc: ttc(-12000) })).not.toBe(K);
    expect(cle({ ttc: ttc(0) })).not.toBeNull();
  });

  it('casse-et-espaces-ignores', () => {
    expect(cle({ numero: 'f-2026-0047 ' })).toBe(K);
    expect(cle({ numero: ' f-2026 -0047' })).toBe(K);
    expect(cle({ sirenVendeur: '123 456 782' })).toBe(K);
  });

  it('premiere-recue-gardee', () => {
    const entrees = [
      { id: 'tard', recuLe: '2026-02-12T00:00:00Z', cle: K },
      { id: 'tot', recuLe: '2026-02-10T00:00:00Z', cle: K },
    ];
    const r = dedoublonner(entrees);
    expect(r.gardees).toEqual(['tot']);
    expect(r.doublons).toEqual([{ id: 'tard', doublonDe: 'tot' }]);
    expect(dedoublonner([...entrees].reverse())).toEqual(r);
    const egal = dedoublonner([
      { id: 'b', recuLe: 'x', cle: K },
      { id: 'a', recuLe: 'x', cle: K },
    ]);
    expect(egal.gardees).toEqual(['a']);
    expect(egal.doublons).toEqual([{ id: 'b', doublonDe: 'a' }]);
  });

  it('champ-manquant-jamais-doublon', () => {
    expect(cle({ sirenVendeur: '' })).toBeNull();
    expect(cle({ sirenVendeur: '  ' })).toBeNull();
    expect(cle({ numero: '' })).toBeNull();
    expect(cle({ numero: ' ' })).toBeNull();
    expect(cle({ dateFacture: '' })).toBeNull();
    expect(cleDedoublonnage({ sirenVendeur: '123456782', numero: 'N', dateFacture: '2026-02-10' } as never)).toBeNull();
    expect(cleDedoublonnage({ numero: 'N', dateFacture: '2026-02-10', ttc: ttc(1) } as never)).toBeNull();
    const r = dedoublonner([
      { id: 'a', recuLe: '1', cle: null },
      { id: 'b', recuLe: '2', cle: null },
    ]);
    expect(r).toEqual({ gardees: ['a', 'b'], doublons: [] });
  });

  it('entrees-invalides', () => {
    expect(cle({ ttc: 1.5 as Centimes })).toBeNull();
    expect(cle({ ttc: NaN as Centimes })).toBeNull();
    expect(cle({ ttc: Infinity as Centimes })).toBeNull();
    expect(cle({ ttc: -Infinity as Centimes })).toBeNull();
    expect(cle({ ttc: '12000' as unknown as Centimes })).toBeNull();
    expect(cle({ dateFacture: '2026-02-30' })).toBeNull();
    expect(cle({ dateFacture: 'pas-une-date' })).toBeNull();
    expect(cle({ numero: 5 as unknown as string })).toBeNull();
    expect(cle({ sirenVendeur: 5 as unknown as string })).toBeNull();
  });
});
