// Format d'une ligne FEC (export et lecture) ; options obligatoires, sans valeur par défaut.
import { type Centimes, centimes } from '../argent/index.js';

export type CodeErreurFec =
  | 'option_invalide'
  | 'libelle_vide'
  | 'montant_negatif'
  | 'montant_invalide'
  | 'date_invalide'
  | 'ligne_vide'
  | 'valeur_invalide'
  | 'ligne_invalide';

export class ErreurFec extends Error {
  override name = 'ErreurFec';
  readonly code: CodeErreurFec;
  constructor(code: CodeErreurFec) {
    super(code);
    this.code = code;
  }
}

export interface OptionsFec {
  separateur: string;
  finDeLigne: string;
  longueurMaxLibelle: number;
}

function verifierOptions(options: OptionsFec): void {
  const { separateur, finDeLigne, longueurMaxLibelle } = options;
  const invalide =
    separateur === '' ||
    /[\r\n]/.test(separateur) ||
    finDeLigne === '' ||
    !Number.isSafeInteger(longueurMaxLibelle) ||
    longueurMaxLibelle < 1;
  if (invalide) throw new ErreurFec('option_invalide');
}

/** Caractères supprimés : contrôles C0 et C1, séparateurs de ligne Unicode, U+200B, U+FEFF. */
function estSupprime(code: number): boolean {
  return (
    code < 32 ||
    (code >= 127 && code <= 159) ||
    code === 0x200b ||
    code === 0xfeff ||
    code === 0x2028 ||
    code === 0x2029
  );
}

function retirerTout(texte: string, motif: string): string {
  let courant = texte;
  while (courant.includes(motif)) courant = courant.replaceAll(motif, '');
  return courant;
}

function nettoyer(texte: string, options: OptionsFec): string {
  let sortie = '';
  for (const caractere of texte) {
    const code = caractere.codePointAt(0) ?? 0;
    if (code === 0xa0 || code === 0x202f) sortie += ' ';
    else if (!estSupprime(code)) sortie += caractere;
  }
  sortie = retirerTout(retirerTout(sortie, options.separateur), options.finDeLigne);
  return sortie.trim();
}

/** Nettoie un libellé ; vide après nettoyage, il est remplacé par le repli nettoyé. */
export function nettoyerLibelle(texte: string, repli: string, options: OptionsFec): string {
  verifierOptions(options);
  const coupe = (valeur: string): string =>
    Array.from(nettoyer(valeur, options)).slice(0, options.longueurMaxLibelle).join('').trim();
  const propre = coupe(texte);
  if (propre !== '') return propre;
  const secours = coupe(repli);
  if (secours === '') throw new ErreurFec('libelle_vide');
  return secours;
}

/** 123456 donne « 1234,56 » : virgule décimale, sans séparateur de milliers. */
export function formaterMontantFec(montant: Centimes): string {
  if (montant < 0) throw new ErreurFec('montant_negatif');
  const chiffres = String(montant).padStart(3, '0');
  return chiffres.slice(0, -2) + ',' + chiffres.slice(-2);
}

/** Lecture stricte, par découpe de chaîne : « 1234,56 » donne 123456. */
export function lireMontantFec(texte: string): Centimes {
  const trouve = /^(0|[1-9][0-9]*),([0-9]{2})$/.exec(texte);
  if (trouve === null) throw new ErreurFec('montant_invalide');
  const valeur = Number((trouve[1] ?? '') + (trouve[2] ?? ''));
  if (!Number.isSafeInteger(valeur)) throw new ErreurFec('montant_invalide');
  return centimes(valeur);
}

function calendrierValide(annee: number, mois: number, jour: number): boolean {
  const date = new Date(0);
  date.setUTCFullYear(annee, mois - 1, jour);
  return (
    date.getUTCFullYear() === annee && date.getUTCMonth() === mois - 1 && date.getUTCDate() === jour
  );
}

function decouperDate(texte: string, motif: RegExp): string[] {
  const trouve = motif.exec(texte);
  if (trouve === null) throw new ErreurFec('date_invalide');
  const [, a = '', m = '', j = ''] = trouve;
  if (!calendrierValide(Number(a), Number(m), Number(j))) throw new ErreurFec('date_invalide');
  return [a, m, j];
}

/** « 2026-03-31 » donne « 20260331 ». */
export function formaterDateFec(dateIso: string): string {
  return decouperDate(dateIso, /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/).join('');
}

/** « 20260331 » donne « 2026-03-31 ». */
export function lireDateFec(texte: string): string {
  return decouperDate(texte, /^([0-9]{4})([0-9]{2})([0-9]{2})$/).join('-');
}

/** Assemble les valeurs d'une ligne ; refus si une valeur contient séparateur ou fin de ligne. */
export function assemblerLigne(valeurs: readonly string[], options: OptionsFec): string {
  verifierOptions(options);
  if (valeurs.length === 0) throw new ErreurFec('ligne_vide');
  for (const valeur of valeurs) {
    if (
      valeur.includes(options.separateur) ||
      valeur.includes(options.finDeLigne) ||
      /[\r\n]/.test(valeur)
    ) {
      throw new ErreurFec('valeur_invalide');
    }
  }
  return valeurs.join(options.separateur) + options.finDeLigne;
}

/** Lecture inverse : retire une fin de ligne finale, puis découpe au séparateur. */
export function lireLigne(ligne: string, options: OptionsFec): string[] {
  verifierOptions(options);
  const corps = ligne.endsWith(options.finDeLigne)
    ? ligne.slice(0, ligne.length - options.finDeLigne.length)
    : ligne;
  if (corps.includes(options.finDeLigne) || /[\r\n]/.test(corps)) {
    throw new ErreurFec('ligne_invalide');
  }
  return corps.split(options.separateur);
}
