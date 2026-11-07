// Périodicité de la déclaration de TVA. Seuils passés en argument : aucune valeur n'est écrite ici.
import type { Centimes } from '../argent/index.js';

export type CodeErreurPeriodicite =
  | 'montant_invalide'
  | 'seuil_invalide'
  | 'mois_invalide'
  | 'mois_en_double'
  | 'ordre_invalide';

export class ErreurPeriodicite extends Error {
  override name = 'ErreurPeriodicite';
  readonly code: CodeErreurPeriodicite;
  constructor(code: CodeErreurPeriodicite) {
    super(code);
    this.code = code;
  }
}

export interface CumulMois {
  mois: string;
  cumul: Centimes;
}

export interface EntreePeriodicite {
  chiffreAffairesN1: Centimes;
  acquisitionsN1: Centimes;
  cumulsN: readonly CumulMois[];
}

export interface SeuilsPeriodicite {
  seuilN1: Centimes;
  seuilN: Centimes;
}

export interface ResultatPeriodicite {
  periodicite: 'trimestrielle' | 'mensuelle';
  moisBascule?: string;
  repriseDepuis?: string;
}

function montant(n: number): void {
  if (!Number.isSafeInteger(n) || n < 0) throw new ErreurPeriodicite('montant_invalide');
}

function seuil(n: number): void {
  if (!Number.isSafeInteger(n) || n < 0) throw new ErreurPeriodicite('seuil_invalide');
}

function verifierMois(mois: string): void {
  const m = /^([0-9]{4})-(0[1-9]|1[0-2])$/.exec(mois);
  if (m === null) throw new ErreurPeriodicite('mois_invalide');
}

/** Premier mois du trimestre civil : « 2026-05 » donne « 2026-04 ». */
function debutTrimestre(mois: string): string {
  const numero = Number(mois.slice(5));
  const premier = numero <= 3 ? 1 : numero <= 6 ? 4 : numero <= 9 ? 7 : 10;
  return mois.slice(0, 5) + String(premier).padStart(2, '0');
}

export function periodiciteSelonChiffreAffaires(
  entree: EntreePeriodicite,
  seuils: SeuilsPeriodicite,
): ResultatPeriodicite {
  seuil(seuils.seuilN1);
  seuil(seuils.seuilN);
  montant(entree.chiffreAffairesN1);
  montant(entree.acquisitionsN1);
  let precedent: string | undefined;
  for (const { mois, cumul } of entree.cumulsN) {
    verifierMois(mois);
    montant(cumul);
    if (precedent === mois) throw new ErreurPeriodicite('mois_en_double');
    if (precedent !== undefined && mois < precedent) throw new ErreurPeriodicite('ordre_invalide');
    precedent = mois;
  }
  if (entree.chiffreAffairesN1 + entree.acquisitionsN1 > seuils.seuilN1) return { periodicite: 'mensuelle' };
  const depassement = entree.cumulsN.find((c) => c.cumul > seuils.seuilN);
  if (depassement === undefined) return { periodicite: 'trimestrielle' };
  return {
    periodicite: 'mensuelle',
    moisBascule: depassement.mois,
    repriseDepuis: debutTrimestre(depassement.mois),
  };
}

export function periodiciteSelonTvaAnnuelle(tvaAnnuelle: Centimes, seuilC: Centimes): 'trimestrielle' | 'mensuelle' {
  montant(tvaAnnuelle);
  seuil(seuilC);
  return tvaAnnuelle < seuilC ? 'trimestrielle' : 'mensuelle';
}
