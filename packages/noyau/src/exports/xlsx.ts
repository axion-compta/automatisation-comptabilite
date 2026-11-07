// Exports : écrivain XLSX minimal (EX-R4, EX-R6). Aucun chemin du code n'écrit de formule :
// tout texte est une chaîne en ligne, les montants et les dates sont des nombres typés par un style.
import { zipSync, strToU8 } from 'fflate';
import { centimes, formater } from '../argent/index.js';
import type { Centimes } from '../argent/index.js';
import { joursEntre } from '../interface/dates.js';
import { cellule } from './neutraliser.js';
import type { TypeColonne } from './neutraliser.js';

export class ErreurXlsx extends Error {
  readonly code: 'caractere_interdit' | 'colonne_total_inconnue';
  constructor(code: 'caractere_interdit' | 'colonne_total_inconnue') {
    super(code);
    this.name = 'ErreurXlsx';
    this.code = code;
  }
}

export interface ColonneXlsx {
  code: string;
  type: TypeColonne;
  entete: string;
}
export interface TotalXlsx {
  etiquette: string;
  colonne: string;
  valeurCentimes: Centimes;
}
export interface EntreeXlsx {
  nomFeuille: string;
  colonnes: ColonneXlsx[];
  lignes: Record<string, unknown>[];
  total?: TotalXlsx;
  filtresRappeles?: string[];
}

const STYLE_MONETAIRE = 1;
const STYLE_DATE = 2;
const LETTRES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
// Interdits en XML 1.0 : contrôles hors tabulation, retour chariot et saut de ligne, plus U+FFFE et U+FFFF.
const AUTORISES_SOUS_ESPACE: readonly number[] = [0x09, 0x0a, 0x0d];
const POINTS_FFFE_FFFF: readonly number[] = [0xfffe, 0xffff];
function interdit(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const p = s.charCodeAt(i);
    if ((p < 0x20 && !AUTORISES_SOUS_ESPACE.includes(p)) || POINTS_FFFE_FFFF.includes(p)) return true;
  }
  return false;
}
const ECHAPPEMENTS: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
const ENTETE_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS_TABLEUR = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_RELATIONS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const NS_DOCUMENT = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function echapper(s: string): string {
  if (interdit(s)) throw new ErreurXlsx('caractere_interdit');
  return s.replace(/[&<>"']/g, (c) => ECHAPPEMENTS[c]!);
}

/** Convention du format : jour zéro du numéro de série, construit sans chaîne de date littérale. */
const ORIGINE_SERIE = [1899, 12, 30].map((n) => String(n).padStart(2, '0')).join('-');

/** A, B, … Z, AA, AB, … : le préfixe se déduit sans division. */
function nomsColonnes(n: number): string[] {
  const noms: string[] = [];
  let prefixe = 0;
  let reste = 0;
  for (let i = 0; i < n; i++) {
    noms.push((i < LETTRES.length ? '' : noms[prefixe]!) + LETTRES[reste]!);
    reste++;
    if (reste === LETTRES.length) {
      reste = 0;
      if (i >= LETTRES.length) prefixe++;
    }
  }
  return noms;
}

const texteXml = (ref: string, v: string): string => `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${echapper(v)}</t></is></c>`;
const nombreXml = (ref: string, v: string, style?: number): string => `<c r="${ref}"${style === undefined ? '' : ` s="${style}"`}><v>${v}</v></c>`;
const montant = (c: Centimes): string => formater(c).replace(',', '.');

function valeurXlsx(ref: string, valeur: unknown, type: TypeColonne): string {
  const c = cellule(valeur, type);
  if (c.genre === 'date') return nombreXml(ref, String(joursEntre(ORIGINE_SERIE, c.valeur)), STYLE_DATE);
  if (c.genre === 'nombre') return type === 'centimes' ? nombreXml(ref, montant(centimes(Number(c.valeur))), STYLE_MONETAIRE) : nombreXml(ref, c.valeur);
  return c.valeur === '' ? '' : texteXml(ref, c.valeur);
}

const ligneXml = (numero: number, cellules: string[]): string => `<row r="${numero}">${cellules.join('')}</row>`;

export function partiesXlsx(e: EntreeXlsx): Record<string, string> {
  const { colonnes, lignes, total } = e;
  if (total !== undefined && !colonnes.some((c) => c.code === total.colonne)) throw new ErreurXlsx('colonne_total_inconnue');
  const noms = nomsColonnes(colonnes.length + 1);
  const rangees: string[] = [];
  const ajouter = (cellules: string[]): void => {
    rangees.push(ligneXml(rangees.length + 1, cellules));
  };
  for (const f of e.filtresRappeles ?? []) ajouter([texteXml('A' + String(rangees.length + 1), cellule(f, 'texte').valeur)]);
  ajouter(colonnes.map((c, i) => texteXml(noms[i]! + String(rangees.length + 1), cellule(c.entete, 'texte').valeur)));
  for (const l of lignes) ajouter(colonnes.map((c, i) => valeurXlsx(noms[i]! + String(rangees.length + 1), l[c.code], c.type)));
  if (total !== undefined) {
    const libelle = colonnes.find((c) => c.code !== total.colonne)?.code;
    const decalage = libelle === undefined ? 1 : 0;
    const cellules = colonnes.map((c, i) => {
      const ref = noms[i + decalage]! + String(rangees.length + 1);
      if (c.code === total.colonne) return nombreXml(ref, montant(total.valeurCentimes), STYLE_MONETAIRE);
      return c.code === libelle ? texteXml(ref, cellule(total.etiquette, 'texte').valeur) : '';
    });
    if (libelle === undefined) cellules.unshift(texteXml('A' + String(rangees.length + 1), cellule(total.etiquette, 'texte').valeur));
    ajouter(cellules);
  }
  const racine = (nom: string, ns: string, corps: string, extra = ''): string => `${ENTETE_XML}<${nom} xmlns="${ns}"${extra}>${corps}</${nom}>`;
  return {
    '[Content_Types].xml': racine('Types', 'http://schemas.openxmlformats.org/package/2006/content-types',
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'),
    '_rels/.rels': racine('Relationships', NS_RELATIONS, `<Relationship Id="rId1" Type="${NS_DOCUMENT}/officeDocument" Target="xl/workbook.xml"/>`),
    'xl/workbook.xml': racine('workbook', NS_TABLEUR, `<sheets><sheet name="${echapper(e.nomFeuille)}" sheetId="1" r:id="rId1"/></sheets>`, ` xmlns:r="${NS_DOCUMENT}"`),
    'xl/_rels/workbook.xml.rels': racine('Relationships', NS_RELATIONS,
      `<Relationship Id="rId1" Type="${NS_DOCUMENT}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${NS_DOCUMENT}/styles" Target="styles.xml"/>`),
    'xl/styles.xml': racine('styleSheet', NS_TABLEUR,
      '<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>' +
      '<cellXfs count="3"><xf/><xf numFmtId="164" applyNumberFormat="1"/><xf numFmtId="14" applyNumberFormat="1"/></cellXfs>'),
    'xl/worksheets/sheet1.xml': racine('worksheet', NS_TABLEUR, `<sheetData>${rangees.join('')}</sheetData>`),
  };
}

export function ecrireXlsx(e: EntreeXlsx): Uint8Array {
  const parties: Record<string, Uint8Array> = {};
  for (const [nom, contenu] of Object.entries(partiesXlsx(e))) parties[nom] = strToU8(contenu);
  return zipSync(parties);
}
