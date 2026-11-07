// Calibrage des contrôles (V3-CTL-012) : rapport du banc, taux en points de base, régression contre une référence versionnée.
// Entiers seulement : taux par `proportionPointsDeBase`, comparaisons par produit croisé en bigint. Codes d'erreur, aucun texte.
import { proportionPointsDeBase } from '../argent/index.js';

export interface RapportCalibrage {
  versionCatalogue: string;
  versionsRegles: Record<string, number>;
  detectees: number;
  attendues: number;
  faussesAlertes: number;
  propres: number;
}
export type MotifRegression = 'detection_en_baisse' | 'fausses_alertes_en_hausse' | 'regle_retiree';

const entier = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;

function verifier(r: RapportCalibrage): void {
  if (!entier(r.attendues) || !entier(r.detectees) || !entier(r.faussesAlertes) || !entier(r.propres)) throw new Error('rapport_invalide');
  if (r.detectees > r.attendues || r.faussesAlertes > r.propres) throw new Error('rapport_invalide');
  if (r.attendues === 0) throw new Error('attendues_nulles');
}

/** Taux de détection en points de base, arrondi vers le bas (jamais de détection annoncée en trop). */
export function tauxDetectionPdb(r: RapportCalibrage): number {
  verifier(r);
  return proportionPointsDeBase(r.detectees, r.attendues, 'inferieur') as number;
}

/** Régression : détection en baisse, taux de fausses alertes en hausse (produit croisé), règle de la référence absente. */
export function comparerRapports(reference: RapportCalibrage, nouveau: RapportCalibrage): { regression: boolean; motifs: MotifRegression[] } {
  verifier(reference);
  verifier(nouveau);
  const motifs: MotifRegression[] = [];
  if (BigInt(nouveau.detectees) * BigInt(reference.attendues) < BigInt(reference.detectees) * BigInt(nouveau.attendues)) motifs.push('detection_en_baisse');
  if (BigInt(nouveau.faussesAlertes) * BigInt(reference.propres) > BigInt(reference.faussesAlertes) * BigInt(nouveau.propres)) motifs.push('fausses_alertes_en_hausse');
  if (Object.keys(reference.versionsRegles).some((id) => !Object.hasOwn(nouveau.versionsRegles, id))) motifs.push('regle_retiree');
  return { regression: motifs.length > 0, motifs };
}

/** Chaîne stable `ID=version;…`, clés triées. */
export function empreinteVersions(versionsRegles: Record<string, number>): string {
  return Object.keys(versionsRegles).sort().map((id) => {
    const v = versionsRegles[id];
    if (!Number.isSafeInteger(v) || (v as number) < 1) throw new Error('version_invalide');
    return `${id}=${String(v)}`;
  }).join(';');
}
