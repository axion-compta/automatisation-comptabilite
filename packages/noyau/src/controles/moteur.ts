// Moteur de contrôles : règles pures, une trace par règle et par objet.
// Aucun texte affiché ici : seulement des codes.

/** Gravité : B bloquante, M majeure, m mineure, I information. */
export type Gravite = 'B' | 'M' | 'm' | 'I';

export type Declencheur =
  | 'arrivee'
  | 'continu'
  | 'nocturne'
  | 'avant_tva'
  | 'avant_export'
  | 'avant_cloture'
  | 'a_la_demande';

/** Ce qu'une règle bloque quand elle alerte. */
export type Blocage = 'validation' | 'tva' | 'export' | 'cloture';

export type Resultat = 'OK' | 'ALERTE' | 'IMPOSSIBLE' | 'NON_APPLICABLE' | 'ECARTE';

export interface SortieRegle {
  resultat: Resultat;
  valeur?: string | number;
  ecartCentimes?: number;
}

export interface RegleControle<T> {
  id: string;
  version: number;
  gravite: Gravite;
  bloque: Blocage[];
  declencheurs: Declencheur[];
  actif: boolean;
  evaluer(objet: T): SortieRegle;
}

export interface ObjetControle<T> {
  type: string;
  id: string;
  donnee: T;
}

export interface TraceControle {
  horodatage: string;
  declencheur: Declencheur;
  regleId: string;
  versionRegle: number;
  objetType: string;
  objetId: string;
  resultat: Resultat;
  valeur?: string | number;
  ecartCentimes?: number;
}

function evaluerSansRisque<T>(regle: RegleControle<T>, donnee: T): SortieRegle {
  try {
    return regle.evaluer(donnee);
  } catch {
    // Un contrôle qui n'a pas pu tourner n'est jamais compté OK.
    return { resultat: 'IMPOSSIBLE' };
  }
}

/**
 * Exécute les règles sur les objets. Une trace par couple règle × objet,
 * y compris pour les contrôles réussis. Règle inactive ou hors déclencheur :
 * aucune trace. `avant_export` exécute toutes les règles actives.
 */
export function executerControles<T>(
  regles: readonly RegleControle<T>[],
  objets: readonly ObjetControle<T>[],
  declencheur: Declencheur,
  horodatage: string,
): TraceControle[] {
  const traces: TraceControle[] = [];
  for (const regle of regles) {
    if (!regle.actif) continue;
    if (declencheur !== 'avant_export' && !regle.declencheurs.includes(declencheur)) continue;
    for (const objet of objets) {
      const sortie = evaluerSansRisque(regle, objet.donnee);
      const trace: TraceControle = {
        horodatage,
        declencheur,
        regleId: regle.id,
        versionRegle: regle.version,
        objetType: objet.type,
        objetId: objet.id,
        resultat: sortie.resultat,
      };
      if (sortie.valeur !== undefined) trace.valeur = sortie.valeur;
      if (sortie.ecartCentimes !== undefined) trace.ecartCentimes = sortie.ecartCentimes;
      traces.push(trace);
    }
  }
  return traces;
}
