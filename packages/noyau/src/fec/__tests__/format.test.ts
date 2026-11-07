import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import {
  ErreurFec,
  type OptionsFec,
  assemblerLigne,
  formaterDateFec,
  formaterMontantFec,
  lireDateFec,
  lireLigne,
  lireMontantFec,
  nettoyerLibelle,
} from '../format.js';

const barre: OptionsFec = { separateur: '|', finDeLigne: '\r\n', longueurMaxLibelle: 20 };
const tab: OptionsFec = { separateur: '\t', finDeLigne: '\n', longueurMaxLibelle: 20 };

function code(action: () => unknown): string | undefined {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurFec ? e.code : 'autre';
  }
  return undefined;
}

describe('libellés', () => {
  it('libelle-pieges-nettoyes', () => {
    const cas: Array<[string, string]> = [
      ['a\tb', 'ab'], ['a|b', 'ab'], ['a\nb', 'ab'], ['a\rb', 'ab'], ['a\r\nb', 'ab'],
      ['a​b', 'ab'], ['a b', 'a b'], ['a b', 'a b'], ['a﻿b', 'ab'],
      ['a\0b', 'ab'], ['a\u0001b', 'ab'], ['a\u001Fb', 'ab'], ['a b', 'a b'],
      ['a\u007Fb', 'ab'], ['a\u0080b', 'ab'], ['a\u009Fb', 'ab'], ['a¡b', 'a¡b'],
      ['a b', 'ab'], ['a b', 'ab'], ['  ab  ', 'ab'], [' ab ', 'ab'],
      ['\tab\t', 'ab'], ['|ab|', 'ab'], ['Achat café été', 'Achat café été'],
      ['Règlement Œuvre', 'Règlement Œuvre'], ['a|\t\n|b', 'ab'], ['​​ ab', 'ab'],
      ['x\u0000y\u0008z', 'xyz'], ['A | B', 'A  B'], ['﻿ab', 'ab'],
    ];
    expect(cas).toHaveLength(30);
    for (const [entree, attendu] of cas) expect(nettoyerLibelle(entree, 'r', barre)).toBe(attendu);
    expect(nettoyerLibelle('a|b\tc', 'r', tab)).toBe('a|bc');
    const multi: OptionsFec = { separateur: 'ab', finDeLigne: ';;', longueurMaxLibelle: 20 };
    expect(nettoyerLibelle('aabbc;;d', 'r', multi)).toBe('cd');
  });

  it('refuse des options invalides', () => {
    for (const mauvaises of [ { separateur: '' }, { separateur: 'a\nb' }, { separateur: 'a\rb' }, { finDeLigne: '' }, { longueurMaxLibelle: 0 }, { longueurMaxLibelle: 1.5 }, ]) {
      expect(code(() => nettoyerLibelle('a', 'r', { ...barre, ...mauvaises }))).toBe('option_invalide');
    }
    expect(nettoyerLibelle('a', 'r', { ...barre, longueurMaxLibelle: 1 })).toBe('a');
  });

  it('repli-si-vide', () => {
    expect(nettoyerLibelle('', 'Compte 401000', barre)).toBe('Compte 401000');
    expect(nettoyerLibelle(' \t|​ ', ' Compte|\n4 ', barre)).toBe('Compte4');
    expect(code(() => nettoyerLibelle('|', '\t​ ', barre))).toBe('libelle_vide');
    expect(code(() => nettoyerLibelle('', '', barre))).toBe('libelle_vide');
  });

  it('libelle-coupe-a-la-longueur', () => {
    const opt: OptionsFec = { ...barre, longueurMaxLibelle: 5 };
    expect(nettoyerLibelle('abcdefgh', 'r', opt)).toBe('abcde');
    expect(nettoyerLibelle('ab|cdefgh', 'r', opt)).toBe('abcde');
    expect(nettoyerLibelle('abc   defgh', 'r', opt)).toBe('abc');
    expect(nettoyerLibelle('', 'repli-long', opt)).toBe('repli');
    expect(nettoyerLibelle('ab\u{1F600}\u{1F600}\u{1F600}\u{1F600}', 'r', opt)).toBe('ab\u{1F600}\u{1F600}\u{1F600}');
  });
});

