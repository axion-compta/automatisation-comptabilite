import { donneesCatalogueControles, type DonneesCatalogueControles } from '../../../donnees-fictives/src/catalogue-controles.js';
import { GRAINE } from '../../../donnees-fictives/src/generateur.js';
import { verifierAvantAction } from '../../../noyau/src/controles/garde-fou.js';
import type { Blocage, RegleControle, TraceControle } from '../../../noyau/src/controles/moteur.js';
import { reponseGardeFou } from '../../../noyau/src/controles/reponses.js';
import type { ActionGardee, ReponseBloquants } from './bloquants.js';

/** Service pur en mémoire sur le catalogue fictif (L12-T40) : même verdict que le refus 409 (L12-T25). Lecture seulement. */
export function creerServiceBloquants(donnees: DonneesCatalogueControles = donneesCatalogueControles(GRAINE)) {
  const traces: TraceControle[] = donnees.traces.map((t) => ({ ...t }));
  const regles: RegleControle<unknown>[] = donnees.regles.map((r) => ({
    id: r.id, version: 1, gravite: r.gravite, bloque: r.bloque as Blocage[], declencheurs: [], actif: true, evaluer: () => ({ resultat: 'OK' }),
  }));
  return {
    lister(action: ActionGardee): ReponseBloquants {
      const refus = reponseGardeFou(verifierAvantAction(traces, regles, action));
      return refus ? { autorise: false, bloquants: refus.corps.bloquants } : { autorise: true, bloquants: [] };
    },
  };
}
export type ServiceBloquants = ReturnType<typeof creerServiceBloquants>;
