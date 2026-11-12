// Extracteur de texte PDF par pdf.js : sans script, sans évaluation, sans ressource réseau.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { ElementTexte, PageVue } from '../../../../../packages/noyau/src/pieces/sensibles/texte-cache.js';
import type { Extracteur, ResultatExtraction } from '../ports.js';

type Couleur = [number, number, number];
const NOIR: Couleur = [0, 0, 0];
const BLANC: Couleur = [255, 255, 255];
const NOMS_FACTURX = ['factur-x.xml', 'zugferd-invoice.xml'];
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const options = (octets: Uint8Array) => ({
  data: new Uint8Array(octets), isEvalSupported: false, enableScripting: false, disableFontFace: true, useSystemFonts: false,
  useWorkerFetch: false, disableRange: true, disableStream: true, disableAutoFetch: true, verbosity: 0,
});

// pdf.js fournit la couleur de remplissage en « #rrggbb » ; autre forme : noir.
const lireCouleur = (a: unknown[]): Couleur => {
  const h = typeof a[0] === 'string' ? /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(a[0]) : null;
  return h ? [parseInt(h[1]!, 16), parseInt(h[2]!, 16), parseInt(h[3]!, 16)] : NOIR;
};

type Affichage = { texte: string; couleur: Couleur; invisible: boolean; calqueMasque: boolean };
const sansBlancs = (t: string): string => t.replace(/\s+/g, '');
const luminance = (c: Couleur): number => c[0] + c[1] + c[2];

async function affichagesDeTexte(page: pdfjs.PDFPageProxy, calques: { isVisible(g: never): boolean }): Promise<Affichage[]> {
  const { OPS } = pdfjs;
  const liste = await page.getOperatorList();
  const sortie: Affichage[] = [];
  const pile: { couleur: Couleur; rendu: number }[] = [];
  const marques: boolean[] = [];
  let courante = NOIR;
  let rendu = 0;
  liste.fnArray.forEach((op, i) => {
    const a = liste.argsArray[i] as unknown[] | undefined;
    if (op === OPS.save) pile.push({ couleur: courante, rendu });
    else if (op === OPS.restore) ({ couleur: courante, rendu } = pile.pop() ?? { couleur: NOIR, rendu: 0 });
    else if ((op === OPS.setFillRGBColor || op === OPS.setFillGray) && a) courante = lireCouleur(a);
    else if (op === OPS.setTextRenderingMode && a) rendu = num(a[0]);
    else if (op === OPS.beginMarkedContent) marques.push(false);
    else if (op === OPS.beginMarkedContentProps) {
      const props = a?.[1] as { type?: string } | undefined;
      let masque = false;
      if (a?.[0] === 'OC' && props && typeof props.type === 'string') {
        try { masque = !calques.isVisible(props as never); } catch { masque = true; }
      }
      marques.push(masque);
    } else if (op === OPS.endMarkedContent) marques.pop();
    else if ((op === OPS.showText || op === OPS.showSpacedText) && a) {
      const glyphes = Array.isArray(a[0]) ? (a[0] as { unicode?: unknown }[]) : [];
      const texte = glyphes.map((g) => (typeof g?.unicode === 'string' ? g.unicode : '')).join('');
      sortie.push({ texte, couleur: courante, invisible: rendu === 3 || rendu === 7, calqueMasque: marques.some(Boolean) });
    }
  });
  return sortie;
}

// pdf.js fusionne des affichages voisins : on rattache chaque élément aux affichages qu'il recouvre (alignement sur les
// caractères hors blancs) et on retient le pire cas (couleur la plus claire, caché si un morceau l'est ; sans alignement sûr : toute la page).
function etatDesElements(affichages: Affichage[], textes: string[]): { couleur: Couleur; calqueMasque: boolean }[] {
  const pire = (liste: Affichage[]) => ({
    couleur: liste.map((x) => (x.invisible ? BLANC : x.couleur)).reduce((m, c) => (luminance(c) > luminance(m) ? c : m), NOIR),
    calqueMasque: liste.some((x) => x.calqueMasque),
  });
  const proprietaire = affichages.flatMap((x) => Array.from({ length: sansBlancs(x.texte).length }, () => x));
  if (textes.reduce((n, t) => n + sansBlancs(t).length, 0) !== proprietaire.length) return textes.map(() => pire(affichages));
  let curseur = 0;
  return textes.map((t) => {
    const n = sansBlancs(t).length;
    curseur += n;
    return pire([...new Set(proprietaire.slice(curseur - n, curseur))]);
  });
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
        const affichages = await affichagesDeTexte(page, calques);
        const items = ((await page.getTextContent()).items as unknown as Record<string, unknown>[]).filter((it) => typeof it.str === 'string' && it.str !== '');
        const etats = etatDesElements(affichages, items.map((it) => it.str as string));
        items.forEach((it, k) => {
          const t = (it.transform as number[] | undefined) ?? [];
          if ((it.str as string).trim() === '') return;
          const { couleur, calqueMasque } = etats[k]!;
          elements.push({ texte: it.str as string, page: numero, x: num(t[4]), y: num(t[5]), largeur: num(it.width), hauteur: num(it.height),
            taillePolice: Math.hypot(num(t[0]), num(t[1])), couleur, couleurFond: BLANC, calqueVisible: !calqueMasque, annotationCachee: false });
        });
        for (const an of await page.getAnnotations()) {
          const texte = typeof an.contentsObj?.str === 'string' ? an.contentsObj.str : typeof an.fieldValue === 'string' ? an.fieldValue : '';
          if (texte.trim() === '' || !Array.isArray(an.rect)) continue;
          const [ax = 0, ay = 0, bx = 0, by = 0] = an.rect as number[];
          const cachee = (num(an.annotationFlags) & 0b100010) !== 0 || an.hidden === true;
          elements.push({ texte, page: numero, x: Math.min(ax, bx), y: Math.min(ay, by), largeur: Math.abs(bx - ax), hauteur: Math.abs(by - ay),
            taillePolice: 12, couleur: NOIR, couleurFond: BLANC, calqueVisible: true, annotationCachee: cachee });
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
      let facturx: Uint8Array | null = null;
      const autres: string[] = [];
      for (const [id, f] of (await doc.getAttachments()) ?? []) {
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
