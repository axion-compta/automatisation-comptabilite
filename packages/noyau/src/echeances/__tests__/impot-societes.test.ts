import { describe, expect, it } from 'vitest';
import { acomptesIs, ErreurEcheancesIs, soldeIs } from '../impot-societes.js';

const fen = (debut: string, fin: string, echeances: string[]) => ({ debut, fin, echeances });
const A = ['02-10', '05-10', '08-10', '11-10'];
const TABLE = {
  fenetres: [
    fen('11-10', '02-09', A),
    fen('02-10', '05-09', ['05-10', '08-10', '11-10', '02-10']),
    fen('05-10', '08-09', ['08-10', '11-10', '02-10', '05-10']),
    fen('08-10', '11-09', ['11-10', '02-10', '05-10', '08-10']),
  ],
  statut: 'valide',
};
const REGLE = {
  moisApres: 3,
  jour: 10,
  exceptions: [{ cloture: '12-31', echeance: '04-20', decalageAnnees: 1 }],
  statut: 'valide',
};
const dates = (c: string, t: unknown = TABLE) => acomptesIs(c, t as never).dates;
const solde = (c: string, r: unknown = REGLE) => soldeIs(c, r as never);
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurEcheancesIs ? e.code : 'autre';
  }
  return undefined;
};

