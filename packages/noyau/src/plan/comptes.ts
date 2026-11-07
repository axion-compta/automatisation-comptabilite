// Numéros de compte : normalisation, classe, refus au MVP, doublons probables.

export type CodeErreurCompte =
  | 'numero_absent'
  | 'numero_invalide'
  | 'classe_8_v1'
  | 'classe_inconnue'
  | 'trop_court';

export class ErreurCompte extends Error {
  override name = 'ErreurCompte';
  readonly code: CodeErreurCompte;
  constructor(code: CodeErreurCompte) {
    super(code);
    this.code = code;
  }
}

export type CompteNormalise = { numero: string; auxiliaireCandidat?: string };

const SUITE_DE_CHIFFRES = /\d+(?:[ .-]\d+)*/;

/** Normalise une saisie : le numéro est la première suite de chiffres, le reste en lettres devient candidat auxiliaire. */
export function normaliserCompte(saisie: string): CompteNormalise {
  const trouve = SUITE_DE_CHIFFRES.exec(saisie);
  if (trouve === null) {
    throw new ErreurCompte('numero_absent');
  }
  const numero = trouve[0].replace(/[ .-]/g, '');
  const reste = (saisie.slice(0, trouve.index) + ' ' + saisie.slice(trouve.index + trouve[0].length))
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z ]/g, ' ')
    .replace(/ +/g, ' ')
    .trim();
  return reste === '' ? { numero } : { numero, auxiliaireCandidat: reste };
}

/** Chiffre de tête du numéro (1 à 9, ou 0 si le numéro commence par 0). */
export function classeDe(numero: string): number {
  if (!/^\d+$/.test(numero)) {
    throw new ErreurCompte('numero_invalide');
  }
  return Number(numero.charAt(0));
}

/** Refus au MVP : classe 8 (V1 seulement), classes 0 et 9, moins de 3 chiffres. */
export function verifierCompteMvp(numero: string): void {
  const classe = classeDe(numero);
  if (classe === 8) {
    throw new ErreurCompte('classe_8_v1');
  }
  if (classe === 0 || classe === 9) {
    throw new ErreurCompte('classe_inconnue');
  }
  if (numero.length < 3) {
    throw new ErreurCompte('trop_court');
  }
}

/** Paires [court, long] où `long` est `court` suivi seulement de zéros. Aucune fusion. */
export function doublonsProbables(numeros: readonly string[]): [string, string][] {
  const uniques = [...new Set(numeros)].sort();
  const paires: [string, string][] = [];
  for (const court of uniques) {
    for (const long of uniques) {
      if (long.length > court.length && long.startsWith(court) && /^0+$/.test(long.slice(court.length))) {
        paires.push([court, long]);
      }
    }
  }
  return paires;
}
