import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

export type CodeErreurPdf = 'limites_invalides' | 'trop_gros' | 'trop_de_pages' | 'pas_un_pdf' | 'sans_texte' | 'chiffre';

export class ErreurPdf extends Error {
  readonly code: CodeErreurPdf;
  constructor(code: CodeErreurPdf) {
    super(code);
    this.name = 'ErreurPdf';
    this.code = code;
  }
}

export type LimitesPdf = { octetsMax: number; pagesMax: number };
export type TextePdf = { pages: { numero: number; lignes: string[] }[] };

const SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];
const entierPositif = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0;

type Fragment = { str: string; transform: number[] };
const estFragment = (x: unknown): x is Fragment =>
  typeof x === 'object' && x !== null && typeof (x as Fragment).str === 'string' && Array.isArray((x as Fragment).transform);

function regrouper(fragments: Fragment[]): string[] {
  const lignes = new Map<number, { x: number; str: string }[]>();
  for (const f of fragments) {
    if (f.str.trim() === '') continue;
    const y = Math.round(f.transform[5] ?? 0);
    const x = f.transform[4] ?? 0;
    const l = lignes.get(y) ?? [];
    l.push({ x, str: f.str.trim() });
    lignes.set(y, l);
  }
  return [...lignes.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, l]) => l.sort((a, b) => a.x - b.x).map((p) => p.str).join(' '));
}

export async function extraireTextePdf(octets: Uint8Array, limites: LimitesPdf): Promise<TextePdf> {
  if (!entierPositif(limites.octetsMax) || !entierPositif(limites.pagesMax)) throw new ErreurPdf('limites_invalides');
  if (octets.length > limites.octetsMax) throw new ErreurPdf('trop_gros');
  if (octets.length < SIGNATURE.length || SIGNATURE.some((o, i) => octets[i] !== o)) throw new ErreurPdf('pas_un_pdf');
  const options = {
    data: new Uint8Array(octets),
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
    useWorkerFetch: false,
    disableRange: true,
    disableStream: true,
    disableAutoFetch: true,
    verbosity: 0,
  };
  const tache = pdfjs.getDocument(options);
  let doc: Awaited<typeof tache.promise>;
  try {
    doc = await tache.promise;
  } catch (e) {
    await tache.destroy();
    throw new ErreurPdf((e as { name?: string }).name === 'PasswordException' ? 'chiffre' : 'pas_un_pdf');
  }
  try {
    if (doc.numPages > limites.pagesMax) throw new ErreurPdf('trop_de_pages');
    const pages: TextePdf['pages'] = [];
    for (let numero = 1; numero <= doc.numPages; numero++) {
      const contenu = await (await doc.getPage(numero)).getTextContent();
      pages.push({ numero, lignes: regrouper((contenu.items as unknown[]).filter(estFragment)) });
    }
    if (pages.every((p) => p.lignes.length === 0)) throw new ErreurPdf('sans_texte');
    return { pages };
  } catch (e) {
    if (e instanceof ErreurPdf) throw e;
    throw new ErreurPdf('pas_un_pdf');
  } finally {
    await tache.destroy();
  }
}
