import { unzipSync } from 'fflate';

export type CodeErreurXlsx =
  | 'limites_invalides'
  | 'trop_gros'
  | 'archive_invalide'
  | 'feuille_absente'
  | 'decompression_trop_grande'
  | 'trop_de_lignes'
  | 'doctype_refuse';

export class ErreurXlsx extends Error {
  override name = 'ErreurXlsx';
  readonly code: CodeErreurXlsx;
  constructor(code: CodeErreurXlsx) {
    super(code);
    this.code = code;
  }
}

export interface LimitesXlsx {
  octetsMax: number;
  decompresseMax: number;
  lignesMax: number;
}

const FEUILLE = 'xl/worksheets/sheet1.xml';
const CHAINES = 'xl/sharedStrings.xml';
const COLONNES_MAX = 16_384; // limite technique du format, sans valeur légale
const REF = /^([A-Z]{1,3})([0-9]{1,9})$/;
const DOCTYPE = /<!\s*(doctype|entity)/i;

const entier = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n > 0;

interface Balise {
  attrs: string;
  corps: string;
}

// Parcours linéaire par indexOf : pas de retour arrière exponentiel.
function balises(xml: string, nom: string): Balise[] {
  const sortie: Balise[] = [];
  const ouvre = `<${nom}`;
  const ferme = `</${nom}>`;
  let i = 0;
  for (;;) {
    const d = xml.indexOf(ouvre, i);
    if (d < 0) return sortie;
    const suite = xml.charAt(d + ouvre.length);
    const fin = xml.indexOf('>', d);
    if (fin < 0) return sortie;
    i = fin + 1;
    if (suite !== ' ' && suite !== '>' && suite !== '/') continue;
    const auto = xml.charAt(fin - 1) === '/';
    const attrs = xml.slice(d + ouvre.length, auto ? fin - 1 : fin);
    if (auto) {
      sortie.push({ attrs, corps: '' });
      continue;
    }
    const f = xml.indexOf(ferme, i);
    if (f < 0) return sortie;
    sortie.push({ attrs, corps: xml.slice(i, f) });
    i = f + ferme.length;
  }
}

function attribut(attrs: string, nom: string): string | undefined {
  const m = new RegExp(`(?:^|\\s)${nom}="([^"]*)"`).exec(attrs);
  return m?.[1];
}

function decoder(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]{1,6}|#[0-9]{1,7}|amp|lt|gt|quot|apos);/g, (_, e: string) => {
    if (e === 'amp') return '&';
    if (e === 'lt') return '<';
    if (e === 'gt') return '>';
    if (e === 'quot') return '"';
    if (e === 'apos') return "'";
    const n = e.startsWith('#x') ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return n > 0 && n <= 0x10ffff && (n < 0xd800 || n > 0xdfff) ? String.fromCodePoint(n) : '';
  });
}

const texteDe = (corps: string): string => balises(corps, 't').map((b) => decoder(b.corps)).join('');

function colonne(lettres: string): number {
  let n = 0;
  for (const c of lettres) n = n * 26 + c.charCodeAt(0) - 64;
  return n - 1;
}

function extraire(octets: Uint8Array, limites: LimitesXlsx): Record<string, Uint8Array> {
  let trop = false;
  let fichiers: Record<string, Uint8Array>;
  try {
    fichiers = unzipSync(octets, {
      filter: (f) => {
        if (f.name !== FEUILLE && f.name !== CHAINES) return false;
        if (f.originalSize > limites.decompresseMax) trop = true;
        return !trop;
      },
    });
  } catch {
    throw new ErreurXlsx('archive_invalide');
  }
  if (trop) throw new ErreurXlsx('decompression_trop_grande');
  for (const v of Object.values(fichiers)) {
    if (v.length > limites.decompresseMax) throw new ErreurXlsx('decompression_trop_grande');
  }
  return fichiers;
}

function lireTexte(octets: Uint8Array): string {
  const t = new TextDecoder('utf-8').decode(octets);
  if (DOCTYPE.test(t)) throw new ErreurXlsx('doctype_refuse');
  return t;
}

export function lireXlsx(octets: Uint8Array, limites: LimitesXlsx): string[][] {
  if (![limites?.octetsMax, limites?.decompresseMax, limites?.lignesMax].every(entier)) {
    throw new ErreurXlsx('limites_invalides');
  }
  if (octets.length > limites.octetsMax) throw new ErreurXlsx('trop_gros');
  if (octets.length === 0) throw new ErreurXlsx('archive_invalide');
  const fichiers = extraire(octets, limites);
  const brut = fichiers[FEUILLE];
  if (!brut) throw new ErreurXlsx('feuille_absente');
  const feuille = lireTexte(brut);
  const partage = fichiers[CHAINES];
  const chaines = partage ? balises(lireTexte(partage), 'si').map((s) => texteDe(s.corps)) : [];

  const lignes: string[][] = [];
  for (const cellule of balises(feuille, 'c')) {
    const ref = REF.exec(attribut(cellule.attrs, 'r') ?? '');
    if (!ref) throw new ErreurXlsx('archive_invalide');
    const rang = Number(ref[2]);
    const col = colonne(ref[1] ?? '');
    if (rang > limites.lignesMax) throw new ErreurXlsx('trop_de_lignes');
    if (col >= COLONNES_MAX) throw new ErreurXlsx('archive_invalide');
    const type = attribut(cellule.attrs, 't');
    const v = balises(cellule.corps, 'v')[0]?.corps;
    let valeur = '';
    if (type === 'inlineStr') valeur = texteDe(cellule.corps);
    else if (v !== undefined && type === 's') {
      const indice = Number(v.trim());
      const trouve = Number.isSafeInteger(indice) ? chaines[indice] : undefined;
      if (trouve === undefined) throw new ErreurXlsx('archive_invalide');
      valeur = trouve;
    } else if (v !== undefined) valeur = decoder(v);
    while (lignes.length < rang) lignes.push([]);
    const ligne = lignes[rang - 1] as string[];
    while (ligne.length <= col) ligne.push('');
    ligne[col] = valeur;
  }
  return lignes;
}
