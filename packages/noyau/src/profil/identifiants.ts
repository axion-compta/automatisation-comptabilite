import { ErreurProfil } from './types.js';

const BLANCS = /\s+/g;
const CHIFFRES_SIREN = /^[0-9]{9}$/;
const CHIFFRES_SIRET = /^[0-9]{14}$/;
const FORME_TVA = /^FR([0-9]{2})([0-9]{9})$/;
const DIX = 10;
const NEUF = 9;
const MODULO_CLE = 97;
const BASE_CLE = 12;
const FACTEUR_CLE = 3;

export function normaliserIdentifiant(t: string): string {
  return t.replace(BLANCS, '');
}

function luhn(chiffres: string): boolean {
  let somme = 0;
  const lus = [...chiffres].reverse();
  for (let i = 0; i < lus.length; i += 1) {
    let d = Number(lus[i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > NEUF) d -= NEUF;
    }
    somme += d;
  }
  return somme % DIX === 0;
}

// Aucune exception pour La Poste : à vérifier, voir spec 09 §01 règle 2.
export function sirenValide(t: string): boolean {
  const n = normaliserIdentifiant(t);
  return CHIFFRES_SIREN.test(n) && luhn(n);
}

export function siretValide(t: string): boolean {
  const n = normaliserIdentifiant(t);
  return CHIFFRES_SIRET.test(n) && sirenValide(n.slice(0, NEUF)) && luhn(n);
}

export function cleTvaFrancaise(siren: string): string {
  if (!sirenValide(siren)) throw new ErreurProfil('siren_invalide');
  const cle = (BASE_CLE + FACTEUR_CLE * (Number(normaliserIdentifiant(siren)) % MODULO_CLE)) % MODULO_CLE;
  return String(cle).padStart(2, '0');
}

export type ResultatTva = { valide: boolean; motif?: 'forme' | 'siren_invalide' | 'cle_fausse'; cleAttendue?: string };

export function verifierTvaFrancaise(numero: string): ResultatTva {
  const m = FORME_TVA.exec(normaliserIdentifiant(numero));
  if (m === null) return { valide: false, motif: 'forme' };
  const [, cle, siren] = m as unknown as [string, string, string];
  if (!sirenValide(siren)) return { valide: false, motif: 'siren_invalide' };
  const attendue = cleTvaFrancaise(siren);
  return attendue === cle ? { valide: true } : { valide: false, motif: 'cle_fausse', cleAttendue: attendue };
}