describe('impot-societes', () => {
  it('acomptes-cloture-31-decembre', () => {
    expect(dates('2027-12-31')).toEqual(['2027-02-10', '2027-05-10', '2027-08-10', '2027-11-10']);
    expect(dates('2028-01-15')).toEqual(['2027-02-10', '2027-05-10', '2027-08-10', '2027-11-10']);
  });

  it('acomptes-cloture-31-mars', () => {
    expect(dates('2027-03-31')).toEqual(['2026-05-10', '2026-08-10', '2026-11-10', '2027-02-10']);
    expect(dates('2027-06-30')).toEqual(['2026-08-10', '2026-11-10', '2027-02-10', '2027-05-10']);
    expect(dates('2027-09-30')).toEqual(['2026-11-10', '2027-02-10', '2027-05-10', '2027-08-10']);
  });

  it('table-modifiee-change-le-resultat', () => {
    const autre = {
      ...TABLE,
      fenetres: [fen('11-10', '02-09', ['02-11', '05-11', '08-11', '11-11']), ...TABLE.fenetres.slice(1)],
    };
    expect(dates('2027-12-31', autre)).toEqual(['2027-02-11', '2027-05-11', '2027-08-11', '2027-11-11']);
    const decale = { ...TABLE, fenetres: [fen('11-10', '12-30', A), fen('12-31', '02-09', A)] };
    expect(code(() => dates('2027-12-31', decale))).toBeUndefined();
    const sansFenetre = { ...TABLE, fenetres: [fen('01-01', '12-30', A)] };
    expect(code(() => dates('2027-12-31', sansFenetre))).toBe('fenetre_absente');
    expect(dates('2027-03-31', { ...TABLE, fenetres: [fen('01-01', '12-31', ['05-10', '08-10', '11-10', '02-10'])] })).toEqual([
      '2026-05-10',
      '2026-08-10',
      '2026-11-10',
      '2027-02-10',
    ]);
  });

  it('table-incoherente-refusee', () => {
    const f = (e: string[]) => ({ ...TABLE, fenetres: [fen('01-01', '12-31', e)] });
    const cas = [
      ['05-10', '02-10', '08-10', '11-10'],
      ['02-10', '02-10', '05-10'],
      ['02-10', '13-10'],
      ['02-10', '2-10'],
      ['02-30'],
      [],
    ];
    for (const e of cas) expect(code(() => dates('2027-12-31', f(e)))).toBe('table_incoherente');
    expect(code(() => dates('2027-12-31', { ...TABLE, fenetres: [fen('13-01', '12-31', A)] }))).toBe(
      'table_incoherente',
    );
    expect(code(() => dates('2027-12-31', { ...TABLE, fenetres: [fen('01-01', '02-30', A)] }))).toBe(
      'table_incoherente',
    );
  });

  it('fenetre-absente-ou-ambigue', () => {
    expect(code(() => dates('2027-12-31', { ...TABLE, fenetres: [] }))).toBe('fenetre_absente');
    const deux = { ...TABLE, fenetres: [fen('11-10', '12-31', A), fen('12-31', '12-31', A)] };
    expect(code(() => dates('2027-12-31', deux))).toBe('table_ambigue');
    expect(code(() => dates('2027-12-30', deux))).toBeUndefined();
    expect(code(() => dates('2027-11-10', deux))).toBeUndefined();
    expect(code(() => dates('2027-11-09', deux))).toBe('fenetre_absente');
    const bord = { ...TABLE, fenetres: [fen('11-10', '02-09', A), fen('02-10', '11-09', A)] };
    for (const c of ['2027-11-10', '2027-02-09', '2027-02-10', '2027-11-09']) {
      expect(['fenetre_absente', 'table_ambigue']).not.toContain(code(() => dates(c, bord)));
    }
  });

  it('solde-cas-general', () => {
    expect(solde('2027-03-31').date).toBe('2027-06-10');
    expect(solde('2027-11-30').date).toBe('2028-02-10');
    expect(solde('2027-01-31').date).toBe('2027-04-10');
    expect(code(() => solde('2027-03-31', { ...REGLE, jour: 31 }))).toBe('jour_inexistant');
    expect(code(() => solde('2027-03-31', { ...REGLE, jour: 30 }))).toBeUndefined();
    expect(code(() => solde('2027-11-30', { ...REGLE, jour: 30 }))).toBe('jour_inexistant');
  });

  it('solde-exception', () => {
    expect(solde('2026-12-31').date).toBe('2027-04-20');
    expect(solde('2026-12-30').date).toBe('2027-03-10');
    const sans = { ...REGLE, exceptions: [] };
    expect(solde('2026-12-31', sans).date).toBe('2027-03-10');
    const zero = { ...REGLE, exceptions: [{ cloture: '12-31', echeance: '04-20', decalageAnnees: 0 }] };
    expect(solde('2026-12-31', zero).date).toBe('2026-04-20');
    const mauvais = { ...REGLE, exceptions: [{ cloture: '12-31', echeance: '02-30', decalageAnnees: 1 }] };
    expect(code(() => solde('2026-12-31', mauvais))).toBe('jour_inexistant');
    const frac = { ...REGLE, exceptions: [{ cloture: '12-31', echeance: '04-20', decalageAnnees: 0.5 }] };
    expect(code(() => solde('2026-12-31', frac))).toBe('parametre_invalide');
  });

  it('statut-non-valide-a-verifier', () => {
    expect(acomptesIs('2027-12-31', TABLE as never).aVerifier).toBe(false);
    expect(solde('2027-03-31').aVerifier).toBe(false);
    for (const statut of ['non_verifie', '', 'Valide']) {
      expect(acomptesIs('2027-12-31', { ...TABLE, statut } as never).aVerifier).toBe(true);
      expect(solde('2027-03-31', { ...REGLE, statut }).aVerifier).toBe(true);
    }
  });

  it('dates-invalides', () => {
    for (const c of ['2027-02-30', '', '2027-1-1']) {
      expect(code(() => dates(c))).toBe('date_invalide');
      expect(code(() => solde(c))).toBe('date_invalide');
    }
    for (const m of [Number.NaN, 1.5, Infinity, -1]) {
      expect(code(() => solde('2027-03-31', { ...REGLE, moisApres: m }))).toBe('parametre_invalide');
    }
    for (const j of [0, 32, 1.5, Number.NaN]) {
      expect(code(() => solde('2027-03-31', { ...REGLE, jour: j }))).toBe('parametre_invalide');
    }
    expect(solde('2027-03-31', { ...REGLE, moisApres: 0 }).date).toBe('2027-03-10');
  });
});
