// Règle C6 : compteur d'usages d'une règle apprise (promotion, extinction et période close : memoire-correction).
import { etatRegle, type CorrectionClassement, type EtatRegle } from '../../principes/memoire-correction.js';

export interface ApplicationRegle {
  regleCle: string;
  date: string;
  ecritureId: string;
}

export interface ApplicationRegleSociete extends ApplicationRegle {
  societeId: string;
}

export interface EtatAvecUsages extends EtatRegle {
  usages: number;
}

export function compterUsages(applications: readonly ApplicationRegle[], cle: string): number {
  const ecritures = new Set<string>();
  for (const a of applications) {
    if (a.regleCle === cle) ecritures.add(a.ecritureId);
  }
  return ecritures.size;
}

export function etatAvecUsages(
  corrections: readonly CorrectionClassement[],
  applications: readonly ApplicationRegleSociete[],
  societeId: string,
  cle: string,
  seuil: number,
): EtatAvecUsages {
  const etat = etatRegle(corrections, societeId, cle, seuil);
  const usages = compterUsages(
    applications.filter((a) => a.societeId === societeId),
    cle,
  );
  return { ...etat, usages };
}
