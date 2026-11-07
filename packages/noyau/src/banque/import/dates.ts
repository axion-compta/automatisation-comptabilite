// Dates des relevés : lecture par format explicite, choix du format d'un fichier. Calcul civil pur, aucun objet `Date`.
// L'heure et le fuseau d'un horodatage sont ignorés : on garde la date locale de la banque.
import { ErreurDate as ErreurCivile, ajouterJours, estDateValide } from '../../dates/civiles.js';

export type FormatDate =
  | 'JJ/MM/AAAA'
  | 'MM/JJ/AAAA'
  | 'JJ/MM/AA'
  | 'JJ.MM.AAAA'
  | 'JJ-MM-AAAA'
  | 'AAAA-MM-JJ'
  | 'AAAAMMJJ'
  | 'AAAAMMJJHHMMSS'
  | 'serie';

export interface OptionsDate {
  /** Début du siècle des années sur 2 chiffres (2000 pour 26 → 2026). */
  siecle?: number;
  /** Date `AAAA-MM-JJ` du numéro de série 0 du classeur. */
  origineSerie?: string;
}

export type ChoixFormat =
  | { type: 'unique'; format: FormatDate }
  | { type: 'question'; formats: [FormatDate, FormatDate] }
  | { type: 'aucun' };

export class ErreurDate extends Error {
  override name = 'ErreurDate';
  readonly code: 'date_invalide' | 'format_inconnu' | 'siecle_absent';
  constructor(code: 'date_invalide' | 'format_inconnu' | 'siecle_absent') {
    super(code);
    this.code = code;
  }
}

const MOTIFS: Record<Exclude<FormatDate, 'serie'>, RegExp> = {
  'JJ/MM/AAAA': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  'MM/JJ/AAAA': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  'JJ/MM/AA': /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/,
  'JJ.MM.AAAA': /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
  'JJ-MM-AAAA': /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
  'AAAA-MM-JJ': /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/,
  AAAAMMJJ: /^(\d{4})(\d{2})(\d{2})$/,
  AAAAMMJJHHMMSS: /^(\d{4})(\d{2})(\d{2})\d{6}(?:\.\d+)?(?:\[[^\]]*\])?$/,
};

function iso(annee: number, mois: number, jour: number): string {
  const texte = `${String(annee).padStart(4, '0')}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
  if (!estDateValide(texte)) throw new ErreurDate('date_invalide');
  return texte;
}

function lireSerie(texte: string, origine: string | undefined): string {
  if (origine === undefined) throw new ErreurDate('format_inconnu');
  if (!/^\d{1,7}$/.test(texte)) throw new ErreurDate('date_invalide');
  try {
    return ajouterJours(origine, Number(texte));
  } catch (e) {
    if (e instanceof ErreurCivile) throw new ErreurDate('date_invalide');
    throw e;
  }
}

export function lireDate(texte: string, format: FormatDate, options: OptionsDate = {}): string {
  const brut = String(texte).trim();
  if (format === 'serie') return lireSerie(brut, options.origineSerie);
  const motif = Object.hasOwn(MOTIFS, format) ? MOTIFS[format] : undefined;
  if (motif === undefined) throw new ErreurDate('format_inconnu');
  const trouve = motif.exec(brut);
  if (trouve === null) throw new ErreurDate('date_invalide');
  const [a, b, c] = [Number(trouve[1]), Number(trouve[2]), Number(trouve[3])];
  if (format === 'MM/JJ/AAAA') return iso(c, a, b);
  if (format === 'JJ/MM/AA') {
    const siecle = options.siecle;
    if (siecle === undefined || !Number.isSafeInteger(siecle) || siecle < 1000 || siecle > 9900 || siecle % 100 !== 0) {
      throw new ErreurDate('siecle_absent');
    }
    return iso(siecle + c, b, a);
  }
  if (format === 'AAAA-MM-JJ' || format === 'AAAAMMJJ' || format === 'AAAAMMJJHHMMSS') return iso(a, b, c);
  return iso(c, b, a);
}

function seLit(texte: string, format: FormatDate, options: OptionsDate): boolean {
  try {
    lireDate(texte, format, options);
    return true;
  } catch (e) {
    if (e instanceof ErreurDate) return false;
    throw e;
  }
}

/** Un format est candidat si TOUTES les dates non vides se lisent avec lui ; l'ordre des dates est sans effet. */
export function choisirFormat(textes: string[], candidats: FormatDate[], options: OptionsDate = {}): ChoixFormat {
  const dates = textes.map((t) => String(t).trim()).filter((t) => t !== '');
  if (dates.length === 0) return { type: 'aucun' };
  const lisibles = [...new Set(candidats)].filter((f) => dates.every((t) => seLit(t, f, options)));
  const [premier, second] = lisibles;
  if (premier === undefined) return { type: 'aucun' };
  if (second === undefined) return { type: 'unique', format: premier };
  return { type: 'question', formats: [premier, second] };
}
