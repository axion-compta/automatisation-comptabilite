import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErreurPdf, extraireTextePdf } from '../pdf.js';

const LIMITES = { octetsMax: 100_000, pagesMax: 5 };
type Texte = { x: number; y: number; s: string };

function fabriquerPdf(pages: Texte[][]): Uint8Array {
  const objets: string[] = [];
  const nb = pages.length;
  objets.push('<< /Type /Catalog /Pages 2 0 R >>');
  objets.push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + i * 2} 0 R`).join(' ')}] /Count ${nb} >>`);
  objets.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  pages.forEach((textes, i) => {
    const flux = textes.map((t) => `BT /F1 12 Tf ${t.x} ${t.y} Td (${t.s}) Tj ET`).join('\n');
    objets.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`);
    objets.push(`<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`);
  });
  let sortie = '%PDF-1.4\n';
  const decalages: number[] = [];
  objets.forEach((o, i) => {
    decalages.push(sortie.length);
    sortie += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const debutXref = sortie.length;
  sortie += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
  for (const d of decalages) sortie += `${String(d).padStart(10, '0')} 00000 n \n`;
  sortie += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${debutXref}\n%%EOF\n`;
  return new TextEncoder().encode(sortie);
}

async function code(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return e instanceof ErreurPdf ? e.code : `autre:${String(e)}`;
  }
  return 'aucune';
}

afterEach(() => vi.restoreAllMocks());

describe('extraireTextePdf', () => {
  it('deux-lignes-dans-l-ordre', async () => {
    const pdf = fabriquerPdf([[{ x: 50, y: 500, s: 'Deuxieme ligne Banque Exemple' }, { x: 50, y: 700, s: 'Premiere ligne Banque Exemple' }]]);
    const r = await extraireTextePdf(pdf, LIMITES);
    expect(r.pages).toHaveLength(1);
    expect(r.pages[0]?.numero).toBe(1);
    expect(r.pages[0]?.lignes).toEqual(['Premiere ligne Banque Exemple', 'Deuxieme ligne Banque Exemple']);
  });

  it('colonnes-triees-par-abscisse', async () => {
    const pdf = fabriquerPdf([[{ x: 300, y: 600, s: 'Droite' }, { x: 50, y: 600, s: 'Gauche' }, { x: 150, y: 600, s: 'Milieu' }]]);
    const r = await extraireTextePdf(pdf, LIMITES);
    expect(r.pages[0]?.lignes).toEqual(['Gauche Milieu Droite']);
  });

  it('deux-fragments-meme-abscisse-gardes', async () => {
    const pdf = fabriquerPdf([[{ x: 50, y: 600, s: 'Alpha' }, { x: 50, y: 600, s: 'Beta' }]]);
    const r = await extraireTextePdf(pdf, LIMITES);
    expect(r.pages[0]?.lignes).toHaveLength(1);
    expect(r.pages[0]?.lignes[0]).toContain('Alpha');
    expect(r.pages[0]?.lignes[0]).toContain('Beta');
  });

  it('trop-gros-refuse', async () => {
    const pdf = fabriquerPdf([[{ x: 50, y: 600, s: 'Banque Exemple' }]]);
    expect(pdf.length).toBeGreaterThan(100);
    expect(await code(extraireTextePdf(pdf, { octetsMax: 100, pagesMax: 5 }))).toBe('trop_gros');
  });

  it('trop-de-pages-refuse', async () => {
    const pdf = fabriquerPdf([[{ x: 50, y: 600, s: 'Un' }], [{ x: 50, y: 600, s: 'Deux' }], [{ x: 50, y: 600, s: 'Trois' }]]);
    expect(await code(extraireTextePdf(pdf, { octetsMax: 100_000, pagesMax: 2 }))).toBe('trop_de_pages');
    const ok = await extraireTextePdf(pdf, { octetsMax: 100_000, pagesMax: 3 });
    expect(ok.pages.map((p) => p.numero)).toEqual([1, 2, 3]);
  });

  it('pas-un-pdf-refuse', async () => {
    const csv = new TextEncoder().encode('date;libelle;montant\n2026-01-02;Banque Exemple;12,00\n');
    expect(await code(extraireTextePdf(csv, LIMITES))).toBe('pas_un_pdf');
    expect(await code(extraireTextePdf(new Uint8Array(0), LIMITES))).toBe('pas_un_pdf');
  });

  it('sans-texte-refuse', async () => {
    expect(await code(extraireTextePdf(fabriquerPdf([[]]), LIMITES))).toBe('sans_texte');
  });

  it('limites-invalides-refusees', async () => {
    const pdf = fabriquerPdf([[{ x: 50, y: 600, s: 'Banque Exemple' }]]);
    for (const v of [Number.NaN, Number.POSITIVE_INFINITY, 1.5, -1, 0]) {
      expect(await code(extraireTextePdf(pdf, { octetsMax: v, pagesMax: 5 }))).toBe('limites_invalides');
      expect(await code(extraireTextePdf(pdf, { octetsMax: 100_000, pagesMax: v }))).toBe('limites_invalides');
    }
  });

  it('aucune-evaluation', async () => {
    const evalEspion = vi.spyOn(globalThis, 'eval');
    const original = globalThis.Function;
    const appels: unknown[] = [];
    const Espion = new Proxy(original, {
      apply: (...a) => (appels.push(a), Reflect.apply(...a)),
      construct: (...a) => (appels.push(a), Reflect.construct(...a)),
    });
    globalThis.Function = Espion;
    try {
      const pdf = fabriquerPdf([[{ x: 50, y: 600, s: 'Banque Exemple' }]]);
      const r = await extraireTextePdf(pdf, LIMITES);
      expect(r.pages[0]?.lignes).toEqual(['Banque Exemple']);
    } finally {
      globalThis.Function = original;
    }
    expect(evalEspion).not.toHaveBeenCalled();
    expect(appels).toHaveLength(0);
  });

  it('message-sans-contenu-du-releve', async () => {
    const csv = new TextEncoder().encode('SECRETFICTIF;ligne');
    try {
      await extraireTextePdf(csv, LIMITES);
    } catch (e) {
      expect((e as Error).message).not.toContain('SECRETFICTIF');
    }
  });
});
