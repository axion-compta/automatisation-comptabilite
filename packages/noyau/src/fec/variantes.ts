// Variantes de FEC de logiciels tiers : encodage, colonnes Montant et Sens, totaux. Pur, centimes entiers.
import { ajouter, type Centimes, centimes } from '../argent/index.js';
import { ErreurFec, lireMontantFec } from './format.js';

export type LigneBrute = Readonly<Record<string, string>>;

export class ErreurVariante extends Error {
  readonly code: 'sens_inconnu' | 'montant_invalide';
  readonly ligne: number;
  constructor(code: ErreurVariante['code'], ligne: number) {
    super(`${code} (ligne ${ligne})`);
    this.name = 'ErreurVariante';
    this.code = code;
    this.ligne = ligne;
  }
}

export interface TotauxFec {
  debit: Centimes;
  credit: Centimes;
  lignes: number;
}

// ISO-8859-15 diffère d'ISO-8859-1 par ces huit positions seulement.
const DIFFERENCES_8859_15: Readonly<Record<number, string>> = {
  0xa4: '€', 0xa6: 'Š', 0xa8: 'š', 0xb4: 'Ž', 0xb8: 'ž', 0xbc: 'Œ', 0xbd: 'œ', 0xbe: 'Ÿ',
};

/** UTF-8 (avec ou sans BOM) si les octets le sont, sinon ISO-8859-15. */
export function decoderFec(octets: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(octets);
  } catch {
    let texte = '';
    for (const o of octets) texte += DIFFERENCES_8859_15[o] ?? String.fromCharCode(o);
    return texte;
  }
}

function montant(texte: string | undefined, ligne: number): Centimes {
  if (texte === undefined || texte === '') return centimes(0);
  try {
    return lireMontantFec(texte);
  } catch (e) {
    if (e instanceof ErreurFec) throw new ErreurVariante('montant_invalide', ligne);
    throw e;
  }
}

/** Remplace Montant et Sens (D ou C) par Debit et Credit ; les lignes sans Montant ni Sens restent telles quelles. */
export function normaliserMontantSens(lignes: readonly LigneBrute[]): LigneBrute[] {
  return lignes.map((l, i) => {
    if (!('Montant' in l) && !('Sens' in l)) return l;
    const sens = (l['Sens'] ?? '').trim().toUpperCase();
    if (sens !== 'D' && sens !== 'C') throw new ErreurVariante('sens_inconnu', i + 1);
    const m = montant(l['Montant'], i + 1);
    const reste: Record<string, string> = { ...l };
    delete reste['Montant'];
    delete reste['Sens'];
    const [debit, credit] = sens === 'D' ? [m, 0] : [0, m];
    return { ...reste, Debit: formater(debit), Credit: formater(credit) };
  });
}

function formater(c: number): string {
  const chiffres = String(c).padStart(3, '0');
  return `${chiffres.slice(0, -2)},${chiffres.slice(-2)}`;
}

export function totauxDuFichier(lignes: readonly LigneBrute[]): TotauxFec {
  let debit = centimes(0);
  let credit = centimes(0);
  lignes.forEach((l, i) => {
    debit = ajouter(debit, montant(l['Debit'], i + 1));
    credit = ajouter(credit, montant(l['Credit'], i + 1));
  });
  return { debit, credit, lignes: lignes.length };
}

/** Égalité au centime ; l'écart est « importé moins lu ». */
export function verifierTotaux(
  lu: Pick<TotauxFec, 'debit' | 'credit'>,
  importe: Pick<TotauxFec, 'debit' | 'credit'>,
): { ok: boolean; ecartDebit: Centimes; ecartCredit: Centimes } {
  const ecartDebit = centimes(importe.debit - lu.debit);
  const ecartCredit = centimes(importe.credit - lu.credit);
  return { ok: ecartDebit === 0 && ecartCredit === 0, ecartDebit, ecartCredit };
}
