import { describe, expect, it } from 'vitest';
import { CARACTERES_DANGEREUX, ErreurNeutralisation, cellule, neutraliserTexte } from '../neutraliser.js';

describe('neutralisation des formules', () => {
  it('chaque-caractere-dangereux-prefixe', () => {
    const attendus = ['=', '+', '-', '@', '\u0009', '\u000D', '\u000A', '＝', '＋', '－', '＠'];
    expect([...CARACTERES_DANGEREUX]).toEqual(attendus);
    expect(CARACTERES_DANGEREUX).toHaveLength(11);
    expect(Object.isFrozen(CARACTERES_DANGEREUX)).toBe(true);
    for (const c of attendus) {
      expect(neutraliserTexte(c + 'abc')).toBe("'" + c + 'abc');
      expect(neutraliserTexte(c)).toBe("'" + c);
      const r = cellule(c + 'x', 'texte');
      expect(r).toEqual({ genre: 'texte', valeur: "'" + c + 'x' });
    }
    expect(neutraliserTexte('=SOMME(A1:A2)')).toBe("'=SOMME(A1:A2)");
    expect(neutraliserTexte('＝A1')).toBe("'＝A1");
  });

  it('caractere-au-milieu-intact', () => {
    for (const c of CARACTERES_DANGEREUX) {
      expect(neutraliserTexte('a' + c + 'b')).toBe('a' + c + 'b');
      expect(neutraliserTexte('ab' + c)).toBe('ab' + c);
    }
    expect(neutraliserTexte('Facture 12')).toBe('Facture 12');
  });

  it('espace-puis-egal-intact', () => {
    expect(neutraliserTexte(' =1')).toBe(' =1');
    expect(neutraliserTexte(' -1')).toBe(' -1');
  });

  it('vide-intact', () => {
    expect(neutraliserTexte('')).toBe('');
    expect(cellule('', 'texte')).toEqual({ genre: 'texte', valeur: '' });
    expect(cellule(null, 'texte')).toEqual({ genre: 'texte', valeur: '' });
    expect(cellule(undefined, 'centimes')).toEqual({ genre: 'texte', valeur: '' });
    expect(cellule(null, 'date')).toEqual({ genre: 'texte', valeur: '' });
    expect(cellule(undefined, 'booleen')).toEqual({ genre: 'texte', valeur: '' });
  });

  it('nombre-negatif-reste-nombre', () => {
    expect(cellule(-1250, 'centimes')).toEqual({ genre: 'nombre', valeur: '-1250' });
    expect(cellule(-3, 'entier')).toEqual({ genre: 'nombre', valeur: '-3' });
    expect(cellule(0, 'entier')).toEqual({ genre: 'nombre', valeur: '0' });
    expect(cellule(42, 'centimes')).toEqual({ genre: 'nombre', valeur: '42' });
    expect(cellule(true, 'booleen')).toEqual({ genre: 'nombre', valeur: '1' });
    expect(cellule(false, 'booleen')).toEqual({ genre: 'nombre', valeur: '0' });
    expect(cellule('2026-03-31', 'date')).toEqual({ genre: 'date', valeur: '2026-03-31' });
  });

  it('entier-hors-forme-devient-texte', () => {
    for (const type of ['entier', 'centimes'] as const) {
      expect(cellule(Number.NaN, type)).toEqual({ genre: 'texte', valeur: 'NaN' });
      expect(cellule(Infinity, type)).toEqual({ genre: 'texte', valeur: 'Infinity' });
      expect(cellule(-Infinity, type)).toEqual({ genre: 'texte', valeur: "'-Infinity" });
      expect(cellule(1.5, type)).toEqual({ genre: 'texte', valeur: '1.5' });
      expect(cellule(-1.5, type)).toEqual({ genre: 'texte', valeur: "'-1.5" });
      expect(cellule('12', type)).toEqual({ genre: 'texte', valeur: '12' });
      expect(cellule('=1', type)).toEqual({ genre: 'texte', valeur: "'=1" });
      expect(cellule('-5', type)).toEqual({ genre: 'texte', valeur: "'-5" });
      expect(cellule(2 ** 60, type).genre).toBe('texte');
      expect(cellule(-(2 ** 60), type).genre).toBe('texte');
      expect(cellule(Number.MAX_SAFE_INTEGER, type)).toEqual({ genre: 'nombre', valeur: '9007199254740991' });
      expect(cellule(1n, type).genre).toBe('texte');
    }
    expect(cellule('1', 'booleen').genre).toBe('texte');
    expect(cellule(2, 'booleen').genre).toBe('texte');
  });

  it('date-invalide-devient-texte', () => {
    for (const s of ['2026-02-30', '2026-13-01', '2026-2-1', '', ' 2026-01-01', '2026-01-01 ', '0999-01-01', '2026-04-31', 'x2026-01-01', '2026-01-01x']) {
      expect(cellule(s, 'date')).toEqual({ genre: 'texte', valeur: s });
    }
    expect(cellule('=2026-01-01', 'date')).toEqual({ genre: 'texte', valeur: "'=2026-01-01" });
    expect(cellule(20260101, 'date')).toEqual({ genre: 'texte', valeur: '20260101' });
    expect(cellule(-1, 'date')).toEqual({ genre: 'texte', valeur: "'-1" });
    expect(cellule('2024-02-29', 'date').genre).toBe('date');
    expect(cellule('2026-02-29', 'date').genre).toBe('texte');
    expect(cellule('1900-02-29', 'date').genre).toBe('texte');
    expect(cellule('2000-02-29', 'date').genre).toBe('date');
    expect(cellule('2026-12-31', 'date').genre).toBe('date');
    expect(cellule('2026-04-30', 'date').genre).toBe('date');
    expect(cellule('2026-01-00', 'date').genre).toBe('texte');
  });

  it('apostrophe-initiale-non-doublee', () => {
    expect(neutraliserTexte("'=1")).toBe("'=1");
    expect(neutraliserTexte("'")).toBe("'");
    expect(neutraliserTexte(neutraliserTexte('=1'))).toBe("'=1");
  });

  it('entree-non-modifiee', () => {
    const v = '=1+1';
    neutraliserTexte(v);
    expect(v).toBe('=1+1');
    const liste = ['=a', '+b'];
    const copie = [...liste];
    liste.map((x) => cellule(x, 'texte'));
    expect(liste).toEqual(copie);
    const objet = {};
    let code = '';
    try {
      cellule(objet, 'texte');
    } catch (e) {
      if (e instanceof ErreurNeutralisation) code = e.code;
    }
    expect(code).toBe('type_invalide');
    expect(objet).toEqual({});
    for (const x of [{}, [], () => 1, Symbol('s')]) {
      expect(() => cellule(x, 'entier')).toThrow(ErreurNeutralisation);
    }
  });
});
