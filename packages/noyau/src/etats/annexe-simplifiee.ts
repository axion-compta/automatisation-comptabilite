// Annexe simplifiée : dispense (2 seuils sur 3) et rubriques à vérifier.
// Les seuils sont des paramètres datés passés en argument, jamais écrits ici.
// Le nombre d'exercices consécutifs exigé est à vérifier sur source officielle : non calculé.

export type StatutParametre = 'non_verifie' | 'a_verifier' | 'valide';

export type CodeErreurAnnexe = 'entree_invalide' | 'millesime_vide' | 'rubrique_en_double';

export class ErreurAnnexe extends Error {
  override name = 'ErreurAnnexe';
  readonly code: CodeErreurAnnexe;
  constructor(code: CodeErreurAnnexe, message: string) {
    super(message);
    this.code = code;
  }
}

export interface SocieteAnnexe {
  /** Centimes. */
  totalBilan: number;
  /** Centimes. */
  chiffreAffaires: number;
  effectif: number;
}

export interface SeuilsAnnexe extends SocieteAnnexe {
  statut: StatutParametre;
}

export type CritereDepasse = 'total_bilan' | 'chiffre_affaires' | 'effectif';

export interface ResultatDispense {
  dispense: boolean;
  depasses: CritereDepasse[];
  aVerifier: boolean;
}

function entierSurNonNegatif(valeur: number): void {
  if (!Number.isSafeInteger(valeur) || valeur < 0) {
    throw new ErreurAnnexe('entree_invalide', 'Valeur entière positive ou nulle attendue.');
  }
}

/** Dispense d'annexe : tombe quand au moins 2 des 3 seuils sont strictement dépassés. */
export function dispenseAnnexe(societe: SocieteAnnexe, seuils: SeuilsAnnexe): ResultatDispense {
  for (const v of [
    societe.totalBilan,
    societe.chiffreAffaires,
    societe.effectif,
    seuils.totalBilan,
    seuils.chiffreAffaires,
    seuils.effectif,
  ]) {
    entierSurNonNegatif(v);
  }
  const depasses: CritereDepasse[] = [];
  if (societe.chiffreAffaires > seuils.chiffreAffaires) depasses.push('chiffre_affaires');
  if (societe.effectif > seuils.effectif) depasses.push('effectif');
  if (societe.totalBilan > seuils.totalBilan) depasses.push('total_bilan');
  return { dispense: depasses.length < 2, depasses, aVerifier: seuils.statut !== 'valide' };
}

export interface MillesimeAnnexe {
  rubriques: readonly string[];
  statutSource: StatutParametre;
}

/** Rubriques du millésime, dans l'ordre reçu ; à vérifier tant que la source n'est pas validée. */
export function rubriquesAnnexe(millesime: MillesimeAnnexe): { code: string; aVerifier: boolean }[] {
  if (millesime.rubriques.length === 0) {
    throw new ErreurAnnexe('millesime_vide', 'Le millésime ne contient aucune rubrique.');
  }
  if (new Set(millesime.rubriques).size !== millesime.rubriques.length) {
    throw new ErreurAnnexe('rubrique_en_double', 'Une rubrique apparaît deux fois.');
  }
  const aVerifier = millesime.statutSource !== 'valide';
  return millesime.rubriques.map((code) => ({ code, aVerifier }));
}
