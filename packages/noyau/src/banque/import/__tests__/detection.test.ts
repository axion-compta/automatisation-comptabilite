import { describe, expect, it } from 'vitest';
import {
  ErreurDetection,
  decoder,
  detecterEncodage,
  detecterFormat,
  detecterSeparateur,
  verifierLimites,
} from '../detection.js';

const o = (s: string): Uint8Array => new TextEncoder().encode(s);
const brut = (...n: number[]): Uint8Array => Uint8Array.from(n);

function code(action: () => unknown): string | undefined {
  try {
    action();
  } catch (e) {
    return e instanceof ErreurDetection ? e.code : 'autre';
  }
  return undefined;
}

describe('détection du format par le contenu', () => {
  it('extension-ignoree', () => {
    expect(detecterFormat.length).toBe(1);
    expect(detecterFormat(o('date;libelle;montant\n01/02/2026;Achat fictif;12,50\n'))).toBe('csv');
    expect(detecterFormat(new Uint8Array(0))).toBe('inconnu');
    expect(detecterFormat(brut(0x41))).toBe('inconnu');
    const alea = Uint8Array.from({ length: 64 }, (_, i) => (i * 37 + 3) % 256);
    expect(detecterFormat(alea)).toBe('inconnu');
    expect(detecterFormat(brut(0x61, 0x3b, 0x62, 0x0a, 0x00, 0x3b, 0x01))).toBe('inconnu');
    expect(detecterFormat(o('Bonjour tout le monde'))).toBe('inconnu');
  });

  it('camt-reconnu', () => {
    const camt = '<?xml version="1.0"?>\n<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02"><BkToCstmrStmt/></Document>';
    for (const t of [camt, '\n  ' + camt]) expect(detecterFormat(o(t))).toBe('camt053');
    expect(detecterFormat(o('<?xml version="1.0"?><Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03"/>'))).toBe('inconnu');
    expect(detecterFormat(o('<?xml version="1.0"?><autre/>'))).toBe('inconnu');
  });

  it('ofx1-et-ofx2', () => {
    const ofx1 = 'OFXHEADER:100\nDATA:OFXSGML\nVERSION:102\n\n<OFX>\n<SIGNONMSGSRSV1>\n</OFX>';
    const ofx2 = '<?xml version="1.0"?>\n<?OFX OFXHEADER="200" VERSION="211"?>\n<OFX>\n</OFX>';
    expect(detecterFormat(o(ofx1))).toBe('ofx1');
    expect(detecterFormat(o(ofx2))).toBe('ofx2');
    expect(detecterFormat(o('﻿' + ofx2))).toBe('ofx2');
    expect(detecterFormat(o('OFXHEADER:100;DATA;x\n<OFX>'))).toBe('ofx1');
  });

  it('pdf-reconnu', () => {
    expect(detecterFormat(o('%PDF-1.7\n%âãÏÓ\n1 0 obj'))).toBe('pdf');
    expect(detecterFormat(o('%PDF'))).toBe('inconnu');
    expect(detecterFormat(o(' %PDF-1.7'))).toBe('inconnu');
  });

  it('xlsx-reconnu', () => {
    const nom = o('[Content_Types].xml');
    const zip = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, ...nom, 0x01, 0x02]);
    expect(detecterFormat(zip)).toBe('xlsx');
    expect(detecterFormat(Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, ...o('word/document.xml')]))).toBe('inconnu');
    expect(detecterFormat(Uint8Array.from([0x50, 0x4b, 0x03]))).toBe('inconnu');
    expect(detecterFormat(Uint8Array.from([0x50, 0x4b, 0x05, 0x06, ...nom]))).toBe('inconnu');
  });

  it('csv-point-virgule', () => {
    expect(detecterSeparateur('a;b;c\n1;2;3\n4;5;6')).toBe(';');
    expect(detecterSeparateur('a,b,c\n1,2,3')).toBe(',');
    expect(detecterSeparateur('a\tb\n1\t2\r\n3\t4')).toBe('\t');
    expect(detecterSeparateur('a;b,c\n1;2,3,4\n5;6,7')).toBe(';');
    expect(detecterSeparateur('"a;b",c\n"1;2",3')).toBe(',');
    expect(detecterSeparateur('\n\na;b\n\n1;2\n')).toBe(';');
    expect(detecterSeparateur('Relevé fictif\ndate;libelle;montant\n01/02/2026;Achat;12,50')).toBe(';');
    expect(detecterSeparateur('a;b\n1;2;3')).toBeNull();
    expect(detecterSeparateur('Titre\nAutre titre\na;b')).toBeNull();
    expect(detecterSeparateur('')).toBeNull();
    expect(detecterSeparateur('Titre sans séparateur')).toBeNull();
    expect(detecterSeparateur('a;b')).toBe(';');
    expect(detecterSeparateur('a,b,c;d\n1,2,3;4')).toBe(',');
    expect(detecterSeparateur('a,b;c\n1,2;3')).toBe(';');
    const onze = Array.from({ length: 11 }, (_, i) => (i < 10 ? 'a;b' : 'x')).join('\n');
    expect(detecterSeparateur(onze)).toBe(';');
    expect(detecterFormat(o('a;b\n1;2'))).toBe('csv');
  });

  it('bom-utf8', () => {
    const bom = [0xef, 0xbb, 0xbf];
    expect(detecterEncodage(Uint8Array.from([...bom, ...o('a;b')]))).toBe('utf-8-bom');
    expect(detecterEncodage(o('é;b'))).toBe('utf-8');
    expect(detecterEncodage(new Uint8Array(0))).toBe('utf-8');
    expect(detecterEncodage(Uint8Array.from([...bom, 0xe9]))).toBe('windows-1252');
    expect(decoder(Uint8Array.from([...bom, ...o('é;b')]), 'utf-8-bom')).toBe('é;b');
    expect(decoder(o('é;b'), 'utf-8')).toBe('é;b');
    expect(detecterFormat(Uint8Array.from([...bom, ...o('a;b\n1;2')]))).toBe('csv');
  });

  it('windows-1252-euro', () => {
    expect(detecterEncodage(brut(0x80, 0x31))).toBe('windows-1252');
    expect(decoder(brut(0x80), 'windows-1252')).toBe('€');
    expect(decoder(brut(0x41, 0xe9, 0x9f, 0x8e, 0x93, 0x94, 0xff), 'windows-1252')).toBe('AéŸŽ“”ÿ');
    expect(decoder(brut(0x81, 0x7f, 0xa0, 0x9d), 'windows-1252')).toBe('\u0081\u007f \u009d');
    expect(detecterEncodage(brut(0xc3))).toBe('windows-1252');
    expect(detecterEncodage(brut(0xc3, 0x28))).toBe('windows-1252');
    expect(detecterFormat(Uint8Array.from([...o('libelle;montant\nCafé '), 0x80, ...o(';12')]))).toBe('csv');
  });

  it('limites-depassees', () => {
    const lim = { octetsMax: 10, lignesMax: 3 };
    expect(code(() => verifierLimites(o('0123456789'), '0123456789', lim))).toBeUndefined();
    expect(code(() => verifierLimites(o('01234567890'), 'x', lim))).toBe('trop_gros');
    for (const t of ['a\nb\nc', 'a\nb\nc\n', 'a\r\nb\r\nc', '']) expect(code(() => verifierLimites(o('a'), t, lim))).toBeUndefined();
    for (const t of ['a\nb\nc\nd', 'a\r\nb\r\nc\r\nd\r\n', 'a\rb\rc\rd']) expect(code(() => verifierLimites(o('a'), t, lim))).toBe('trop_de_lignes');
    for (const n of [Number.NaN, Infinity, -Infinity, -1, 0, 1.5, 2 ** 53]) {
      expect(code(() => verifierLimites(o('a'), 'a', { octetsMax: n, lignesMax: 3 }))).toBe('limites_invalides');
      expect(code(() => verifierLimites(o('a'), 'a', { octetsMax: 10, lignesMax: n }))).toBe('limites_invalides');
    }
    expect(code(() => verifierLimites(o('a'), 'a', { octetsMax: 1, lignesMax: 1 }))).toBeUndefined();
  });
});
