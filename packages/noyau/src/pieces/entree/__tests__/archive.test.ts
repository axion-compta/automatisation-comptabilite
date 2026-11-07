import { describe, expect, it } from 'vitest';
import { cheminSur, controlerArchive } from '../archive.js';
import type { EntreeZip } from '../zip.js';

const R = { ratioMax: 10, totalMaxOctets: 1000, nombreMax: 5 };
const e = (nom: string, o: Partial<EntreeZip> = {}): EntreeZip => ({ nom, nomBrut: new Uint8Array(), utf8: true, chiffre: false, methode: 8, tailleCompressee: 10, tailleDecompressee: 20, ...o });
const refus = (raison: string) => ({ ok: false, refus: 'archive_refusee', raison });
const code = (f: () => unknown): string | undefined => { try { f(); } catch (x) { return (x as { code?: string }).code; } return undefined; };

describe('archive', () => {
  it('zip-slip-refuse', () => {
    for (const nom of ['../../x.pdf', '/etc/x', 'C:\\x', 'a/../../b', 'a/../b', 'a\\..\\b', 'x\0.pdf', '', '.', './.']) {
      expect(cheminSur(nom)).toBeNull();
      expect(controlerArchive([e('ok.pdf'), e(nom)], R)).toEqual(refus('zip_slip'));
    }
  });
  it('chemin-normalise', () => {
    expect(cheminSur('./a//b.pdf')).toBe('a/b.pdf');
    expect(cheminSur('a\\b.pdf')).toBe('a/b.pdf');
    expect(controlerArchive([e('./a//b.pdf')], R)).toEqual({ ok: true, fichiers: [{ nom: 'a/b.pdf', index: 0 }] });
  });
  it('chiffree-refusee', () => {
    expect(controlerArchive([e('a.pdf', { chiffre: true })], R)).toEqual(refus('chiffree'));
  });
  it('imbriquee-refusee', () => {
    for (const nom of ['a.zip', 'd/b.7Z', 'c.RAR', 'x.tar', 'y.gz']) expect(controlerArchive([e(nom)], R)).toEqual(refus('imbriquee'));
    expect(controlerArchive([e('zip.pdf')], R)).toMatchObject({ ok: true });
  });
  it('ratio-depasse-refuse', () => {
    expect(controlerArchive([e('a', { tailleCompressee: 10, tailleDecompressee: 100 })], R)).toMatchObject({ ok: true });
    expect(controlerArchive([e('a', { tailleCompressee: 10, tailleDecompressee: 101 })], R)).toEqual(refus('ratio'));
    expect(controlerArchive([e('a', { tailleCompressee: 0, tailleDecompressee: 1 })], R)).toEqual(refus('ratio'));
    expect(controlerArchive([e('a', { tailleCompressee: 0, tailleDecompressee: 0 })], R)).toMatchObject({ ok: true });
  });
  it('total-depasse-refuse', () => {
    const g = (d: number) => e('a' + d, { tailleCompressee: d, tailleDecompressee: d });
    expect(controlerArchive([g(500), g(501)], R)).toEqual(refus('total'));
    expect(controlerArchive([g(500), g(500)], R)).toMatchObject({ ok: true });
    const grand = { ...R, totalMaxOctets: Number.MAX_SAFE_INTEGER };
    const m = Number.MAX_SAFE_INTEGER;
    expect(controlerArchive([g(m), g(m)], grand)).toEqual(refus('total'));
    expect(controlerArchive([e('a', { tailleCompressee: 1, tailleDecompressee: NaN })], R)).toEqual(refus('total'));
  });
  it('nombre-depasse-refuse', () => {
    const f = (n: number) => Array.from({ length: n }, (_, i) => e(`f${i}.pdf`));
    expect(controlerArchive([...f(R.nombreMax), e('dossier/'), e('d2/')], R)).toMatchObject({ ok: true });
    expect(controlerArchive(f(R.nombreMax + 1), R)).toEqual(refus('nombre'));
  });
  it('archive-282-fichiers-acceptee', () => {
    const lot = Array.from({ length: 282 }, (_, i) => e(`p/f${i}.pdf`));
    const r = controlerArchive([e('p/'), ...lot], { ...R, nombreMax: 500, totalMaxOctets: 100000 });
    expect(r).toMatchObject({ ok: true });
    expect(r.ok && r.fichiers.length).toBe(282);
    expect(r.ok && r.fichiers[0]).toEqual({ nom: 'p/f0.pdf', index: 1 });
  });
  it('vide-refusee', () => {
    expect(controlerArchive([], R)).toEqual(refus('vide'));
    expect(controlerArchive([e('d/')], R)).toEqual(refus('vide'));
  });
  it('reglage-invalide-refuse', () => {
    for (const v of [0, -1, 1.5, NaN, Infinity]) {
      for (const k of ['ratioMax', 'totalMaxOctets', 'nombreMax'] as const) {
        expect(code(() => controlerArchive([e('a')], { ...R, [k]: v }))).toBe('reglage_invalide');
      }
    }
  });
});
