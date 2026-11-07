import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { centimes } from '../../argent/index.js';
import { ErreurXlsx, ecrireXlsx, partiesXlsx } from '../xlsx.js';
import type { ColonneXlsx } from '../xlsx.js';

const T: ColonneXlsx = { code: 'lib', type: 'texte', entete: 'Libellé' };
const M: ColonneXlsx = { code: 'mt', type: 'centimes', entete: 'Montant' };
const D: ColonneXlsx = { code: 'le', type: 'date', entete: 'Date' };
const feuille = (colonnes: ColonneXlsx[], lignes: Record<string, unknown>[], plus: object = {}): string =>
  partiesXlsx({ nomFeuille: 'Export', colonnes, lignes, ...plus })['xl/worksheets/sheet1.xml']!;

describe('écrivain xlsx', () => {
  it('archive-lisible-six-parties', () => {
    const parties = unzipSync(ecrireXlsx({ nomFeuille: 'Export', colonnes: [T], lignes: [{ lib: 'a' }] }));
    expect(Object.keys(parties).sort()).toEqual(['[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml']);
    expect(strFromU8(parties['xl/worksheets/sheet1.xml']!)).toContain('<sheetData>');
    expect(strFromU8(parties['xl/workbook.xml']!)).toContain('name="Export"');
    expect(strFromU8(parties['xl/styles.xml']!)).toContain('numFmt');
  });

  it('aucune-balise-formule', () => {
    const p = partiesXlsx({ nomFeuille: 'Export', colonnes: [T, M], lignes: [{ lib: '=SOMME(A1)', mt: 5 }], total: { etiquette: '+total', colonne: 'mt', valeurCentimes: centimes(5) }, filtresRappeles: ['=1+1'] });
    for (const contenu of Object.values(p)) expect(contenu).not.toContain('<f');
    expect(p['xl/worksheets/sheet1.xml']).not.toContain('t="str"');
  });

  it('texte-en-chaine-inline', () => {
    const x = feuille([T], [{ lib: ' deux  espaces ' }]);
    expect(x).toContain('<c r="A2" t="inlineStr"><is><t xml:space="preserve"> deux  espaces </t></is></c>');
    expect(x).toContain('<c r="A1" t="inlineStr"><is><t xml:space="preserve">Libellé</t></is></c>');
  });

  it('formule-prefixee-apostrophe', () => {
    const x = feuille([T], [{ lib: '=SOMME(A1)' }, { lib: '@x' }, { lib: '-1' }, { lib: '+1' }]);
    for (const v of ['=SOMME(A1)', '@x', '-1', '+1']) expect(x).toContain('<t xml:space="preserve">&apos;' + v + '</t>');
  });

  it('echappement-xml', () => {
    const x = feuille([T], [{ lib: '<script>&"\'' }]);
    expect(x).toContain('&lt;script&gt;&amp;&quot;&apos;</t>');
    expect(x).not.toContain('<script>');
    expect(partiesXlsx({ nomFeuille: 'A&B', colonnes: [T], lignes: [] })['xl/workbook.xml']).toContain('name="A&amp;B"');
  });

  it('centimes-en-nombre-exact', () => {
    const x = feuille([M], [{ mt: 123456789 }, { mt: -5 }, { mt: 0 }, { mt: 100 }]);
    expect(x).toContain('<c r="A2" s="1"><v>1234567.89</v></c>');
    expect(x).toContain('<c r="A3" s="1"><v>-0.05</v></c>');
    expect(x).toContain('<c r="A4" s="1"><v>0.00</v></c>');
    expect(x).toContain('<c r="A5" s="1"><v>1.00</v></c>');
    expect(feuille([M], [{ mt: 5 }], { total: { etiquette: 'Total', colonne: 'mt', valeurCentimes: centimes(250) } })).toContain('<c r="B3" s="1"><v>2.50</v></c>');
    expect(() => feuille([M], [], { total: { etiquette: 'T', colonne: 'zz', valeurCentimes: centimes(1) } })).toThrow(ErreurXlsx);
  });

  it('date-en-numero-de-serie', () => {
    const x = feuille([D], [{ le: '2026-10-01' }, { le: '2000-01-01' }, { le: '1900-03-01' }]);
    expect(x).toContain('<c r="A2" s="2"><v>46296</v></c>');
    expect(x).toContain('<c r="A3" s="2"><v>36526</v></c>');
    expect(x).toContain('<c r="A4" s="2"><v>61</v></c>');
  });

  it('caractere-de-controle-refuse', () => {
    const controle = String.fromCodePoint(1);
    for (const lignes of [[{ lib: 'a' + controle }]]) expect(() => partiesXlsx({ nomFeuille: 'E', colonnes: [T], lignes })).toThrow(expect.objectContaining({ code: 'caractere_interdit' }));
    expect(() => partiesXlsx({ nomFeuille: 'E', colonnes: [{ ...T, entete: controle }], lignes: [] })).toThrow(ErreurXlsx);
    expect(() => partiesXlsx({ nomFeuille: 'E' + controle, colonnes: [T], lignes: [] })).toThrow(ErreurXlsx);
    expect(feuille([T], [{ lib: 'a\tb\r\nc' }])).toContain('a\tb\r\nc');
  });

  it('liste-vide-entetes-seulement', () => {
    const x = feuille([T, M], []);
    expect(x.match(/<row /g)).toHaveLength(1);
    expect(x).toContain('<c r="B1" t="inlineStr">');
    expect(x).toContain('Montant');
  });

  it('total-sans-colonne-de-libelle-references-uniques', () => {
    const x = feuille([M], [{ mt: 5 }], { total: { etiquette: 'Total', colonne: 'mt', valeurCentimes: centimes(250) } });
    const refs = [...x.matchAll(/<c r="([A-Z]+d+)"/g)].map((m) => m[1]);
    expect(new Set(refs).size).toBe(refs.length);
    expect(x).toContain('<c r="A3" t="inlineStr"><is><t xml:space="preserve">Total</t></is></c><c r="B3" s="1"><v>2.50</v></c>');
  });

  it('valeurs-invalides-en-texte-sans-style', () => {
    for (const v of [Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      const x = feuille([M], [{ mt: v }]);
      expect(x).toContain('<c r="A2" t="inlineStr">');
      expect(x).not.toContain('s="1"');
    }
    const d = feuille([D], [{ le: '2026-02-30' }]);
    expect(d).toContain('<c r="A2" t="inlineStr">');
    expect(d).not.toContain('s="2"');
  });

  it('parties-exactes', () => {
    const p = partiesXlsx({ nomFeuille: 'A&B', colonnes: [T], lignes: [] });
    const en = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + String.fromCharCode(10);
    const ns = 'http://schemas.openxmlformats.org/';
    const doc = ns + 'officeDocument/2006/relationships';
    const ct = 'application/vnd.openxmlformats-officedocument.spreadsheetml.';
    expect(p['[Content_Types].xml']).toBe(en + '<Types xmlns="' + ns + 'package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="' + ct + 'sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="' + ct + 'worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="' + ct + 'styles+xml"/></Types>');
    expect(p['_rels/.rels']).toBe(en + '<Relationships xmlns="' + ns + 'package/2006/relationships"><Relationship Id="rId1" Type="' + doc + '/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    expect(p['xl/workbook.xml']).toBe(en + '<workbook xmlns="' + ns + 'spreadsheetml/2006/main" xmlns:r="' + doc + '"><sheets><sheet name="A&amp;B" sheetId="1" r:id="rId1"/></sheets></workbook>');
    expect(p['xl/_rels/workbook.xml.rels']).toBe(en + '<Relationships xmlns="' + ns + 'package/2006/relationships"><Relationship Id="rId1" Type="' + doc + '/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="' + doc + '/styles" Target="styles.xml"/></Relationships>');
    expect(p['xl/styles.xml']).toBe(en + '<styleSheet xmlns="' + ns + 'spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><cellXfs count="3"><xf/><xf numFmtId="164" applyNumberFormat="1"/><xf numFmtId="14" applyNumberFormat="1"/></cellXfs></styleSheet>');
    expect(p['xl/worksheets/sheet1.xml']).toBe(en + '<worksheet xmlns="' + ns + 'spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t xml:space="preserve">Libellé</t></is></c></row></sheetData></worksheet>');
    expect(() => partiesXlsx({ nomFeuille: 'E', colonnes: [T], lignes: [], total: { etiquette: 'T', colonne: 'zz', valeurCentimes: centimes(1) } })).toThrow(expect.objectContaining({ name: 'ErreurXlsx', code: 'colonne_total_inconnue' }));
  });

  it('rangees-filtres-vides-et-types', () => {
    const E: ColonneXlsx = { code: 'n', type: 'entier', entete: 'N' };
    const t = (r: string, v: string): string => '<c r="' + r + '" t="inlineStr"><is><t xml:space="preserve">' + v + '</t></is></c>';
    const x = feuille([T, E], [{ lib: '', n: 7 }], { filtresRappeles: ['f1', 'f2'] });
    expect(x).toContain('<sheetData><row r="1">' + t('A1', 'f1') + '</row><row r="2">' + t('A2', 'f2') + '</row><row r="3">' + t('A3', 'Libellé') + t('B3', 'N') + '</row><row r="4"><c r="B4"><v>7</v></c></row></sheetData>');
  });

  it('total-avec-colonne-de-libelle', () => {
    const total = { etiquette: 'Total', colonne: 'mt', valeurCentimes: centimes(250) };
    const t = '<c r="A3" t="inlineStr"><is><t xml:space="preserve">Total</t></is></c>';
    expect(feuille([T, M], [{ lib: 'a', mt: 5 }], { total })).toContain('<row r="3">' + t + '<c r="B3" s="1"><v>2.50</v></c></row>');
    expect(feuille([M, T], [], { total })).toContain('<row r="2"><c r="A2" s="1"><v>2.50</v></c>' + t.replace('A3', 'B2') + '</row>');
    expect(feuille([T, M, D], [], { total })).toContain('<row r="2">' + t.replace('A3', 'A2') + '<c r="B2" s="1"><v>2.50</v></c></row>');
  });

  it('noms-de-colonnes-au-dela-de-z', () => {
    const colonnes: ColonneXlsx[] = Array.from({ length: 60 }, (_, i) => ({ code: 'c' + String(i), type: 'texte', entete: 'h' + String(i) }));
    const refs = [...feuille(colonnes, []).matchAll(/<c r="([A-Z]+)1"/g)].map((m) => m[1]);
    expect(refs.slice(24, 29)).toEqual(['Y', 'Z', 'AA', 'AB', 'AC']);
    expect(refs.slice(50, 55)).toEqual(['AY', 'AZ', 'BA', 'BB', 'BC']);
    expect(refs[59]).toBe('BH');
  });
});
