import { describe, expect, it } from 'vitest';
import { ErreurChange, resoudreTaux, saisirTaux, validationAutorisee } from '../taux.js';

const ligne = (devise: string, date: string, tauxE8: number) => ({ devise, date, tauxE8 });
const SRC = {
  bce: [
    ligne('XXD', '2027-05-13', 110000000),
    ligne('XXD', '2027-05-14', 120000000),
    ligne('XXC', '2027-06-01', 130000000),
  ],
  saisis: [
    { ...ligne('XXE', '2027-05-14', 140000000), sourceTexte: 'Relevé fictif', saisiPar: 'Camille Fictif', statut: 'a_verifier' },
    { ...ligne('XXD', '2027-05-20', 160000000), sourceTexte: 'Relevé fictif', saisiPar: 'Camille Fictif', statut: 'ok' },
  ],
  parites: [
    { devise: 'XXC', tauxE8: 150000000, effetDebut: '2027-01-01', effetFin: '2027-06-01', source: 'Accord fictif', statut: 'ok' },
  ],
};
const res = (devise: string, date: string, src: unknown = SRC, joursMax = 3) =>
  resoudreTaux({ devise, date }, src as never, joursMax);
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurChange ? e.code : 'autre';
  }
  return undefined;
};

describe('taux de change', () => {
  it('bce-du-jour', () => {
    expect(res('XXD', '2027-05-14')).toEqual({
      ok: true,
      tauxE8: 120000000,
      origine: 'bce',
      dateDuTaux: '2027-05-14',
      aVerifier: false,
    });
    expect(res('XXD', '2027-05-13')).toMatchObject({ tauxE8: 110000000, dateDuTaux: '2027-05-13' });
  });

  it('veille-ouvree-week-end', () => {
    for (const d of ['2027-05-15', '2027-05-16', '2027-05-17']) {
      expect(res('XXD', d)).toMatchObject({ ok: true, tauxE8: 120000000, dateDuTaux: '2027-05-14' });
    }
  });

  it('taux-trop-ancien-manquant', () => {
    expect(res('XXD', '2027-05-18')).toEqual({ ok: false, code: 'taux_manquant' });
    expect(res('XXD', '2027-05-18', SRC, 4)).toMatchObject({ ok: true, dateDuTaux: '2027-05-14' });
    expect(res('XXD', '2027-05-15', SRC, 0)).toEqual({ ok: false, code: 'taux_manquant' });
    expect(res('XXD', '2027-05-14', SRC, 0)).toMatchObject({ ok: true });
    expect(res('XXD', '2027-05-12')).toEqual({ ok: false, code: 'taux_manquant' });
    for (const j of [Number.NaN, -1, 1.5, Infinity]) {
      expect(code(() => res('XXD', '2027-05-14', SRC, j))).toBe('parametre_invalide');
    }
    for (const d of ['2027-02-30', '', '2027-5-14']) {
      expect(code(() => res('XXD', d))).toBe('date_invalide');
    }
  });

  it('non-cotee-taux-manquant', () => {
    expect(res('XXZ', '2027-05-14')).toEqual({ ok: false, code: 'taux_manquant' });
    expect(res('XXZ', '2027-05-14', { bce: [], saisis: [], parites: [] })).toEqual({
      ok: false,
      code: 'taux_manquant',
    });
  });

  it('saisie-a-verifier', () => {
    expect(res('XXE', '2027-05-14')).toEqual({
      ok: true,
      tauxE8: 140000000,
      origine: 'saisi',
      dateDuTaux: '2027-05-14',
      aVerifier: true,
    });
    expect(res('XXD', '2027-05-20')).toMatchObject({ origine: 'saisi', aVerifier: false });
    expect(res('XXE', '2027-05-15')).toEqual({ ok: false, code: 'taux_manquant' });
    const s = saisirTaux({ devise: 'XXE', date: '2027-05-14', tauxE8: 1, sourceTexte: 'Relevé fictif', saisiPar: 'Camille Fictif' });
    expect(s).toMatchObject({ statut: 'a_verifier', tauxE8: 1, devise: 'XXE', saisiPar: 'Camille Fictif' });
  });

  it('saisie-sans-source-422', () => {
    const base = { devise: 'XXE', date: '2027-05-14', tauxE8: 1, sourceTexte: 'x', saisiPar: 'Camille Fictif' };
    for (const sourceTexte of ['', '   ', '\t\n']) {
      let err: unknown;
      try {
        saisirTaux({ ...base, sourceTexte });
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(ErreurChange);
      expect(err).toMatchObject({ code: 'source_obligatoire', statutHttp: 422 });
    }
    for (const saisiPar of ['', '  ']) {
      expect(code(() => saisirTaux({ ...base, saisiPar }))).toBe('saisie_anonyme');
    }
    expect(code(() => saisirTaux({ ...base, date: '2027-02-30' }))).toBe('date_invalide');
    expect(code(() => saisirTaux({ ...base, devise: '' }))).toBe('devise_invalide');
  });

  it('parite-fixe-sans-bce', () => {
    const piege = { ...SRC };
    Object.defineProperty(piege, 'bce', {
      get() {
        throw new Error('BCE lue');
      },
    });
    expect(res('XXC', '2027-01-01', piege)).toEqual({
      ok: true,
      tauxE8: 150000000,
      origine: 'parite_fixe',
      dateDuTaux: '2027-01-01',
      aVerifier: false,
    });
    expect(res('XXC', '2027-05-31', piege)).toMatchObject({ origine: 'parite_fixe', tauxE8: 150000000 });
    const aVerif = { ...SRC, parites: [{ ...SRC.parites[0], statut: 'a_verifier' }] };
    expect(res('XXC', '2027-05-31', aVerif)).toMatchObject({ aVerifier: true });
  });

  it('parite-close-apres-effet-fin', () => {
    expect(res('XXC', '2027-06-01')).toMatchObject({ origine: 'bce', tauxE8: 130000000 });
    expect(res('XXC', '2026-12-31')).toEqual({ ok: false, code: 'taux_manquant' });
    const nouvelle = { ...SRC.parites[0], tauxE8: 170000000, effetDebut: '2027-06-01', effetFin: null };
    const deux = { ...SRC, parites: [SRC.parites[0], nouvelle] };
    expect(res('XXC', '2027-05-31', deux)).toMatchObject({ tauxE8: 150000000 });
    expect(res('XXC', '2027-06-01', deux)).toMatchObject({ origine: 'parite_fixe', tauxE8: 170000000 });
    expect(res('XXC', '2099-01-01', deux)).toMatchObject({ tauxE8: 170000000 });
  });

  it('validation-refusee-si-a-verifier', () => {
    expect(validationAutorisee(res('XXE', '2027-05-14') as never)).toBe(false);
    expect(validationAutorisee(res('XXD', '2027-05-14') as never)).toBe(true);
    expect(validationAutorisee(res('XXD', '2027-05-20') as never)).toBe(true);
  });

  it('taux-zero-negatif-nan-refuse', () => {
    const base = { devise: 'XXE', date: '2027-05-14', sourceTexte: 'x', saisiPar: 'Camille Fictif' };
    for (const tauxE8 of [0, -1, Number.NaN, 1.5, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 2, '1']) {
      expect(code(() => saisirTaux({ ...base, tauxE8: tauxE8 as number }))).toBe('taux_invalide');
    }
    expect(saisirTaux({ ...base, tauxE8: Number.MAX_SAFE_INTEGER }).statut).toBe('a_verifier');
    const mauvais = { ...SRC, bce: [ligne('XXD', '2027-05-14', 0)] };
    expect(code(() => res('XXD', '2027-05-14', mauvais))).toBe('taux_invalide');
  });
});
