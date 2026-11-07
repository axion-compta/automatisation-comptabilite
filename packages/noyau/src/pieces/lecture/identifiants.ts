// Identifiants d'entreprise : SIREN, SIRET (clé de Luhn) et numéro de TVA intracommunautaire (clé française).
import { ErreurPiece } from '../types.js';

export type AnalyseTva =
  | { statut: 'valide'; pays: 'FR'; siren: string }
  | { statut: 'cle_fausse' | 'format_non_verifie' | 'illisible'; pays?: string };

/** Retire blancs, points et tirets ; passe en majuscules. */
export function normaliserIdentifiant(texte: string): string {
  return texte.replace(/[\s.-]/g, '').toUpperCase();
}

function luhn(chiffres: string): boolean {
  let somme = 0;
  for (let i = 0; i < chiffres.length; i += 1) {
    let c = Number(chiffres[chiffres.length - 1 - i]);
    if (i % 2 === 1) {
      c *= 2;
      if (c > 9) c -= 9;
    }
    somme += c;
  }
  return somme % 10 === 0;
}

export function sirenValide(s: string): boolean {
  return /^[0-9]{9}$/.test(s) && luhn(s);
}

/** Le cas particulier des établissements à clé spéciale n'est pas traité : faux, l'appelant marque « à vérifier ». */
export function siretValide(s: string): boolean {
  return /^[0-9]{14}$/.test(s) && luhn(s);
}

/** Clé de TVA française (0 à 96) d'un SIREN de 9 chiffres. */
export function cleTvaFrance(siren: string): number {
  if (!/^[0-9]{9}$/.test(siren)) throw new ErreurPiece('identifiant_invalide', 'Un SIREN compte 9 chiffres.');
  return (12 + 3 * (Number(siren) % 97)) % 97;
}

export function analyserTva(texte: string): AnalyseTva {
  const n = normaliserIdentifiant(texte);
  const fr = /^FR([A-Z0-9]{2})([0-9]{9})$/.exec(n);
  if (fr) {
    const [cle, siren] = [fr[1] ?? '', fr[2] ?? ''];
    if (!/^[0-9]{2}$/.test(cle)) return { statut: 'format_non_verifie', pays: 'FR' };
    if (!sirenValide(siren) || Number(cle) !== cleTvaFrance(siren)) return { statut: 'cle_fausse', pays: 'FR' };
    return { statut: 'valide', pays: 'FR', siren };
  }
  const autre = /^([A-Z]{2})[A-Z0-9]{2,12}$/.exec(n);
  if (autre && autre[1] !== 'FR') return { statut: 'format_non_verifie', pays: autre[1] ?? '' };
  return { statut: 'illisible' };
}
