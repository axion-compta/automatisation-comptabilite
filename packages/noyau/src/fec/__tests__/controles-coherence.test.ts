import { describe, expect, it } from 'vitest';
import { REGLES_COHERENCE, controlerCoherence } from '../controles-coherence.js';
import type { LigneFecLue } from '../controles-structure.js';
import type { ChampFec } from '../lignes.js';

const rangDe = (numero: string): number | undefined => {
  const t = /([0-9]+)$/.exec(numero);
  return t === null ? undefined : Number(t[1]);
};
const permis = ['AC', 'VE'];
let n = 1;
const l = (j: string, rang: number | string, extra: Partial<Record<ChampFec, string>> = {}): LigneFecLue => {
  n += 1;
  const num = typeof rang === 'number' ? `${j}-2026-${String(rang).padStart(6, '0')}` : rang;
  return { numero: n, valeurs: { journalCode: j, ecritureNum: num, compteNum: '601', compteLib: 'Achats', compAuxNum: '', compAuxLib: '', ...extra } as Record<ChampFec, string> };
};
const run = (lignes: LigneFecLue[], journauxPermis: readonly string[] = permis) => controlerCoherence(lignes, { rangDe, journauxPermis });
const ids = (e: { regleId: string }[]) => e.map((x) => x.regleId);

describe('cohérence FEC', () => {
  it('suite-continue-zero-ecart-fec-c01', () => {
    const trois = [l('AC', 1), l('AC', 1), l('AC', 1), l('AC', 2), l('VE', 1)];
    expect(run(trois)).toEqual([]);
    expect(run([...trois].reverse())).toEqual([]);
    expect(run([])).toEqual([]);
    expect(run([l('AC', 1)])).toEqual([]);
    expect(REGLES_COHERENCE.map((r) => r.id)).toEqual(['FEC-C01', 'FEC-C02', 'FEC-C03', 'FEC-C04']);
  });
  it('trou-detecte-fec-c01', () => {
    const a = [l('AC', 1), l('AC', 4)];
    const e = run(a);
    expect(e).toEqual([
      { regleId: 'FEC-C01', ligne: a[0]?.numero, champ: 'ecritureNum', valeur: 'AC rang 2 manquant' },
      { regleId: 'FEC-C01', ligne: a[0]?.numero, champ: 'ecritureNum', valeur: 'AC rang 3 manquant' },
    ]);
    expect(run([l('AC', 2)])).toHaveLength(1);
    expect(ids(run([l('AC', 4), l('AC', 1)]))).toEqual(['FEC-C01', 'FEC-C01']);
  });
  it('doublon-detecte-fec-c01', () => {
    const e = run([l('AC', 1), l('AC', 'AC-2027-000001'), l('AC', 2)]);
    expect(e).toHaveLength(1);
    expect(e[0]).toMatchObject({ regleId: 'FEC-C01', valeur: 'AC rang 1 en double' });
  });
  it('numero-illisible-fec-c01', () => {
    const a = [l('AC', 1), l('AC', 'sans-chiffre-final-x'), l('AC', 'sans-chiffre-final-x'), l('AC', 'AC-000000'), l('VE', 1)];
    const e = run(a);
    expect(e.map((x) => x.valeur)).toEqual(['sans-chiffre-final-x', 'AC-000000']);
    expect(e[0]?.ligne).toBe(a[1]?.numero);
  });
  it('deux-libelles-meme-compte-fec-c02', () => {
    const a = [l('AC', 1), l('AC', 1, { compteLib: 'Autre' }), l('AC', 1, { compteNum: '602', compteLib: 'Seul' })];
    const e = run(a);
    expect(e).toEqual([{ regleId: 'FEC-C02', ligne: a[0]?.numero, champ: 'compteLib', valeur: '601' }]);
  });
  it('tiers-sans-nom-fec-c03', () => {
    const a = [l('AC', 1, { compAuxNum: 'F001' }), l('AC', 1, { compAuxNum: 'F001', compAuxLib: 'Tiers fictif' })];
    expect(run(a)).toEqual([{ regleId: 'FEC-C03', ligne: a[0]?.numero, champ: 'compAuxLib', valeur: 'F001' }]);
  });
  it('nom-sans-tiers-fec-c03', () => {
    const a = [l('AC', 1, { compAuxLib: 'Tiers fictif' })];
    expect(run(a)).toEqual([{ regleId: 'FEC-C03', ligne: a[0]?.numero, champ: 'compAuxNum', valeur: 'Tiers fictif' }]);
  });
  it('journal-hors-liste-fec-c04', () => {
    const a = [l('ZZ', 1), l('ZZ', 2), l('AC', 1)];
    expect(run(a)).toEqual([{ regleId: 'FEC-C04', ligne: a[0]?.numero, champ: 'journalCode', valeur: 'ZZ' }]);
    expect(ids(run([l('AC', 1)], []))).toEqual(['FEC-C04']);
  });
});
