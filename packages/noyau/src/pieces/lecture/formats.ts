// Lecture des montants et des dates écrits selon l'usage d'un pays : chaînes de chiffres, aucun flottant.
import { centimes, type Centimes } from '../../argent/index.js';
import { conventionDuPays, type ConventionPays } from './conventions.js';

export type ResultatMontant = { centimes: Centimes } | { erreur: 'illisible' | 'decimales_en_trop' | 'trop_grand' };
export type ResultatDate = { date: string } | { erreur: 'illisible' | 'date_impossible' | 'annee_sur_deux_chiffres' };

const ILLISIBLE = { erreur: 'illisible' } as const;
const PLAFOND = BigInt(Number.MAX_SAFE_INTEGER);

export function lireMontant(texte: string, convention: ConventionPays): ResultatMontant {
  let t = texte.toUpperCase().replace(/EUR|GBP|USD|[€£$]/g, '').replace(/\s+/g, '');
  let negatif = false;
  if (t.startsWith('-')) { negatif = true; t = t.slice(1); } else if (t.endsWith('-')) { negatif = true; t = t.slice(0, -1); }
  if (!/^[0-9.,]*[0-9][0-9.,]*$/.test(t)) return ILLISIBLE;
  const milliers = convention.decimal === ',' ? '.' : ',';
  const parties = t.split(convention.decimal);
  if (parties.length > 2) return ILLISIBLE;
  const entiere = parties[0] ?? '';
  const decimales = parties[1] ?? '';
  if (!/^[0-9]*$/.test(decimales)) return ILLISIBLE;
  if (decimales.length > 2) return { erreur: 'decimales_en_trop' };
  const groupes = entiere.split(milliers);
  const groupesValides = groupes.every((g, i) => (i === 0 ? (groupes.length > 1 ? /^[0-9]{1,3}$/ : /^[0-9]*$/).test(g) : /^[0-9]{3}$/.test(g)));
  if (!groupesValides) return ILLISIBLE;
  const chiffres = (groupes.join('') + (decimales + '00').slice(0, 2)).replace(/^0+(?=[0-9])/, '');
  if (BigInt(chiffres) > PLAFOND) return { erreur: 'trop_grand' };
  const valeur = Number.parseInt(chiffres, 10);
  return { centimes: centimes(negatif ? -valeur : valeur) };
}

const MOIS: Readonly<Record<string, number>> = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function bissextile(a: number): boolean {
  return a % 4 === 0 && (a % 100 !== 0 || a % 400 === 0);
}

function jourMax(mois: number, annee: number): number {
  if (mois === 2) return bissextile(annee) ? 29 : 28;
  return [4, 6, 9, 11].includes(mois) ? 30 : 31;
}

function composer(jour: number, mois: number, annee: number): ResultatDate {
  if (annee < 1 || mois < 1 || mois > 12 || jour < 1 || jour > jourMax(mois, annee)) return { erreur: 'date_impossible' };
  return { date: [String(annee).padStart(4, '0'), String(mois).padStart(2, '0'), String(jour).padStart(2, '0')].join('-') };
}

export function lireDate(texte: string, convention: ConventionPays): ResultatDate {
  const t = texte.trim().replace(/\s+/g, ' ');
  const iso = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(t);
  if (iso) return composer(Number(iso[3]), Number(iso[2]), Number(iso[1]));
  const num = /^([0-9]{1,2})[/.-]([0-9]{1,2})[/.-]([0-9]+)$/.exec(t);
  if (num) {
    const annee = num[3] ?? '';
    if (annee.length === 2) return { erreur: 'annee_sur_deux_chiffres' };
    if (annee.length !== 4) return ILLISIBLE;
    const [a, b] = [Number(num[1]), Number(num[2])];
    return convention.ordreDate === 'JMA' ? composer(a, b, Number(annee)) : composer(b, a, Number(annee));
  }
  const lettres = t.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  const jma = /^([0-9]{1,2}) ([a-z]+) ([0-9]{4})$/.exec(lettres);
  const mja = /^([a-z]+) ([0-9]{1,2}),? ([0-9]{4})$/.exec(lettres);
  const [jour, nomMois, annee] = jma ? [jma[1], jma[2], jma[3]] : mja ? [mja[2], mja[1], mja[3]] : [];
  const mois = nomMois !== undefined && Object.hasOwn(MOIS, nomMois) ? MOIS[nomMois] : undefined;
  if (jour === undefined || annee === undefined || mois === undefined) return ILLISIBLE;
  return composer(Number(jour), mois, Number(annee));
}

/** Convention du pays du fournisseur, sinon celle de la langue française ; sinon `null` (pays_inconnu). */
export function resoudreConvention(paysFournisseur: string, langue: string): ConventionPays | null {
  return conventionDuPays(paysFournisseur) ?? (langue === 'fr' ? { decimal: ',', ordreDate: 'JMA' } : null);
}
