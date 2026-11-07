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
    expect(feuille([M], [{ mt: 5 }], { total: { etiquette: 'Total', colonne: 'mt', valeurCentimes: centimes(250) } })).toContain('<c r="A3" s="1"><v>2.50</v></c>');
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
});
