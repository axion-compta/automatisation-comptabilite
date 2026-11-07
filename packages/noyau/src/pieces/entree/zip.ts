import { ErreurPiece } from '../types.js';

export interface EntreeZip {
  nom: string;
  nomBrut: Uint8Array;
  utf8: boolean;
  chiffre: boolean;
  methode: number;
  tailleCompressee: number;
  tailleDecompressee: number;
}
export type Conteneur = 'docx' | 'xlsx' | 'odt' | 'zip' | { refus: 'macro_refusee' };

const CP437_HAUT =
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ';
const TAILLE_FIN = 22;
const TAILLE_ENTREE = 46;
const MAX_COMMENTAIRE = 65535;

const refus = (): ErreurPiece => new ErreurPiece('archive_refusee', 'zip_illisible');
const cp437 = (b: Uint8Array): string => Array.from(b, (v) => (v < 128 ? String.fromCharCode(v) : (CP437_HAUT[v - 128] as string))).join('');

export function lireRepertoireZip(octets: Uint8Array): EntreeZip[] {
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  let fin = -1;
  const plancher = Math.max(0, octets.length - TAILLE_FIN - MAX_COMMENTAIRE);
  for (let i = octets.length - TAILLE_FIN; i >= plancher; i--) {
    if (vue.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) throw refus();
  const nombre = vue.getUint16(fin + 10, true);
  const taille = vue.getUint32(fin + 12, true);
  const debut = vue.getUint32(fin + 16, true);
  if (nombre === 0xffff || taille === 0xffffffff || debut === 0xffffffff) throw refus();
  if (debut + taille > octets.length || nombre * TAILLE_ENTREE > taille) throw refus();
  const entrees: EntreeZip[] = [];
  let p = debut;
  for (let n = 0; n < nombre; n++) {
    if (p + TAILLE_ENTREE > debut + taille || vue.getUint32(p, true) !== 0x02014b50) throw refus();
    const drapeaux = vue.getUint16(p + 8, true);
    const compressee = vue.getUint32(p + 20, true);
    const decompressee = vue.getUint32(p + 24, true);
    const longNom = vue.getUint16(p + 28, true);
    const suite = vue.getUint16(p + 30, true) + vue.getUint16(p + 32, true);
    if (compressee === 0xffffffff || decompressee === 0xffffffff || vue.getUint32(p + 42, true) === 0xffffffff) throw refus();
    if (p + TAILLE_ENTREE + longNom + suite > debut + taille) throw refus();
    const nomBrut = octets.slice(p + TAILLE_ENTREE, p + TAILLE_ENTREE + longNom);
    const utf8 = (drapeaux & 0x800) !== 0;
    entrees.push({
      nom: utf8 ? new TextDecoder('utf-8').decode(nomBrut) : cp437(nomBrut),
      nomBrut, utf8, chiffre: (drapeaux & 1) !== 0, methode: vue.getUint16(p + 10, true),
      tailleCompressee: compressee, tailleDecompressee: decompressee,
    });
    p += TAILLE_ENTREE + longNom + suite;
  }
  return entrees;
}

export function classerConteneur(entrees: EntreeZip[]): Conteneur {
  const noms = new Set(entrees.map((e) => e.nom));
  if (entrees.some((e) => (e.nom.split(/[/\\]/).pop() as string).toLowerCase() === 'vbaproject.bin')) return { refus: 'macro_refusee' };
  if (noms.has('[Content_Types].xml')) {
    if (noms.has('word/document.xml')) return 'docx';
    if (noms.has('xl/workbook.xml')) return 'xlsx';
  }
  if (noms.has('mimetype') && noms.has('content.xml')) return 'odt';
  return 'zip';
}
