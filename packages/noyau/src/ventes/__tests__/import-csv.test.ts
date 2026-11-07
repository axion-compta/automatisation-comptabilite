import { describe, expect, it } from 'vitest';
import { ErreurVente } from '../types.js';
import { appliquerProfil, lireCsv } from '../import-csv.js';

const BASE = { numero: 'n', date: 'd', client: 'c', ht: 'h', tva: 'v', ttc: 't' };
const code = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErreurVente ? e.code : 'autre';
  }
  return undefined;
};

describe('import csv ventes', () => {
  it('csv-simple', () => {
    expect(lireCsv('a,b\n1,2\n', { separateur: ',' })).toEqual([['a', 'b'], ['1', '2']]);
    expect(lireCsv('a;b', { separateur: ';' })).toEqual([['a', 'b']]);
    expect(lireCsv('a\tb;c', { separateur: '\t' })).toEqual([['a', 'b;c']]);
    expect(lireCsv('', { separateur: ',' })).toEqual([]);
    expect(lireCsv('a,,\n,b', { separateur: ',' })).toEqual([['a', '', ''], ['', 'b']]);
    expect(lireCsv('a\n\nb\n', { separateur: ',' })).toEqual([['a'], [''], ['b']]);
    expect(lireCsv('"a"\n', { separateur: ',' })).toEqual([['a']]);
  });

  it('guillemets-doubles-et-separateur-dans-un-champ', () => {
    expect(lireCsv('"Dupont, ""Léa""",x\n"",y', { separateur: ',' })).toEqual([['Dupont, "Léa"', 'x'], ['', 'y']]);
    expect(lireCsv('a"b,c', { separateur: ',' })).toEqual([['a"b', 'c']]);
    expect(lireCsv('"a;b";c', { separateur: ';' })).toEqual([['a;b', 'c']]);
  });

  it('retour-a-la-ligne-dans-un-champ', () => {
    expect(lireCsv('"l1\nl2",x\r\n"m1\r\nm2",y', { separateur: ',' })).toEqual([['l1\nl2', 'x'], ['m1\r\nm2', 'y']]);
    expect(lireCsv('"a",b\n"c\nd",e\n', { separateur: ',' })).toEqual([['a', 'b'], ['c\nd', 'e']]);
  });

  it('bom-et-crlf', () => {
    expect(lireCsv('﻿a,b\r\n1,2\r\n', { separateur: ',' })).toEqual([['a', 'b'], ['1', '2']]);
    expect(lireCsv('a\nb\r\nc', { separateur: ',' })).toEqual([['a'], ['b'], ['c']]);
    expect(lireCsv('a﻿', { separateur: ',' })).toEqual([['a﻿']]);
  });

  it('guillemet-non-ferme-numero-de-ligne', () => {
    const f = (t: string): unknown => lireCsv(t, { separateur: ',' });
    expect(code(() => f('a,b\n1,"x'))).toBe('csv_mal_forme');
    expect(() => f('a,b\n1,"x')).toThrow(/ligne 2/);
    expect(() => f('"a\nb",c\n\n"d')).toThrow(/ligne 4/);
    expect(() => f('"a""')).toThrow(/ligne 1/);
    expect(() => f('"a"\r\n"b')).toThrow(/ligne 2/);
  });

  it('profil-par-nom', () => {
    const lignes = lireCsv('c,n,d,x,h,v,t,tx,s\nAcme,F1,2026-01-05,z,100,19,119,1900,123456782\n', { separateur: ',' });
    const r = appliquerProfil(lignes, { enTete: true, colonnes: { ...BASE, taux: 'tx', sirenClient: 's' } });
    expect(r.rejets).toEqual([]);
    expect(r.objets).toEqual([
      { numero: 'F1', date: '2026-01-05', client: 'Acme', ht: '100', tva: '19', ttc: '119', taux: '1900', sirenClient: '123456782' },
    ]);
    const sans = appliquerProfil(lignes, { enTete: true, colonnes: BASE });
    expect(Object.keys(sans.objets[0] ?? {})).toEqual(['numero', 'date', 'client', 'ht', 'tva', 'ttc']);
    expect(appliquerProfil([], { enTete: true, colonnes: BASE })).toEqual({ objets: [], rejets: [] });
    expect(appliquerProfil([['c']], { enTete: true, colonnes: BASE }).rejets).toEqual([]);
  });

  it('profil-par-indice', () => {
    const lignes = [['F1', '2026-01-05', 'Acme', '1', '2', '3'], ['F2', '2026-01-06', 'Bob', '4', '5', '6']];
    const colonnes = { numero: 0, date: 1, client: 2, ht: 3, tva: 4, ttc: 5 };
    const r = appliquerProfil(lignes, { enTete: false, colonnes });
    expect(r.rejets).toEqual([]);
    expect(r.objets.map((o) => o.numero)).toEqual(['F1', 'F2']);
    expect(appliquerProfil(lignes, { enTete: true, colonnes }).objets).toEqual([
      { numero: 'F2', date: '2026-01-06', client: 'Bob', ht: '4', tva: '5', ttc: '6' },
    ]);
    const inv = appliquerProfil([...lignes].reverse(), { enTete: false, colonnes });
    expect(inv.objets.map((o) => o.numero)).toEqual(['F2', 'F1']);
  });

  it('colonne-absente-rejet', () => {
    const lignes = [['a', 'b'], ['1', '2'], ['3', '4']];
    const abs = appliquerProfil(lignes, { enTete: true, colonnes: { ...BASE, numero: 'a', date: 'b', client: 'a', ht: 'a', tva: 'a' } });
    expect(abs.objets).toEqual([]);
    expect(abs.rejets).toEqual([{ ligne: 2, raison: 'colonne_absente' }, { ligne: 3, raison: 'colonne_absente' }]);
    const nom = appliquerProfil([['1']], { enTete: false, colonnes: { ...BASE } });
    expect(nom.rejets).toEqual([{ ligne: 1, raison: 'colonne_absente' }]);
    const tous = { numero: 0, date: 0, client: 0, ht: 0, tva: 0, ttc: 0 };
    for (const mauvais of [Number.NaN, Infinity, 1.5, -1, 1, 9]) {
      const r = appliquerProfil([['x']], { enTete: false, colonnes: { ...tous, ttc: mauvais } });
      expect(r.rejets).toEqual([{ ligne: 1, raison: 'colonne_absente' }]);
    }
    const opt = appliquerProfil([['x']], { enTete: false, colonnes: { ...tous, taux: 'zz' } });
    expect(opt.rejets).toEqual([{ ligne: 1, raison: 'colonne_absente' }]);
    const larg = appliquerProfil([['a', 'b'], ['1'], ['1', '2', '3'], ['5', '6']], {
      enTete: true,
      colonnes: { numero: 'a', date: 'b', client: 'a', ht: 'a', tva: 'a', ttc: 'a' },
    });
    expect(larg.rejets).toEqual([{ ligne: 2, raison: 'nombre_de_colonnes' }, { ligne: 3, raison: 'nombre_de_colonnes' }]);
    expect(larg.objets).toHaveLength(1);
    const sansEnTete = appliquerProfil([['1', '2'], ['3']], { enTete: false, colonnes: { ...tous } });
    expect(sansEnTete.rejets).toEqual([{ ligne: 2, raison: 'nombre_de_colonnes' }]);
  });

  it('cinq-mille-lignes-moins-d-une-seconde', () => {
    const n = 5000;
    const texte = ['n;c;h;v;t;d'].concat(Array.from({ length: n }, (_, i) => `F${i};"Cl ""${i}"";x";1;2;3;2026-01-05`)).join('\r\n');
    const debut = performance.now();
    const lignes = lireCsv(texte, { separateur: ';' });
    const r = appliquerProfil(lignes, { enTete: true, colonnes: { numero: 'n', client: 'c', ht: 'h', tva: 'v', ttc: 't', date: 'd' } });
    expect(performance.now() - debut).toBeLessThan(1000);
    expect(r.objets).toHaveLength(n);
    expect(r.rejets).toEqual([]);
    expect(r.objets[n - 1]?.client).toBe(`Cl "${n - 1}";x`);
  });
});
