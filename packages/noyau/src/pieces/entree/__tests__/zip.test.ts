import { describe, expect, it } from 'vitest';
import { classerConteneur, lireRepertoireZip } from '../zip.js';

interface Spec { nom: number[] | string; drapeaux?: number; compressee?: number; local?: number; extra?: number }
const enc = (s: string): number[] => Array.from(new TextEncoder().encode(s));
const le = (v: number, n: number): number[] => Array.from({ length: n }, (_, i) => Math.floor(v / 256 ** i) % 256);
function zip(specs: Spec[], o: { nombre?: number; debut?: number; taille?: number; commentaire?: number } = {}): Uint8Array {
  const cd = specs.flatMap((s) => {
    const nom = typeof s.nom === 'string' ? enc(s.nom) : s.nom;
    return [...le(0x02014b50, 4), ...le(20, 2), ...le(20, 2), ...le(s.drapeaux ?? 0, 2), ...le(8, 2), ...le(0, 4), ...le(0, 4),
      ...le(s.compressee ?? 5, 4), ...le(9, 4), ...le(nom.length, 2), ...le(s.extra ?? 0, 2), ...le(0, 2), ...le(0, 4), ...le(0, 4),
      ...le(s.local ?? 0, 4), ...nom, ...Array<number>(s.extra ?? 0).fill(7)];
  });
  const fin = [...le(0x06054b50, 4), ...le(0, 4), ...le(o.nombre ?? specs.length, 2), ...le(o.nombre ?? specs.length, 2),
    ...le(o.taille ?? cd.length, 4), ...le(o.debut ?? 0, 4), ...le(o.commentaire ?? 0, 2)];
  return new Uint8Array([...cd, ...fin]);
}
const noms = (...n: string[]): Spec[] => n.map((nom) => ({ nom }));
const classe = (...n: string[]) => classerConteneur(lireRepertoireZip(zip(noms(...n))));
const code = (f: () => unknown): string | undefined => { try { f(); } catch (e) { return (e as { code?: string }).code; } return undefined; };

describe('zip', () => {
  it('liste-les-noms', () => {
    const r = lireRepertoireZip(zip([{ nom: 'a/b.txt', extra: 3, compressee: 12 }, { nom: 'c.xml', local: 4 }]));
    expect(r.map((e) => e.nom)).toEqual(['a/b.txt', 'c.xml']);
    expect(r[0]).toMatchObject({ methode: 8, tailleCompressee: 12, tailleDecompressee: 9, utf8: false, chiffre: false });
    expect(Array.from(r[1]?.nomBrut ?? [])).toEqual(enc('c.xml'));
    expect(lireRepertoireZip(zip([]))).toEqual([]);
  });
  it('drapeau-chiffre-lu', () => {
    const r = lireRepertoireZip(zip([{ nom: 'a', drapeaux: 1 }, { nom: 'b', drapeaux: 0x800 }, { nom: 'c', drapeaux: 0x7fe }]));
    expect(r.map((e) => e.chiffre)).toEqual([true, false, false]);
  });
  it('nom-cp437-converti', () => {
    const r = lireRepertoireZip(zip([{ nom: [0x82, 0x41] }, { nom: [0x80, 0xe1, 0xff, 0xfe] }]));
    expect(r[0]).toMatchObject({ nom: 'éA', utf8: false });
    expect(r[1]?.nom).toBe('Çß ■');
  });
  it('nom-utf8-lu', () => {
    const r = lireRepertoireZip(zip([{ nom: [0xc3, 0xa9], drapeaux: 0x800 }]));
    expect(r[0]).toMatchObject({ nom: 'é', utf8: true });
  });
  it('docx-reconnu', () => {
    expect(classe('[Content_Types].xml', 'word/document.xml')).toBe('docx');
    expect(classe('word/document.xml')).toBe('zip');
    expect(classe('[Content_Types].xml')).toBe('zip');
    expect(classe('a.txt', 'b.txt')).toBe('zip');
  });
  it('xlsx-avec-vbaproject-refuse', () => {
    expect(classe('[Content_Types].xml', 'xl/workbook.xml')).toBe('xlsx');
    for (const m of ['xl/vbaProject.bin', 'vbaProject.bin', 'a/b/VBAPROJECT.BIN', 'x\\vbaProject.bin']) {
      expect(classe('[Content_Types].xml', 'xl/workbook.xml', m)).toEqual({ refus: 'macro_refusee' });
    }
    expect(classe('vbaProject.bin.txt')).toBe('zip');
  });
  it('odt-reconnu', () => {
    expect(classe('mimetype', 'content.xml')).toBe('odt');
    expect(classe('mimetype')).toBe('zip');
    expect(classe('content.xml')).toBe('zip');
  });
  it('zip64-refuse', () => {
    const cas = [zip(noms('a'), { nombre: 0xffff }), zip(noms('a'), { taille: 0xffffffff }), zip(noms('a'), { debut: 0xffffffff }),
      zip([{ nom: 'a', compressee: 0xffffffff }]), zip([{ nom: 'a', local: 0xffffffff }])];
    for (const z of cas) expect(code(() => lireRepertoireZip(z))).toBe('archive_refusee');
    const d = zip(noms('a'));
    new DataView(d.buffer).setUint32(24, 0xffffffff, true);
    expect(code(() => lireRepertoireZip(d))).toBe('archive_refusee');
  });
  it('repertoire-tronque-refuse', () => {
    const z = zip(noms('abc', 'def'));
    const cas = [z.slice(0, 30), z.slice(0, z.length - 1), new Uint8Array(0), new Uint8Array(21), zip(noms('a'), { debut: 500 }),
      zip(noms('a'), { taille: 5000 }), zip(noms('a', 'b'), { nombre: 3 }), zip(noms('a'), { nombre: 9000 }), zip(noms('a'), { taille: 20 }),
      zip([{ nom: 'abc', extra: 40 }], { taille: 60 }), zip(noms('a'), { debut: 5 })];
    for (const c of cas) expect(code(() => lireRepertoireZip(c))).toBe('archive_refusee');
    const sig = zip(noms('a'));
    sig[0] = 0;
    expect(code(() => lireRepertoireZip(sig))).toBe('archive_refusee');
    expect(code(() => lireRepertoireZip(zip(noms('a'), { commentaire: 0 })))).toBeUndefined();
  });
});
