import { afterEach, describe, expect, it, vi } from 'vitest';

const optionsVues: Record<string, unknown>[] = [];
vi.mock('pdfjs-dist/legacy/build/pdf.mjs', async (original) => {
  const m = await original<typeof import('pdfjs-dist/legacy/build/pdf.mjs')>();
  return { ...m, getDocument: (o: Record<string, unknown>) => { optionsVues.push(o); return m.getDocument(o as never); } };
});
const { ExtracteurPdf } = await import('../extracteur-pdf.js');

type Texte = { x: number; y: number; s: string; couleur?: string; taille?: number };
type Piece = { textes: Texte[]; catalogue?: string; extras?: string[]; annots?: string };
const flux = (contenu: string): string => `<< /Length ${contenu.length} >>\nstream\n${contenu}\nendstream`;

// Objets : 1 catalogue, 2 pages, 3 police, 4 page, 5 contenu, puis les extras (6, 7, ...).
function fabriquer({ textes, catalogue = '', extras = [], annots = '' }: Piece): Uint8Array {
  const contenu = textes.map((t) => `BT ${t.couleur ?? '0 0 0'} rg /F1 ${t.taille ?? 12} Tf ${t.x} ${t.y} Td (${t.s}) Tj ET`).join('\n');
  const objets = [
    `<< /Type /Catalog /Pages 2 0 R ${catalogue} >>`,
    '<< /Type /Pages /Kids [4 0 R] /Count 1 >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R ${annots} >>`,
    flux(contenu),
    ...extras,
  ];
  let sortie = '%PDF-1.7\n';
  const decalages = objets.map((o, i) => { const d = sortie.length; sortie += `${i + 1} 0 obj\n${o}\nendobj\n`; return d; });
  const xref = sortie.length;
  sortie += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n${decalages.map((d) => `${String(d).padStart(10, '0')} 00000 n \n`).join('')}`;
  sortie += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(sortie);
}
const avecFichiers = (noms: string[], contenus: string[]): Piece => ({
  textes: [{ x: 50, y: 700, s: 'Facture fictive' }],
  catalogue: `/Names << /EmbeddedFiles << /Names [${noms.map((n, i) => `(${n}) ${6 + i * 2} 0 R`).join(' ')}] >> >>`,
  extras: noms.flatMap((n, i) => [`<< /Type /Filespec /F (${n}) /EF << /F ${7 + i * 2} 0 R >> >>`, `<< /Type /EmbeddedFile ${flux(contenus[i] ?? '').slice(3)}`]),
});

afterEach(() => { vi.unstubAllGlobals(); optionsVues.length = 0; });

describe('ExtracteurPdf', () => {
  it('pdf-texte-et-positions', async () => {
    const pdf = fabriquer({ textes: [{ x: 50, y: 700, s: 'Facture fictive', taille: 14 }, { x: 60, y: 600, s: 'Rouge', couleur: '1 0 0' }] });
    const r = await new ExtracteurPdf().extraire(pdf);
    expect(r.nbPages).toBe(1);
    expect(r.pages).toEqual([{ numero: 1, largeur: 600, hauteur: 800 }]);
    expect(r.elements).toHaveLength(2);
    const [a, b] = r.elements;
    expect(a).toMatchObject({ texte: 'Facture fictive', page: 1, x: 50, y: 700, taillePolice: 14, couleur: [0, 0, 0], couleurFond: [255, 255, 255], calqueVisible: true, annotationCachee: false });
    expect(a!.largeur).toBeGreaterThan(20);
    expect(a!.hauteur).toBeGreaterThan(5);
    expect(b).toMatchObject({ texte: 'Rouge', x: 60, y: 600, couleur: [255, 0, 0] });
  });

  it('pdf-avec-javascript-non-execute', async () => {
    const pdf = fabriquer({
      textes: [{ x: 50, y: 700, s: 'Texte visible' }],
      catalogue: '/OpenAction 6 0 R',
      extras: ['<< /S /JavaScript /JS (app.alert\\(1\\);) >>'],
    });
    const r = await new ExtracteurPdf().extraire(pdf);
    expect(r.elements.map((e) => e.texte)).toEqual(['Texte visible']);
    expect(optionsVues).toHaveLength(1);
    expect(optionsVues[0]).toMatchObject({ isEvalSupported: false, enableScripting: false, useWorkerFetch: false, disableFontFace: true, useSystemFonts: false });
  });

  it('facturx-incorpore-extrait', async () => {
    const xml = '<rsm:CrossIndustryInvoice>fictif</rsm:CrossIndustryInvoice>';
    const r = await new ExtracteurPdf().fichiersIncorpores(fabriquer(avecFichiers(['factur-x.xml'], [xml])));
    expect(r.autres).toEqual([]);
    expect(new TextDecoder().decode(r.facturx ?? new Uint8Array())).toBe(xml);
    const z = await new ExtracteurPdf().fichiersIncorpores(fabriquer(avecFichiers(['zugferd-invoice.xml'], ['<a/>'])));
    expect(new TextDecoder().decode(z.facturx ?? new Uint8Array())).toBe('<a/>');
  });

  it('autre-fichier-incorpore-signale', async () => {
    const r = await new ExtracteurPdf().fichiersIncorpores(fabriquer(avecFichiers(['factur-x.xml', 'programme-fictif.exe'], ['<a/>', 'MZ-secret'])));
    expect(r.autres).toEqual(['programme-fictif.exe']);
    expect(r.facturx).not.toBeNull();
    const seul = await new ExtracteurPdf().fichiersIncorpores(fabriquer(avecFichiers(['notes.txt'], ['x'])));
    expect(seul).toEqual({ facturx: null, autres: ['notes.txt'] });
    expect(await new ExtracteurPdf().fichiersIncorpores(fabriquer({ textes: [] }))).toEqual({ facturx: null, autres: [] });
  });

  it('aucun-appel-reseau', async () => {
    const fetchEspion = vi.fn(() => Promise.reject(new Error('réseau interdit')));
    vi.stubGlobal('fetch', fetchEspion);
    vi.stubGlobal('XMLHttpRequest', function () { throw new Error('réseau interdit'); });
    const e = new ExtracteurPdf();
    const r = await e.extraire(fabriquer({ textes: [{ x: 50, y: 700, s: 'Police standard non incorporée' }] }));
    await e.fichiersIncorpores(fabriquer(avecFichiers(['factur-x.xml'], ['<a/>'])));
    expect(r.elements).toHaveLength(1);
    expect(fetchEspion).not.toHaveBeenCalled();
    expect(optionsVues.every((o) => o.useWorkerFetch === false && o.disableRange === true && o.disableStream === true && o.disableAutoFetch === true)).toBe(true);
    expect(optionsVues.every((o) => o.standardFontDataUrl === undefined && o.cMapUrl === undefined)).toBe(true);
  });
});