describe('montants et dates', () => {
  it('montant-virgule-sans-milliers', () => {
    expect(formaterMontantFec(centimes(123456))).toBe('1234,56');
    expect(formaterMontantFec(centimes(5))).toBe('0,05');
    expect(formaterMontantFec(centimes(100000000))).toBe('1000000,00');
    expect(code(() => formaterMontantFec(centimes(-1)))).toBe('montant_negatif');
    expect(lireMontantFec('1234,56')).toBe(123456);
    for (const texte of ['', '1234.56', '1 234,56', '1234,5', '1234,567', '1234', ',56', '1234,',
      '-1,00', '01,00', 'a1,00', '1,00a', '1,00\n', '\n1,00', '9007199254740993,00']) {
      expect(code(() => lireMontantFec(texte))).toBe('montant_invalide');
    }
  });

  it('montant-lu-identique', () => {
    let etat = 12345;
    const suivant = (): number => {
      etat = (Math.imul(etat, 1103515245) + 12345) >>> 0;
      return etat;
    };
    const montants = [0, 1, 99, 100, Number.MAX_SAFE_INTEGER];
    while (montants.length < 1000) {
      montants.push(montants.length % 2 === 0 ? suivant() * 1000 + (suivant() % 1000) : suivant() % 100000);
    }
    for (const valeur of montants) {
      const texte = formaterMontantFec(centimes(valeur));
      expect(texte).not.toMatch(/[^0-9,]/);
      expect(lireMontantFec(texte)).toBe(valeur);
    }
  });

  it('date-aller-retour', () => {
    expect(formaterDateFec('2026-03-31')).toBe('20260331');
    expect(lireDateFec('20260331')).toBe('2026-03-31');
    for (const iso of ['2024-02-29', '2026-01-01', '2026-12-31', '0050-06-15']) {
      expect(lireDateFec(formaterDateFec(iso))).toBe(iso);
    }
    for (const iso of ['2026-02-30', '2026-13-01', '2026-00-10', '2026-01-00', '2025-02-29', '2026-3-31', '20260331', ' 2026-03-31', '']) {
      expect(code(() => formaterDateFec(iso))).toBe('date_invalide');
    }
    for (const texte of ['20260230', '20261301', '20260100', '2026-03-31', '202603311', '2026031a', '']) {
      expect(code(() => lireDateFec(texte))).toBe('date_invalide');
    }
  });
});

describe('lignes', () => {
  const valeurs = ['VT', '20260331', '1234,56', 'Achat café', ''];

  it('ligne-aller-retour-tabulation', () => {
    const ligne = assemblerLigne(valeurs, tab);
    expect(ligne).toBe('VT\t20260331\t1234,56\tAchat café\t\n');
    expect(lireLigne(ligne, tab)).toEqual(valeurs);
    expect(lireLigne(ligne.slice(0, -1), tab)).toEqual(valeurs);
    expect(lireLigne('a|b\tc', tab)).toEqual(['a|b', 'c']);
  });

  it('ligne-aller-retour-barre', () => {
    const ligne = assemblerLigne(valeurs, barre);
    expect(ligne).toBe('VT|20260331|1234,56|Achat café|\r\n');
    expect(lireLigne(ligne, barre)).toEqual(valeurs);
    expect(lireLigne(ligne.slice(0, -2), barre)).toEqual(valeurs);
    expect(assemblerLigne(['seul'], barre)).toBe('seul\r\n');
    expect(lireLigne('a\tb|c', barre)).toEqual(['a\tb', 'c']);
  });

  it('refuse les valeurs et lignes invalides', () => {
    for (const v of ['a|b', 'a\nb', 'a\rb']) expect(code(() => assemblerLigne([v], barre))).toBe('valeur_invalide');
    expect(code(() => assemblerLigne(['a;;b'], { ...barre, finDeLigne: ';;' }))).toBe('valeur_invalide');
    expect(code(() => assemblerLigne([], barre))).toBe('ligne_vide');
    expect(code(() => assemblerLigne(['a'], { ...barre, separateur: '' }))).toBe('option_invalide');
    expect(code(() => lireLigne('a|b', { ...barre, longueurMaxLibelle: 0 }))).toBe('option_invalide');
    for (const l of ['a|b\r\nc|d', 'a|b\nc', 'a|b\rc']) expect(code(() => lireLigne(l, barre))).toBe('ligne_invalide');
    expect(new ErreurFec('ligne_vide')).toMatchObject({ code: 'ligne_vide', name: 'ErreurFec' });
  });

  it('porte le code siren_invalide', () => {
    expect(new ErreurFec('siren_invalide').code).toBe('siren_invalide');
  });
});
