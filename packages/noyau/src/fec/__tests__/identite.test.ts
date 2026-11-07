import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErreurArgent, centimes } from '../../argent/index.js';
import type { Ecriture, LigneEcriture } from '../../ecritures/modele.js';
import type { LigneGrandLivre } from '../../livres/balance.js';
import type { LigneFecLue } from '../controles-structure.js';
import type { ChampFec } from '../lignes.js';
import { REGLES_IDENTITE, controlerIdentite } from '../identite.js';

const faux = vi.hoisted(() => ({ cumul: undefined as number | undefined }));
vi.mock('../../livres/balance.js', async (importOriginal) => {
  const o = await importOriginal<typeof import('../../livres/balance.js')>();
  return {
    ...o,
    grandLivre: (e: readonly Ecriture[], c: string): LigneGrandLivre[] => {
      const r = o.grandLivre(e, c);
      const dernier = r.at(-1);
      return faux.cumul === undefined || dernier === undefined ? r : [...r.slice(0, -1), { ...dernier, cumul: centimes(faux.cumul) }];
    },
  };
});
beforeEach(() => {
  faux.cumul = undefined;
});

const lg = (compte: string, debit: number, credit: number): LigneEcriture => ({ compte, libelle: 'Libellé fictif', debit: centimes(debit), credit: centimes(credit) });
const ec = (id: string, statut: Ecriture['statut'], lignes: LigneEcriture[]): Ecriture => ({ id, numero: id, journal: 'AC', date: '2026-02-01', statut, lignes });
const ecritures: Ecriture[] = [
  ec('AC-1', 'valide', [lg('607', 10000, 0), lg('401', 0, 10000)]),
  ec('AC-2', 'valide', [lg('607', 500, 0), lg('401', 0, 500)]),
  ec('AC-3', 'valide', [lg('512', 300, 0), lg('401', 0, 300)]),
  ec('AC-4', 'brouillon', [lg('999', 700, 0), lg('401', 0, 700)]),
];
const m = (c: number) => `${String(Math.trunc(c / 100))},${String(c % 100).padStart(2, '0')}`;
let n = 1;
const fecDe = (liste: Ecriture[]): LigneFecLue[] =>
  liste.filter((e) => e.statut === 'valide').flatMap((e) => e.lignes.map((l) => {
    n += 1;
    return { numero: n, valeurs: { compteNum: l.compte, debit: m(l.debit), credit: m(l.credit) } as Record<ChampFec, string> };
  }));
const fec = fecDe(ecritures);

describe('identité FEC, grand livre et balance', () => {
  it('identite-parfaite-fec-i01', () => {
    expect(controlerIdentite(fec, ecritures)).toEqual([]);
    expect(controlerIdentite(fecDe([...ecritures].reverse()), [...ecritures].reverse())).toEqual([]);
    expect(controlerIdentite([], [])).toEqual([]);
    expect(REGLES_IDENTITE.map((r) => r.id)).toEqual(['FEC-I01', 'FEC-I02', 'FEC-I03']);
  });
  it('un-centime-sur-un-compte-fec-i01', () => {
    const faussees = fec.map((l) => (l.valeurs.compteNum === '512' ? { ...l, valeurs: { ...l.valeurs, debit: '3,01' } } : l));
    const e = controlerIdentite(faussees, ecritures);
    expect(e).toEqual([{ regleId: 'FEC-I01', ligne: faussees.find((l) => l.valeurs.compteNum === '512')?.numero, champ: 'compteNum', valeur: '512', ecartCentimes: 1 }]);
    const moins = fec.map((l) => (l.valeurs.compteNum === '401' && l.valeurs.credit === '3,00' ? { ...l, valeurs: { ...l.valeurs, credit: '2,98' } } : l));
    expect(controlerIdentite(moins, ecritures)[0]).toMatchObject({ valeur: '401', ecartCentimes: 2 });
  });
  it('compte-absent-du-fec-fec-i02', () => {
    const e = controlerIdentite(fec.filter((l) => l.valeurs.compteNum !== '512'), ecritures);
    expect(e).toEqual([{ regleId: 'FEC-I02', ligne: 1, champ: 'compteNum', valeur: '512', ecartCentimes: -300 }]);
  });
  it('compte-en-trop-dans-le-fec-fec-i02', () => {
    const extra = fecDe([ec('X', 'valide', [lg('658', 250, 0), lg('471', 0, 250)])]);
    const e = controlerIdentite([...fec, ...extra], ecritures);
    expect(e.map((x) => [x.regleId, x.valeur, x.ecartCentimes])).toEqual([['FEC-I02', '471', -250], ['FEC-I02', '658', 250]]);
    expect(e[0]?.ligne).toBe(extra[1]?.numero);
  });
  it('brouillon-ignore-des-deux-cotes', () => {
    expect(fec.some((l) => l.valeurs.compteNum === '999')).toBe(false);
    expect(controlerIdentite(fec, ecritures)).toEqual([]);
    expect(controlerIdentite(fecDe(ecritures.filter((e) => e.statut !== 'brouillon')), ecritures.slice(0, 3))).toEqual([]);
  });
  it('grand-livre-coherent-fec-i03', () => {
    faux.cumul = 12345;
    const e = controlerIdentite(fec, ecritures);
    expect(e.filter((x) => x.regleId === 'FEC-I03')).toHaveLength(3);
    expect(e.find((x) => x.valeur === '512')).toMatchObject({ regleId: 'FEC-I03', ecartCentimes: 12045 });
    faux.cumul = undefined;
    expect(controlerIdentite(fec, ecritures)).toEqual([]);
  });
  it('compte qui s annule et débordement', () => {
    const nul = [ec('Z', 'valide', [lg('512', 100, 0), lg('512', 0, 100)])];
    expect(controlerIdentite(fecDe(nul), nul)).toEqual([]);
    expect(controlerIdentite([], nul)[0]).toMatchObject({ regleId: 'FEC-I02', ecartCentimes: 0 });
    const max = { numero: 1, valeurs: { compteNum: '1', debit: '90071992547409,91', credit: '0,00' } as Record<ChampFec, string> };
    expect(() => controlerIdentite([max, max], [])).toThrow(ErreurArgent);
  });
});
