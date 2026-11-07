// Usages d'écriture par pays (séparateur décimal, ordre des dates) : ce ne sont pas des valeurs légales.
export interface ConventionPays { decimal: ',' | '.'; ordreDate: 'JMA' | 'MJA'; }

const VIRGULE: ConventionPays = { decimal: ',', ordreDate: 'JMA' };
const POINT_JMA: ConventionPays = { decimal: '.', ordreDate: 'JMA' };
const POINT_MJA: ConventionPays = { decimal: '.', ordreDate: 'MJA' };

const PAR_PAYS: Readonly<Record<string, ConventionPays>> = {
  FR: VIRGULE, BE: VIRGULE, LU: VIRGULE, DE: VIRGULE, AT: VIRGULE, ES: VIRGULE, IT: VIRGULE, PT: VIRGULE, NL: VIRGULE, PL: VIRGULE,
  GB: POINT_JMA, IE: POINT_JMA, US: POINT_MJA,
};

/** Convention du pays (code à deux lettres), ou `null` si le pays est inconnu. */
export function conventionDuPays(code: string): ConventionPays | null {
  const trouvee = Object.hasOwn(PAR_PAYS, code) ? PAR_PAYS[code] : undefined;
  return trouvee === undefined ? null : { ...trouvee };
}
