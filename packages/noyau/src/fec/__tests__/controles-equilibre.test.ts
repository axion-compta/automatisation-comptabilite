import { describe, expect, it } from 'vitest';
import { ErreurArgent } from '../../argent/index.js';
import { ErreurControleFec, REGLES_EQUILIBRE, controlerDatesExercice, controlerEquilibre } from '../controles-equilibre.js';
import type { LigneFecLue } from '../controles-structure.js';
import type { ChampFec } from '../lignes.js';

let n = 1;
const l = (j: string, num: string, debit: string, credit: string, date = '20260115'): LigneFecLue => {
  n += 1;
  return { numero: n, valeurs: { journalCode: j, ecritureNum: num, debit, credit, ecritureDate: date } as Record<ChampFec, string> };
};
const exo = { debut: '2026-01-01', fin: '2026-12-31' };
const equilibre = [l('VE', '1', '10,00', '0,00'), l('VE', '1', '0,00', '10,00')];

describe('équilibre FEC', () => {
  it('fichier-equilibre-zero-ecart-fec-e01', () => {
    expect(controlerEquilibre(equilibre)).toEqual([]);
    expect(controlerEquilibre([])).toEqual([]);
    expect(REGLES_EQUILIBRE.map((r) => r.id)).toEqual(['FEC-E01', 'FEC-E02', 'FEC-E03']);
  });
  it('un-centime-sur-ve-1-fec-e01', () => {
    const lignes = [l('VE', '1', '10,01', '0,00'), l('VE', '1', '0,00', '10,00')];
    const e = controlerEquilibre(lignes).filter((x) => x.regleId === 'FEC-E01');
    expect(e).toEqual([{ regleId: 'FEC-E01', ligne: lignes[0]?.numero, valeur: 'VE 1', ecartCentimes: 1 }]);
    const neg = controlerEquilibre([l('VE', '2', '0,00', '0,03')]);
    expect(neg[0]?.ecartCentimes).toBe(-3);
    expect(neg[0]?.valeur).toBe('VE 2');
  });
  it('fichier-desequilibre-fec-e02', () => {
    const e = controlerEquilibre([l('VE', '1', '5,00', '0,00'), l('AC', '1', '0,00', '2,50')]);
    expect(e.map((x) => x.regleId)).toEqual(['FEC-E01', 'FEC-E01', 'FEC-E02']);
    expect(e[2]).toMatchObject({ ecartCentimes: 250, ligne: 1 });
  });
  it('deux-ecritures-meme-numero-journaux-differents', () => {
    const e = controlerEquilibre([l('VE', '1', '10,00', '0,00'), l('AC', '1', '0,00', '10,00')]);
    expect(e.filter((x) => x.regleId === 'FEC-E01').map((x) => x.valeur)).toEqual(['VE 1', 'AC 1']);
    expect(controlerEquilibre([...equilibre, l('AC', '1', '3,00', '0,00'), l('AC', '1', '0,00', '3,00')])).toEqual([]);
  });
  it('lignes dispersées et ordre inversé : même résultat', () => {
    const a = [l('VE', '1', '10,00', '0,00'), l('AC', '9', '4,00', '0,00'), l('VE', '1', '0,00', '10,00'), l('AC', '9', '0,00', '4,00')];
    expect(controlerEquilibre(a)).toEqual([]);
    expect(controlerEquilibre([...a].reverse())).toEqual([]);
    const b = [l('VE', '1', '1,00', '0,00'), l('AC', '9', '4,00', '0,00'), l('VE', '1', '0,00', '0,50')];
    expect(controlerEquilibre(b)[0]).toMatchObject({ valeur: 'VE 1', ecartCentimes: 50, ligne: b[0]?.numero });
    expect(controlerEquilibre([...b].reverse()).find((x) => x.valeur === 'VE 1')).toMatchObject({ ligne: b[0]?.numero, ecartCentimes: 50 });
  });
  it('écriture d une seule ligne et montants maximaux', () => {
    expect(controlerEquilibre([l('VE', '1', '0,01', '0,00')])).toHaveLength(2);
    const max = '90071992547409,91';
    expect(() => controlerEquilibre([l('VE', '1', max, '0,00'), l('VE', '1', '0,01', '0,00')])).toThrow(ErreurArgent);
    expect(controlerEquilibre([l('VE', '1', max, max)])).toEqual([]);
  });
  it('date-hors-exercice-fec-e03', () => {
    const lignes = [l('VE', '1', '1,00', '0,00', '20251231'), l('VE', '1', '0,00', '1,00', '20270101'), l('VE', '2', '0,00', '0,00', '20260630'), l('VE', '3', '0,00', '0,00', 'abc')];
    const e = controlerDatesExercice(lignes, exo);
    expect(e.map((x) => x.ligne)).toEqual([lignes[0]?.numero, lignes[1]?.numero, lignes[3]?.numero]);
    expect(e[0]).toMatchObject({ regleId: 'FEC-E03', champ: 'ecritureDate', valeur: '20251231' });
    expect(controlerDatesExercice([], exo)).toEqual([]);
  });
  it('bornes-incluses', () => {
    expect(controlerDatesExercice([l('VE', '1', '0,00', '0,00', '20260101'), l('VE', '1', '0,00', '0,00', '20261231')], exo)).toEqual([]);
    expect(controlerDatesExercice([l('VE', '1', '0,00', '0,00', '20260101')], { debut: '2026-01-01', fin: '2026-01-01' })).toEqual([]);
  });
  it('bornes-inversees-refusees', () => {
    expect(() => controlerDatesExercice([], { debut: '2026-12-31', fin: '2026-01-01' })).toThrow(ErreurControleFec);
    expect(() => controlerDatesExercice([], { debut: '2026-02-30', fin: '2026-12-31' })).toThrow(ErreurControleFec);
    expect(() => controlerDatesExercice([], { debut: '2026-01-01', fin: 'x' })).toThrow(ErreurControleFec);
  });
});
