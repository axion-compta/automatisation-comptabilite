import type { Centimes } from '../../argent/index.js';
import { ErreurPiece } from '../types.js';

export interface ChampsNom {
  datePiece?: string;
  fournisseur?: string;
  numero?: string;
  ttc?: Centimes;
  devise?: string;
}

const MIN_LONGUEUR = 40;
const DATE_ISO = /^(\d{4})-(\d{2})-\d{2}$/;

export function montantPourNom(c: Centimes): string {
  const chiffres = String(Math.abs(c)).padStart(3, '0');
  return `${c < 0 ? '-' : ''}${chiffres.slice(0, -2)}.${chiffres.slice(-2)}`;
}

export function segment(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9\-_.()]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const ou = (texte: string | undefined, defaut: string): string => segment(texte ?? '') || defaut;

export function nomNormalise(champs: ChampsNom, longueurMax: number): string {
  if (!Number.isInteger(longueurMax) || longueurMax < MIN_LONGUEUR) throw new ErreurPiece('reglage_invalide', "longueurMax doit être un entier d'au moins 40");
  const date = ou(champs.datePiece, 'SANS-DATE');
  const montant = champs.ttc === undefined ? 'SANS-MONTANT' : montantPourNom(champs.ttc);
  const coupe = (t: string, max: number): string => t.slice(0, Math.max(max, 1)).replace(/-$/, '') || t.slice(0, 1);
  let devise = ou(champs.devise, 'XXX');
  const fixe = date.length + montant.length + 5;
  const numero = coupe(ou(champs.numero, 'SANS-NUMERO'), longueurMax - fixe - devise.length - 1);
  if (fixe + devise.length + numero.length + 1 > longueurMax) devise = coupe(devise, longueurMax - fixe - numero.length - 1);
  const fin = `_${numero}_${montant}(${devise})`;
  const place = Math.max(longueurMax - date.length - fin.length - 1, 0);
  const fournisseur = ou(champs.fournisseur, 'SANS-FOURNISSEUR').slice(0, place).replace(/-$/, '');
  return `${date}_${fournisseur}${fin}`;
}

export function cheminVirtuel(champs: Pick<ChampsNom, 'datePiece' | 'fournisseur'>): string {
  const m = DATE_ISO.exec(champs.datePiece ?? '');
  return `${m === null ? 'sans-date' : `${m[1]}/${m[2]}`}/${ou(champs.fournisseur, 'SANS-FOURNISSEUR')}`;
}

const MOIS = '(0[1-9]|1[0-2])';
const JOUR = '(0[1-9]|[12]\\d|3[01])';
const DATES: [RegExp, (m: string[]) => string][] = [
  [new RegExp(`(?<!\\d)(\\d{4})-${MOIS}-${JOUR}(?!\\d)`, 'g'), (m) => `${m[1]}-${m[2]}-${m[3]}`],
  [new RegExp(`(?<!\\d)(\\d{4})${MOIS}${JOUR}(?!\\d)`, 'g'), (m) => `${m[1]}-${m[2]}-${m[3]}`],
  [new RegExp(`(?<!\\d)${JOUR}-${MOIS}-(\\d{4})(?!\\d)`, 'g'), (m) => `${m[3]}-${m[2]}-${m[1]}`],
];
const MONTANT = /(?<![\d.,])(\d+)[.,](\d{2})(?!\d|[.,]\d)/g;

export function nomOrigineIncoherent(nomOrigine: string, champs: { datePiece?: string; ttc?: Centimes }): boolean {
  const { datePiece, ttc } = champs;
  const dates = DATES.flatMap(([re, vers]) => [...nomOrigine.matchAll(re)].map((m) => vers(m)));
  const montants = [...nomOrigine.matchAll(MONTANT)].map((m) => `${m[1]}.${m[2]}`);
  const dateKo = datePiece !== undefined && dates.some((d) => d !== datePiece);
  const montantKo = ttc !== undefined && montants.some((x) => x !== montantPourNom(Math.abs(ttc) as Centimes));
  return dateKo || montantKo;
}
