// Intercepteur commun des quatre actions réelles : rejoue le catalogue puis refuse en 409.
// Aucun résultat réutilisé : les traces sont toujours recalculées ici. Codes seulement.
import { objetsAControler, reglesAJouer, type ObjetRef } from '../../../../packages/noyau/src/controles/declencheurs.js';
import { verifierAvantAction } from '../../../../packages/noyau/src/controles/garde-fou.js';
import { executerControles, type Blocage, type Declencheur, type ObjetControle, type RegleControle } from '../../../../packages/noyau/src/controles/moteur.js';
import { reponseGardeFou, type Reponse409 } from '../../../../packages/noyau/src/controles/reponses.js';

export type ActionReelle = 'valider_mois' | 'preparer_tva' | 'exporter' | 'cloturer';

const CORRESPONDANCE: Record<ActionReelle, { declencheur: Declencheur; blocage: Blocage }> = {
  valider_mois: { declencheur: 'a_la_demande', blocage: 'validation' },
  preparer_tva: { declencheur: 'avant_tva', blocage: 'tva' },
  exporter: { declencheur: 'avant_export', blocage: 'export' },
  cloturer: { declencheur: 'avant_cloture', blocage: 'cloture' },
};

/** Source des objets : interface (adaptateur en mémoire pour les essais). */
export interface SourceControle<T> {
  regles(): readonly RegleControle<T>[];
  tousLesObjets(): readonly ObjetRef[];
  charger(ref: ObjetRef): ObjetControle<T>;
}

export interface DemandeAction {
  action: ActionReelle;
  horodatage: string;
  periode?: { debut: string; fin: string };
}

export type AvantAction = (demande: DemandeAction) => Reponse409 | null;

function reglesDeLAction<T>(regles: readonly RegleControle<T>[], action: ActionReelle): RegleControle<T>[] {
  const { declencheur, blocage } = CORRESPONDANCE[action];
  if (action === 'preparer_tva') return reglesAJouer(regles, declencheur);
  const actives = regles.filter((r) => r.actif);
  return action === 'valider_mois' ? actives.filter((r) => r.bloque.includes(blocage)) : actives;
}

/** Crée l'intercepteur : `null` si l'action peut continuer, sinon la réponse 409. */
export function creerAvantAction<T>(source: SourceControle<T>): AvantAction {
  return (demande) => {
    const { declencheur, blocage } = CORRESPONDANCE[demande.action];
    const regles = reglesDeLAction(source.regles(), demande.action);
    const contexte = { declencheur, tousLesObjets: source.tousLesObjets() };
    const refs = objetsAControler(demande.periode === undefined ? contexte : { ...contexte, periode: demande.periode });
    // Les règles retenues pour l'action sont jouées quel que soit leur déclencheur d'origine.
    const aJouer = regles.map((r) => ({ ...r, declencheurs: [...r.declencheurs, declencheur] }));
    const traces = executerControles(aJouer, refs.map((r) => source.charger(r)), declencheur, demande.horodatage);
    return reponseGardeFou(verifierAvantAction(traces, regles, blocage));
  };
}
