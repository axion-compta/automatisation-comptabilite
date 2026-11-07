// Lettrage total ou partiel d'un compte de tiers : le résultat ne contient que des liens.
import { ajouter, centimes, soustraire, type Centimes } from '../argent/index.js';

export interface LigneALettrer {
  id: string;
  compte: string;
  auxiliaire?: string;
  debit: Centimes;
  credit: Centimes;
  lettre?: string;
}

export interface LienLettrage {
  ligneId: string;
  code: string;
}

export interface ResultatLettrage {
  code: string;
  partiel: boolean;
  reste: Centimes;
  liens: LienLettrage[];
}

export type CodeErreurLettrage =
  | 'comptes_differents'
  | 'deja_lettree'
  | 'moins_de_deux_lignes'
  | 'code_invalide';

export class ErreurLettrage extends Error {
  override name = 'ErreurLettrage';
  readonly code: CodeErreurLettrage;
  constructor(code: CodeErreurLettrage, message: string) {
    super(message);
    this.code = code;
  }
}

const FORME_CODE = /^[A-Z]+$/;

/** Lie des lignes d'un même compte (et même auxiliaire) sous un code ; ne modifie aucune ligne. */
export function lettrer(lignes: readonly LigneALettrer[], code: string): ResultatLettrage {
  if (lignes.length < 2) {
    throw new ErreurLettrage('moins_de_deux_lignes', 'Un lettrage demande au moins deux lignes.');
  }
  if (!FORME_CODE.test(code)) {
    throw new ErreurLettrage('code_invalide', 'Le code de lettrage est composé de lettres A à Z.');
  }
  const premiere = lignes[0];
  if (premiere === undefined) {
    throw new ErreurLettrage('moins_de_deux_lignes', 'Un lettrage demande au moins deux lignes.');
  }
  for (const l of lignes) {
    if (l.compte !== premiere.compte || l.auxiliaire !== premiere.auxiliaire) {
      throw new ErreurLettrage('comptes_differents', 'Les lignes ne sont pas du même compte.');
    }
  }
  for (const l of lignes) {
    if (l.lettre !== undefined) {
      throw new ErreurLettrage('deja_lettree', 'Une ligne est déjà lettrée.');
    }
  }
  let totalDebit = centimes(0);
  let totalCredit = centimes(0);
  for (const l of lignes) {
    totalDebit = ajouter(totalDebit, l.debit);
    totalCredit = ajouter(totalCredit, l.credit);
  }
  const reste = soustraire(totalDebit, totalCredit);
  return {
    code,
    partiel: reste !== 0,
    reste,
    liens: lignes.map((l) => ({ ligneId: l.id, code })),
  };
}

const LETTRES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Code suivant dans l'ordre A..Z, AA, AB..AZ, BA... */
function suivant(code: string): string {
  const dernier = code.slice(-1);
  const debut = code.slice(0, -1);
  if (dernier !== 'Z') {
    return debut + (LETTRES[LETTRES.indexOf(dernier) + 1] ?? 'A');
  }
  return (debut === '' ? 'A' : suivant(debut)) + 'A';
}

/** Le plus petit code libre dans l'ordre A..Z, AA, AB... */
export function prochainCode(codesExistants: readonly string[]): string {
  const pris = new Set(codesExistants);
  let code = 'A';
  while (pris.has(code)) code = suivant(code);
  return code;
}
