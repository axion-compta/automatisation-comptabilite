// Lecture des montants d'un relevé en centimes entiers : caractère par caractère, sans flottant.
import type { Centimes } from '../../argent/index.js';

export type CodeMontant = 'vide' | 'non_numerique' | 'trop_de_decimales' | 'deux_sens' | 'aucun_montant' | 'hors_limites' | 'format_ambigu';

export class ErreurMontant extends Error {
  readonly code: CodeMontant;
  constructor(code: CodeMontant) {
    super(`montant illisible : ${code}`);
    this.name = 'ErreurMontant';
    this.code = code;
  }
}

export type FormatMontant = { decimal: ',' | '.'; milliers: '' | ' ' | '.' | ',' | "'" };
export type ModeSigne =
  | { type: 'signe'; colonne: string }
  | { type: 'debit_credit'; debit: string; credit: string }
  | { type: 'sens_dc'; montant: string; sens: string; debit: string; credit: string }
  | { type: 'suffixe_moins'; colonne: string };

const estChiffre = (c: string | undefined): boolean => c !== undefined && c >= '0' && c <= '9';

export function lireMontant(texte: string, format: FormatMontant): Centimes {
  if (format.milliers !== '' && format.milliers === format.decimal) throw new ErreurMontant('format_ambigu');
  let s = texte.trim();
  if (s === '') throw new ErreurMontant('vide');
  let negatif = false;
  if (s.startsWith('(') && s.endsWith(')')) {
    negatif = true;
    s = s.slice(1, -1);
  } else {
    const debut = s[0];
    if (debut === '-' || debut === '+') {
      negatif = debut === '-';
      s = s.slice(1);
    }
    if (s.endsWith('-')) {
      if (debut === '-' || debut === '+') throw new ErreurMontant('non_numerique');
      negatif = true;
      s = s.slice(0, -1);
    }
  }
  let entier = '';
  let frac = '';
  let virgule = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i] as string;
    if (estChiffre(c)) {
      if (virgule) frac += c;
      else entier += c;
    } else if (c === format.decimal && !virgule) {
      virgule = true;
    } else if (!virgule && format.milliers !== '' && (c === format.milliers || (format.milliers === ' ' && (c === '\u00a0' || c === '\u202f'))) && estChiffre(s[i - 1]) && estChiffre(s[i + 1])) {
      continue;
    } else {
      throw new ErreurMontant('non_numerique');
    }
  }
  if (entier === '' && frac === '') throw new ErreurMontant('non_numerique');
  if (frac.length > 2) throw new ErreurMontant('trop_de_decimales');
  const total = BigInt(entier === '' ? '0' : entier) * 100n + BigInt(frac.padEnd(2, '0'));
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new ErreurMontant('hors_limites');
  return Number(negatif ? -total : total) as Centimes;
}

const cellule = (cellules: Readonly<Record<string, string | undefined>>, nom: string): string => (cellules[nom] ?? '').trim();

export function montantSigne(cellules: Readonly<Record<string, string | undefined>>, mode: ModeSigne, format: FormatMontant): Centimes {
  switch (mode.type) {
    case 'signe':
      return lireMontant(cellule(cellules, mode.colonne), format);
    case 'suffixe_moins':
      return lireMontant(cellule(cellules, mode.colonne), format);
    case 'debit_credit': {
      const d = cellule(cellules, mode.debit);
      const c = cellule(cellules, mode.credit);
      if (d !== '' && c !== '') throw new ErreurMontant('deux_sens');
      if (d === '' && c === '') throw new ErreurMontant('aucun_montant');
      return d !== '' ? ((0 - Math.abs(lireMontant(d, format))) as Centimes) : (Math.abs(lireMontant(c, format)) as Centimes);
    }
    case 'sens_dc': {
      const valeur = Math.abs(lireMontant(cellule(cellules, mode.montant), format));
      const sens = cellule(cellules, mode.sens).toUpperCase();
      if (sens === mode.debit.toUpperCase() && sens !== '') return (0 - valeur) as Centimes;
      if (sens === mode.credit.toUpperCase() && sens !== '') return valeur as Centimes;
      throw new ErreurMontant('non_numerique');
    }
  }
}
