// Extracteur de texte PDF par pdf.js : sans script, sans évaluation, sans ressource réseau.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { ElementTexte, PageVue } from '../../../../../packages/noyau/src/pieces/sensibles/texte-cache.js';
import type { Extracteur, ResultatExtraction } from '../ports.js';

type Couleur = [number, number, number];
const NOIR: Couleur = [0, 0, 0];
const BLANC: Couleur = [255, 255, 255];
const NOMS_FACTURX = ['factur-x.xml', 'zugferd-invoice.xml'];

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const octet = (v: unknown): number => Math.max(0, Math.min(255, Math.round(num(v))));

function options(octets: Uint8Array) {
  return {
    data: new Uint8Array(octets), isEvalSupported: false, enableScripting: false, disableFontFace: true, useSystemFonts: false,
    useWorkerFetch: false, disableRange: true, disableStream: true, disableAutoFetch: true, verbosity: 0,
  };
}

// pdf.js fournit la couleur en « #rrggbb » (ou, à défaut, en composantes).
function lireCouleur(a: unknown[]): Couleur {
  const h = typeof a[0] === 'string' ? /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(a[0]) : null;
  if (h) return [parseInt(h[1]!, 16), parseInt(h[2]!, 16), parseInt(h[3]!, 16)];
  return a.length >= 3 ? [octet(a[0]), octet(a[1]), octet(a[2])] : [octet(a[0]), octet(a[0]), octet(a[0])];
}

// Couleur de remplissage en vigueur à chaque affichage de texte, dans l'ordre du flux.
async function couleursDeTexte(page: pdfjs.PDFPageProxy): Promise<Couleur[]> {
  const { OPS } = pdfjs;
  const liste = await page.getOperatorList();
  const sortie: Couleur[] = [];
  const pile: Couleur[] = [];
  let courante = NOIR;
  liste.fnArray.forEach((op, i) => {
    const a = liste.argsArray[i] as unknown[] | undefined;
    if (op === OPS.save) pile.push(courante);
    else if (op === OPS.restore) courante = pile.pop() ?? NOIR;
    else if ((op === OPS.setFillRGBColor || op === OPS.setFillGray) && a) courante = lireCouleur(a);
    else if (op === OPS.showText || op === OPS.showSpacedText) sortie.push(courante);
  });
  return sortie;
}

export class ExtracteurPdf implements Extracteur {
  async extraire(octets: Uint8Array): Promise<ResultatExtraction> {
    const tache = pdfjs.getDocument(options(octets));
    try {
      const doc = await tache.promise;
      const calques = await doc.getOptionalContentConfig();
      const elements: ElementTexte[] = [];
      const pages: PageVue[] = [];
      for (let numero = 1; numero <= doc.numPages; numero++) {
        const page = await doc.getPage(numero);
        const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = page.view;
        pages.push({ numero, largeur: x1 - x0, hauteur: y1 - y0 });
        const couleurs = await couleursDeTexte(page);
        const contenu = await page.getTextContent({ includeMarkedContent: true });
        const calqueMasque: boolean[] = [];
        let rang = 0;
        for (const it of contenu.items as unknown as Record<string, unknown>[]) {
          if (it.type === 'beginMarkedContentProps') {
            calqueMasque.push(it.tag === 'OC' && typeof it.id === 'string' && calques.isVisible({ type: 'OCG', id: it.id.replace(/^.*_/, '') } as never) === false);
          } else if (it.type === 'beginMarkedContent') calqueMasque.push(false);
          else if (it.type === 'endMarkedContent') calqueMasque.pop();
          else if (typeof it.str === 'string') {
            const t = (it.transform as number[] | undefined) ?? [];
            if (it.str === '') continue; // marque de fin de ligne : ne correspond à aucun affichage de texte
            const couleur = couleurs[rang++] ?? NOIR;
            if (it.str.trim() === '') continue;
            elements.push({
              texte: it.str, page: numero, x: num(t[4]), y: num(t[5]), largeur: num(it.width), hauteur: num(it.height),
              taillePolice: Math.hypot(num(t[0]), num(t[1])), couleur, couleurFond: BLANC, calqueVisible: !calqueMasque.some(Boolean), annotationCachee: false,
            });
          }
        }
        for (const an of await page.getAnnotations()) {
          const texte = typeof an.contentsObj?.str === 'string' ? an.contentsObj.str : typeof an.fieldValue === 'string' ? an.fieldValue : '';
          if (texte.trim() === '' || !Array.isArray(an.rect)) continue;
          const [ax = 0, ay = 0, bx = 0, by = 0] = an.rect as number[];
          elements.push({
            texte, page: numero, x: Math.min(ax, bx), y: Math.min(ay, by), largeur: Math.abs(bx - ax), hauteur: Math.abs(by - ay),
            taillePolice: 12, couleur: NOIR, couleurFond: BLANC, calqueVisible: true, annotationCachee: ((num(an.annotationFlags) & 0b100010) !== 0) || an.hidden === true,
          });
        }
      }
      return { elements, pages, nbPages: doc.numPages };
    } finally {
      await tache.destroy();
    }
  }

  // Seul factur-x.xml / zugferd-invoice.xml est rendu ; tout autre fichier n'est signalé que par son nom.
  async fichiersIncorpores(octets: Uint8Array): Promise<{ facturx: Uint8Array | null; autres: string[] }> {
    const tache = pdfjs.getDocument(options(octets));
    try {
      const doc = await tache.promise;
      const pieces = await doc.getAttachments();
      let facturx: Uint8Array | null = null;
      const autres: string[] = [];
      for (const [id, f] of pieces ?? []) {
        const nom = String(f.filename ?? id);
        if (facturx === null && NOMS_FACTURX.includes(nom.toLowerCase())) {
          const contenu = await doc.getAttachmentContent(id);
          if (contenu) { facturx = new Uint8Array(contenu); continue; }
        }
        autres.push(nom);
      }
      return { facturx, autres };
    } finally {
      await tache.destroy();
    }
  }
}
