import { describe, expect, it } from 'vitest';
import { typeReel } from '../signature.js';

const t = (s: string): number[] => Array.from(s, (c) => c.charCodeAt(0));
const u16 = (s: string): number[] => t(s).flatMap((c) => [c, 0]);
const u8 = (...p: number[][]): Uint8Array => new Uint8Array(p.flat());
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const refus = (code: string) => ({ refus: code, raison: expect.any(String) });

describe('signature', () => {
  it('pdf-reconnu', () => {
    expect(typeReel(u8(t('%PDF-1.7\n')))).toEqual({ type: 'pdf' });
    expect(typeReel(u8(t('%PDF')))).toEqual(refus('type_refuse'));
    expect(typeReel(u8([0x20], t('%PDF-')))).toEqual(refus('type_refuse'));
  });
  it('executable-nomme-pdf-refuse', () => {
    for (const e of [t('MZ'), [0x7f, 0x45, 0x4c, 0x46], [0xcf, 0xfa, 0xed, 0xfe]]) {
      expect(typeReel(u8(e, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]))).toEqual(refus('type_refuse'));
    }
  });
  it('png-jpeg-webp-tiff-heic', () => {
    const cas: [Uint8Array, string][] = [
      [u8(PNG, [0]), 'png'], [u8([0xff, 0xd8, 0xff, 0xe0]), 'jpeg'],
      [u8(t('RIFF'), [1, 2, 3, 4], t('WEBP')), 'webp'],
      [u8([0x49, 0x49, 0x2a, 0x00]), 'tiff'], [u8([0x4d, 0x4d, 0x00, 0x2a]), 'tiff'],
      [u8([0, 0, 0, 24], t('ftyp'), t('heic')), 'heic'], [u8([0, 0, 0, 24], t('ftyp'), t('heix')), 'heic'],
      [u8([0, 0, 0, 24], t('ftyp'), t('mif1')), 'heic'], [u8([0, 0, 0, 24], t('ftyp'), t('msf1')), 'heic'],
      [u8([0x50, 0x4b, 0x03, 0x04, 0]), 'zip'],
    ];
    for (const [o, type] of cas) expect(typeReel(o)).toEqual({ type });
    expect(typeReel(u8([0, 0, 0, 24], t('ftyp'), t('isom')))).toEqual(refus('type_refuse'));
    expect(typeReel(u8([0, 0, 0, 24], t('ftxp'), t('heic')))).toEqual(refus('type_refuse'));
    expect(typeReel(u8([0x49, 0x49, 0x2a, 0x01]))).toEqual(refus('type_refuse'));
  });
  it('xml-avec-bom', () => {
    expect(typeReel(u8(t('<?xml version="1.0"?><a/>')))).toEqual({ type: 'xml' });
    expect(typeReel(u8([0xef, 0xbb, 0xbf], t(' \r\n\t<?xml ?>')))).toEqual({ type: 'xml' });
    expect(typeReel(u8(t('<a/>')))).toEqual(refus('type_refuse'));
    expect(typeReel(u8(t(' ')))).toEqual(refus('type_refuse'));
  });
  it('ole-msg-accepte', () => {
    expect(typeReel(u8(OLE, [0, 0], u16('__substg1.0_0037001F')))).toEqual({ type: 'msg' });
  });
  it('ole-macro-refusee', () => {
    expect(typeReel(u8(OLE, u16('__substg1.0_'), u16('_VBA_PROJECT')))).toEqual(refus('macro_refusee'));
  });
  it('ole-inconnu-refuse', () => {
    expect(typeReel(u8(OLE, t('_VBA_PROJECT'), t('__substg1.0_')))).toEqual(refus('type_refuse'));
    expect(typeReel(u8(OLE))).toEqual(refus('type_refuse'));
  });
  it('eml-reconnu', () => {
    for (const e of ['Received: from x', 'return-path: <a@exemple.fr>', 'FROM: a@exemple.fr', 'MIME-Version: 1.0', 'Message-ID: <1>', 'Date: lundi']) {
      expect(typeReel(u8(t('\r\n  \n' + e + '\r\nSubject: s\r\n')))).toEqual({ type: 'eml' });
    }
    expect(typeReel(u8(t('Subject: s\r\nFrom: a@exemple.fr')))).toEqual(refus('type_refuse'));
    expect(typeReel(u8(t('From: é@exemple.fr'), [0xc3, 0xa9]))).toEqual(refus('type_refuse'));
    expect(typeReel(u8(t('From:\u0001x')))).toEqual(refus('type_refuse'));
  });
  it('csv-reconnu-et-binaire-refuse', () => {
    for (const s of ['a;b\n1;2\n', 'a,b,c\r\n1,2,3\r\n', 'a\tb\n1\t2', 'x\n\na;b\nc;d']) {
      expect(typeReel(u8(t(s)))).toEqual({ type: 'csv' });
    }
    expect(typeReel(u8([0xc3, 0xa9], t(';b\n'), [0xc3, 0xa9], t(';d\n')))).toEqual({ type: 'csv' });
    for (const s of ['a;b\n1;2;3\n', 'abc\ndef\n', 'a;b', ';\n', '\n\n']) {
      expect(typeReel(u8(t(s)))).toEqual(refus('type_refuse'));
    }
    expect(typeReel(u8(t('a;b\n1;2\n'), [0]))).toEqual(refus('type_refuse'));
    expect(typeReel(u8(t('a;b\n1;2\n'), [0xff]))).toEqual(refus('type_refuse'));
  });
  it('vide-et-tronque-refuses', () => {
    expect(typeReel(new Uint8Array(0))).toEqual(refus('type_refuse'));
    expect(typeReel(u8(PNG.slice(0, 3)))).toEqual(refus('type_refuse'));
    expect(typeReel(u8(t('RIFF'), [1, 2, 3, 4]))).toEqual(refus('type_refuse'));
    expect(typeReel(u8(t('RIFF'), [1, 2, 3, 4], t('WEB')))).toEqual(refus('type_refuse'));
    expect(typeReel(u8([0, 0, 0, 24], t('ftyp'), t('he')))).toEqual(refus('type_refuse'));
  });
});
