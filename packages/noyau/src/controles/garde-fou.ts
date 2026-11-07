// Garde-fou : refus d'une action tant qu'un contrôle bloquant (gravité B) est ouvert.
// Aucun texte affiché ici : seulement des codes.

import type { Blocage, RegleControle, TraceControle } from './moteur.js';

/** Contrôles qui ne peuvent jamais être écartés. */
export const NON_ECARTABLES: readonly string[] = ['CC-T01', 'CC-T02', 'CC-K01', 'CC-K02', 'CC-K03'];

export const PERMISSION_LEVER_BLOQUANT = 'compta-lever-bloquant';

export interface Bloquant {
  regleId: string;
  objetId: string;
}

export interface VerdictGardeFou {
  autorise: boolean;
  bloquants: Bloquant[];
  code?: 'controle_bloquant_ouvert';
}

/**
 * Autorise l'action si aucun contrôle de gravité B, bloquant pour cette action,
 * n'est ouvert. Pour chaque couple règle × objet, la trace la plus récente fait foi.
 * ALERTE et IMPOSSIBLE comptent comme ouverts, ECARTE sur une règle non écartable aussi.
 * Précondition : horodatages au même format ISO UTC (suffixe Z), comparés comme chaînes.
 */
export function verifierAvantAction<T>(
  traces: readonly TraceControle[],
  regles: readonly RegleControle<T>[],
  action: Blocage,
): VerdictGardeFou {
  const graves = new Map<string, RegleControle<T>>();
  for (const r of regles) graves.set(r.id, r);

  const dernieres = new Map<string, TraceControle>();
  for (const t of traces) {
    const cle = JSON.stringify([t.regleId, t.objetId]);
    const vue = dernieres.get(cle);
    if (vue === undefined || t.horodatage >= vue.horodatage) dernieres.set(cle, t);
  }

  const bloquants: Bloquant[] = [];
  for (const t of dernieres.values()) {
    const regle = graves.get(t.regleId);
    if (regle === undefined || regle.gravite !== 'B' || !regle.bloque.includes(action)) continue;
    const ouvert = t.resultat === 'ALERTE' || t.resultat === 'IMPOSSIBLE';
    if (ouvert || (t.resultat === 'ECARTE' && NON_ECARTABLES.includes(t.regleId))) {
      bloquants.push({ regleId: t.regleId, objetId: t.objetId });
    }
  }

  if (bloquants.length === 0) return { autorise: true, bloquants };
  return { autorise: false, bloquants, code: 'controle_bloquant_ouvert' };
}

export interface TraceEcartee extends TraceControle {
  motif: string;
  par: string;
}

export interface OptionsEcart {
  motif: string;
  permissions: readonly string[];
  reauthentifie: boolean;
  par: string;
  horodatage: string;
}

export type RefusEcart =
  | 'non_ecartable'
  | 'motif_obligatoire'
  | 'auteur_obligatoire'
  | 'horodatage_anterieur'
  | 'permission_manquante'
  | 'reauthentification_requise';

export type ResultatEcart = { ok: true; trace: TraceEcartee } | { ok: false; code: RefusEcart };

/** Écarte un contrôle : produit une nouvelle trace ECARTE, sans modifier l'ancienne. */
export function ecarter(trace: TraceControle, options: OptionsEcart): ResultatEcart {
  if (NON_ECARTABLES.includes(trace.regleId)) return { ok: false, code: 'non_ecartable' };
  if (!options.permissions.includes(PERMISSION_LEVER_BLOQUANT)) {
    return { ok: false, code: 'permission_manquante' };
  }
  if (!options.reauthentifie) return { ok: false, code: 'reauthentification_requise' };
  const motif = options.motif.trim();
  if (motif === '') return { ok: false, code: 'motif_obligatoire' };
  if (options.par.trim() === '') return { ok: false, code: 'auteur_obligatoire' };
  if (options.horodatage < trace.horodatage) return { ok: false, code: 'horodatage_anterieur' };
  return {
    ok: true,
    trace: { ...trace, horodatage: options.horodatage, resultat: 'ECARTE', motif, par: options.par },
  };
}
