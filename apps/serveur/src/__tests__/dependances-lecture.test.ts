import { describe, expect, it } from 'vitest';
import { unzipSync, zipSync } from 'fflate';

describe('dépendances de lecture', () => {
  it('dependances-chargees', async () => {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    expect(typeof pdfjs.getDocument).toBe('function');
    const octets = new Uint8Array([97, 98, 99]);
    const archive = zipSync({ 'a.txt': octets });
    const relu = unzipSync(archive)['a.txt'];
    expect(Array.from(relu ?? [])).toEqual([97, 98, 99]);
  });
});
