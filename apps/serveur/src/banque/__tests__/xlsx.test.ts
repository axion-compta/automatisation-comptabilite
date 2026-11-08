import { describe, expect, it } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { ErreurXlsx, lireXlsx } from '../xlsx.js';

const LIM = { octetsMax: 100_000, decompresseMax: 100_000, lignesMax: 50 };
const ENTETE = '<?xml version="1.0" encoding="UTF-8"?>';
const feuille = (lignes: string) => `${ENTETE}<worksheet><sheetData>${lignes}</sheetData></worksheet>`;
const chaines = (...t: string[]) => `${ENTETE}<sst>${t.map((s) => `<si><t>${s}</t></si>`).join('')}</sst>`;
function classeur(sheet: string | null, partage?: string): Uint8Array {
  const f: Record<string, Uint8Array> = {};
  if (sheet !== null) f['xl/worksheets/sheet1.xml'] = strToU8(sheet);
  if (partage !== undefined) f['xl/sharedStrings.xml'] = strToU8(partage);
  f['xl/worksheets/sheet2.xml'] = strToU8(feuille('<row r="1"><c r="A1"><v>autre</v></c></row>'));
  return zipSync(f);
}
const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof ErreurXlsx ? e.code : 'autre';
  }
  return 'aucune';
};

describe('lireXlsx', () => {
  it('trois-lignes-lues', () => {
    const s = feuille(
      '<row r="1"><c r="A1" t="inlineStr"><is><t>Date</t></is></c><c r="B1" t="str"><v>Libelle</v></c></row>' +
        '<row r="2"><c r="A2"><v>1</v></c><c r="B2" t="inlineStr"><is><t>Cafe &amp; the</t></is></c></row>' +
        '<row r="3"><c r="A3"><v>2</v></c><c r="B3"><v>3</v></c></row>',
    );
    expect(lireXlsx(classeur(s), LIM)).toEqual([['Date', 'Libelle'], ['1', 'Cafe & the'], ['2', '3']]);
  });

  it('chaines-partagees-resolues', () => {
    const s = feuille('<row r="1"><c r="A1" t="s"><v>1</v></c><c r="B1" t="s"><v>0</v></c></row>');
    const p = `${ENTETE}<sst><si><t>Zeta</t></si><si><r><t xml:space="preserve">Al</t></r><r><t>pha</t></r></si></sst>`;
    expect(lireXlsx(classeur(s, p), LIM)).toEqual([['Alpha', 'Zeta']]);
    expect(code(() => lireXlsx(classeur(s, chaines('seule')), LIM))).toBe('archive_invalide');
  });

  it('cellule-absente-vide', () => {
    const s = feuille('<row r="1"><c r="A1"><v>x</v></c><c r="D1"><v>y</v></c></row><row r="3"><c r="B3"><v>z</v></c></row>');
    expect(lireXlsx(classeur(s), LIM)).toEqual([['x', '', '', 'y'], [], ['', 'z']]);
    expect(lireXlsx(classeur(feuille('<row r="1"><c r="A1"/><c r="B1"><v>q</v></c></row>')), LIM)).toEqual([['', 'q']]);
  });

  it('nombre-garde-en-texte', () => {
    const s = feuille('<row r="1"><c r="A1"><v>1234.56</v></c><c r="B1"><v>45000</v></c><c r="C1"><v>0.10</v></c></row>');
    expect(lireXlsx(classeur(s), LIM)).toEqual([['1234.56', '45000', '0.10']]);
  });

  it('bombe-de-decompression-refusee', () => {
    const grosse = feuille(`<row r="1"><c r="A1"><v>${'0'.repeat(200_000)}</v></c></row>`);
    const octets = classeur(grosse);
    expect(octets.length).toBeLessThan(5_000);
    expect(code(() => lireXlsx(octets, LIM))).toBe('decompression_trop_grande');
    expect(code(() => lireXlsx(classeur(chaines('a')), { ...LIM, octetsMax: 10 }))).toBe('trop_gros');
    const ok = classeur(feuille('<row r="1"><c r="A1"><v>1</v></c></row>'));
    expect(code(() => lireXlsx(ok, { ...LIM, decompresseMax: 10 }))).toBe('decompression_trop_grande');
  });

  it('archive-invalide-refusee', () => {
    expect(code(() => lireXlsx(new Uint8Array(0), LIM))).toBe('archive_invalide');
    expect(code(() => lireXlsx(strToU8('pas un zip du tout'), LIM))).toBe('archive_invalide');
    expect(code(() => lireXlsx(classeur(null), LIM))).toBe('feuille_absente');
    expect(lireXlsx(classeur(feuille('')), LIM)).toEqual([]);
  });

  it('doctype-refuse', () => {
    const piege = `${ENTETE}<!DOCTYPE x [<!ENTITY a "bb">]>` + feuille('<row r="1"><c r="A1"><v>&a;</v></c></row>').slice(ENTETE.length);
    expect(code(() => lireXlsx(classeur(piege), LIM))).toBe('doctype_refuse');
    expect(code(() => lireXlsx(classeur(feuille('<row r="1"><c r="A1"><v>1</v></c></row>'), `${ENTETE}<!entity y "z"><sst/>`), LIM))).toBe('doctype_refuse');
  });

  it('trop-de-lignes-refuse', () => {
    const l = (n: number) => `<row r="${n}"><c r="A${n}"><v>${n}</v></c></row>`;
    const s = feuille([1, 2, 3].map(l).join(''));
    expect(lireXlsx(classeur(s), { ...LIM, lignesMax: 3 })).toHaveLength(3);
    expect(code(() => lireXlsx(classeur(s), { ...LIM, lignesMax: 2 }))).toBe('trop_de_lignes');
    expect(code(() => lireXlsx(classeur(feuille(l(1_000_000))), LIM))).toBe('trop_de_lignes');
  });

  it('cellules-hors-ordre-remises-dans-l-ordre', () => {
    const s = feuille('<row r="1"><c r="C1"><v>c</v></c><c r="A1"><v>a</v></c></row>');
    expect(lireXlsx(classeur(s), LIM)).toEqual([['a', '', 'c']]);
  });

  it('limites-invalides', () => {
    const o = classeur(feuille(''));
    const mauvaises = [0, -1, NaN, Infinity, 1.5];
    for (const v of mauvaises) {
      for (const cle of ['octetsMax', 'decompresseMax', 'lignesMax'] as const) {
        expect(code(() => lireXlsx(o, { ...LIM, [cle]: v }))).toBe('limites_invalides');
      }
    }
  });
});
