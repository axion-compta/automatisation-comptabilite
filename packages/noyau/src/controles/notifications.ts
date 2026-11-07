// Notifications des contrôles (V3-CTL-074) : décision pure, aucun texte, seulement des codes.
// B : immédiate, une seule fois tant qu'il reste ouvert. M : résumé quotidien. m et I : jamais.

import type { Gravite } from './moteur.js';

export interface Ouvert {
  regleId: string;
  objetId: string;
  gravite: Gravite;
  ouvertLe: string;
}

export interface Notifie {
  regleId: string;
  objetId: string;
}

export interface DecisionsNotification {
  immediates: Notifie[];
  resume: { nombre: number; regles: string[] } | null;
}

const cle = (n: Notifie): string => JSON.stringify([n.regleId, n.objetId]);
const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const parCouple = (a: Notifie, b: Notifie): number => compare(a.regleId, b.regleId) || compare(a.objetId, b.objetId);

export function decisionsNotification(ouverts: readonly Ouvert[], dejaNotifies: readonly Notifie[]): DecisionsNotification {
  const vus = new Set(dejaNotifies.map(cle));
  const immediates = new Map<string, Notifie>();
  const majeurs = new Map<string, string>();
  for (const x of ouverts) {
    const couple = { regleId: x.regleId, objetId: x.objetId };
    if (x.gravite === 'B' && !vus.has(cle(couple))) immediates.set(cle(couple), couple);
    if (x.gravite === 'M') majeurs.set(cle(couple), x.regleId);
  }
  const regles = [...new Set(majeurs.values())].sort(compare);
  return {
    immediates: [...immediates.values()].sort(parCouple),
    resume: majeurs.size === 0 ? null : { nombre: majeurs.size, regles },
  };
}

/** Garde seulement les B encore ouverts : un B refermé puis rouvert sera notifié à nouveau. */
export function aOublierApresFermeture(dejaNotifies: readonly Notifie[], ouverts: readonly Ouvert[]): Notifie[] {
  const encoreB = new Set(ouverts.filter((x) => x.gravite === 'B').map(cle));
  return dejaNotifies.filter((n) => encoreB.has(cle(n)));
}
