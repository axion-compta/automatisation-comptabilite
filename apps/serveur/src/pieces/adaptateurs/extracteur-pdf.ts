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

// Un affichage de texte (opérateur showText) avec l'état graphique en vigueur.
type Affichage = { texte: string; couleur: Couleur; invisible: boolean; calqueMasque: boolean };
const sansBlancs = (t: string): string => t.replace(/\s+/g, '');
const luminance = (c: Couleur): number => c[0] + c[1] + c[2];
const taillePoliceAnnotation = 12; // valeur de repli, sans portée légale : sert seulement au filtre de taille

// Affichages de texte dans l'ordre du flux : couleur, mode de rendu (3 = invisible) et calque optionnel.
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
      let visible = true;
      if (a?.[0] === 'OC' && props && typeof props === 'object' && typeof props.type === 'string') {
        try { visible = calques.isVisible(props as never); } catch { visible = false; }
      }
      marques.push(!visible);
    } else if (op === OPS.endMarkedContent) marques.pop();
    else if ((op === OPS.showText || op === OPS.showSpacedText) && a) {
      const glyphes = Array.isArray(a[0]) ? (a[0] as unknown[]) : [];
      const texte = glyphes.map((g) => (g && typeof g === 'object' && typeof (g as { unicode?: unknown }).unicode === 'string' ? (g as { unicode: string }).unicode : '')).join('');
      sortie.push({ texte, couleur: courante, invisible: rendu === 3, calqueMasque: marques.some(Boolean) });
    }
  });
  return sortie;
}

// pdf.js fusionne des affichages voisins en un seul élément : on rattache chaque élément aux affichages
// qu'il recouvre (alignement sur les caractères hors blancs) et on retient le cas le plus défavorable
// (couleur la plus claire, caché si un seul morceau l'est). Sans alignement sûr : pire cas de la page.
function etatDesElements(affichages: Affichage[], textes: string[]): { couleur: Couleur; calqueMasque: boolean }[] {
  const pire = (liste: Affichage[]) => {
    let couleur = NOIR;
    for (const x of liste) { const c = x.invisible ? BLANC : x.couleur; if (luminance(c) > luminance(couleur)) couleur = c; }
    return { couleur, calqueMasque: liste.some((x) => x.calqueMasque) };
  };
  const proprietaire: Affichage[] = [];
  for (const x of affichages) for (let k = 0; k < sansBlancs(x.texte).length; k++) proprietaire.push(x);
  const total = textes.reduce((n, t) => n + sansBlancs(t).length, 0);
  if (total !== proprietaire.length) return textes.map(() => pire(affichages));
  let curseur = 0;
  return textes.map((t) => {
    const n = sansBlancs(t).length;
    const morceau = proprietaire.slice(curseur, curseur + n);
    curseur += n;
    return pire([...new Set(morceau)]);
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
        const contenu = await page.getTextContent();
        const items = (contenu.items as unknown as Record<string, unknown>[]).filter((it) => typeof it.str === 'string' && it.str !== '');
        const etats = etatDesElements(affichages, items.map((it) => it.str as string));
        items.forEach((it, k) => {
          const str = it.str as string;
          if (str.trim() === '') return;
          const t = (it.transform as number[] | undefined) ?? [];
          const etat = etats[k]!;
          elements.push({
            texte: str, page: numero, x: num(t[4]), y: num(t[5]), largeur: num(it.width), hauteur: num(it.height),
            taillePolice: Math.hypot(num(t[0]), num(t[1])), couleur: etat.couleur, couleurFond: BLANC, calqueVisible: !etat.calqueMasque, annotationCachee: false,
          });
        });
        for (const an of await page.getAnnotations()) {
          const texte = typeof an.contentsObj?.str === 'string' ? an.contentsObj.str : typeof an.fieldValue === 'string' ? an.fieldValue : '';
          if (texte.trim() === '' || !Array.isArray(an.rect)) continue;
          const [ax = 0, ay = 0, bx = 0, by = 0] = an.rect as number[];
          elements.push({
            texte, page: numero, x: Math.min(ax, bx), y: Math.min(ay, by), largeur: Math.abs(bx - ax), hauteur: Math.abs(by - ay),
            taillePolice: taillePoliceAnnotation, couleur: NOIR, couleurFond: BLANC, calqueVisible: true, annotationCachee: ((num(an.annotationFlags) & 0b100010) !== 0) || an.hidden === true,
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
