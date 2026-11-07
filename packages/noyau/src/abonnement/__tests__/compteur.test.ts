import { describe, expect, it } from 'vitest';
import { compterPiecesTraitees, cumulerConsommation, moisDe, type EvenementPiece, type LigneConsommation } from '../compteur.js';
import { ErreurAbonnement } from '../types.js';

const code = (f: () => unknown) => {
  try { f(); } catch (e) { return e instanceof ErreurAbonnement ? e.code : 'autre'; }
  return undefined;
};
const ev = (pieceId: string, type: EvenementPiece['type'], horodatage: string, societe = 'societe-fictive-a'): EvenementPiece => ({ pieceId, societe, type, horodatage });
const lig = (o: Partial<LigneConsommation> = {}): LigneConsommation => ({
  societe: 'societe-fictive-a', pieceId: 'p1', action: 'lecture', modele: 'modele-fictif',
  jetonsEntree: 10, jetonsSortie: 5, coutMicroCentimes: 7, horodatage: '2031-05-10T08:00:00Z', ...o,
});
const MAI = '2031-05';

describe('abonnement/compteur', () => {
  it('relue-trois-fois-et-doublon-compte-un', () => {
    const e = [
      ev('p1', 'proposition_prete', '2031-05-02T08:00:00Z'), ev('p1', 'relecture', '2031-05-03T08:00:00Z'),
      ev('p1', 'relecture', '2031-05-04T08:00:00Z'), ev('p1', 'relecture', '2031-05-05T08:00:00Z'),
      ev('p2', 'doublon_refuse', '2031-05-06T08:00:00Z'),
    ];
    expect(compterPiecesTraitees(e, MAI)).toEqual(new Map([['societe-fictive-a', 1]]));
    expect(moisDe('2031-05-31T23:59:59Z')).toBe(MAI);
  });

  it('antivirus-ne-compte-pas', () => {
    const e = [ev('p1', 'antivirus_refuse', '2031-05-02T08:00:00Z'), ev('p2', 'proposition_prete', '2031-05-03T08:00:00Z'), ev('p2', 'antivirus_refuse', '2031-05-04T08:00:00Z'), ev('p3', 'proposition_prete', '2031-05-05T08:00:00Z'), ev('p3', 'doublon_refuse', '2031-05-01T08:00:00Z')];
    expect(compterPiecesTraitees(e, MAI).size).toBe(0);
  });

  it('premiere-proposition-mois-precedent-ne-compte-pas', () => {
    const e = [ev('p1', 'proposition_prete', '2031-04-30T23:59:59Z'), ev('p1', 'proposition_prete', '2031-05-02T08:00:00Z'), ev('p2', 'proposition_prete', '2031-05-01T00:00:00Z'), ev('p3', 'proposition_prete', '2031-06-01T00:00:00Z')];
    expect(compterPiecesTraitees(e, MAI)).toEqual(new Map([['societe-fictive-a', 1]]));
  });

  it('ordre-des-evenements-sans-effet', () => {
    const e = [ev('p1', 'proposition_prete', '2031-04-30T23:59:59Z'), ev('p1', 'proposition_prete', '2031-05-02T08:00:00Z'), ev('p2', 'proposition_prete', '2031-05-03T08:00:00Z'), ev('p2', 'relecture', '2031-05-04T08:00:00Z')];
    const copie = [...e];
    expect(compterPiecesTraitees([...e].reverse(), MAI)).toEqual(compterPiecesTraitees(e, MAI));
    expect(compterPiecesTraitees(e, MAI)).toEqual(new Map([['societe-fictive-a', 1]]));
    expect(e).toEqual(copie);
  });

  it('deux-societes-separees', () => {
    const e = [ev('p1', 'proposition_prete', '2031-05-02T08:00:00Z', 'a'), ev('p1', 'proposition_prete', '2031-05-03T08:00:00Z', 'b'), ev('p2', 'proposition_prete', '2031-05-04T08:00:00Z', 'b'), ev('p3', 'doublon_refuse', '2031-05-04T08:00:00Z', 'a'), ev('p1', 'doublon_refuse', '2031-05-05T08:00:00Z', 'a')];
    expect(compterPiecesTraitees(e, MAI)).toEqual(new Map([['b', 2]]));
    const l = [lig({ societe: 'a', coutMicroCentimes: 3 }), lig({ societe: 'b', coutMicroCentimes: 4 }), lig({ societe: 'a', coutMicroCentimes: 5, jetonsEntree: 1, jetonsSortie: 2 })];
    expect(cumulerConsommation(l, MAI)).toEqual(new Map([
      ['a', { jetonsEntree: 11, jetonsSortie: 7, coutMicroCentimes: 8 }],
      ['b', { jetonsEntree: 10, jetonsSortie: 5, coutMicroCentimes: 4 }],
    ]));
    expect(cumulerConsommation([lig({ horodatage: '2031-06-01T00:00:00Z' }), lig({ horodatage: '2031-04-30T23:59:59Z' })], MAI).size).toBe(0);
  });

  it('mois-invalide-refuse', () => {
    for (const m of ['2026-13', '2026-1', '', '2026-00', '2026-5-1', 'abcd-01', ' 2026-05']) {
      expect(code(() => compterPiecesTraitees([], m)), m).toBe('date_invalide');
      expect(code(() => cumulerConsommation([], m)), m).toBe('date_invalide');
    }
    expect(code(() => moisDe('2031-02-30T00:00:00Z'))).toBe('horodatage_invalide');
    expect(code(() => compterPiecesTraitees([ev('p1', 'relecture', 'hier')], MAI))).toBe('horodatage_invalide');
  });

  it('consommation-nan-infinity-negatif-decimal-refuses', () => {
    const mauvais = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, 1.5];
    for (const champ of ['jetonsEntree', 'jetonsSortie', 'coutMicroCentimes'] as const) {
      for (const v of mauvais) expect(code(() => cumulerConsommation([lig({ [champ]: v })], MAI)), `${champ}=${v}`).toBe('entier_invalide');
    }
    expect(code(() => cumulerConsommation([lig({ jetonsEntree: Number.NaN, horodatage: '2031-04-01T00:00:00Z' })], MAI))).toBe('entier_invalide');
    expect(cumulerConsommation([lig({ jetonsEntree: 0, jetonsSortie: 0, coutMicroCentimes: 0 })], MAI).size).toBe(1);
  });

  it('depassement-entier-detecte', () => {
    const max = Number.MAX_SAFE_INTEGER;
    for (const champ of ['jetonsEntree', 'jetonsSortie', 'coutMicroCentimes'] as const) {
      expect(code(() => cumulerConsommation([lig({ [champ]: max - 1 }), lig({ [champ]: 2 })], MAI))).toBe('depassement_entier');
    }
    const ok = cumulerConsommation([lig({ coutMicroCentimes: max - 1 }), lig({ coutMicroCentimes: 1 })], MAI);
    expect(ok.get('societe-fictive-a')?.coutMicroCentimes).toBe(max);
  });
});
