// Mesure d'usage stockée (spec 15, PR-R7 et PR-R9) : dépôt en mémoire derrière une interface.
// Données pseudonymisées ; secret propre à chaque client ; aucune suppression réelle (marquage seulement).
import { pseudonyme, validerEvenements, type EvenementUsage } from '../../../../packages/noyau/src/usage/usage.js';

const MOIS_MIN = 1;
const MOIS_MAX = 120;
const UNE_HEURE_MS = 3_600_000;

/** Ligne écrite : liste blanche des champs, rien d'autre. */
export type LigneUsage = {
  societe_id: string;
  id: string;
  pseudonyme: string;
  type: string;
  ecran_code: string | null;
  duree_ms: number | null;
  appareil: 'bureau' | 'mobile' | null;
  version_app: string | null;
  le: number;
  purge_le: number;
  retiree: boolean;
};

export const CHAMPS_LIGNE: readonly string[] = Object.freeze([
  'societe_id', 'id', 'pseudonyme', 'type', 'ecran_code', 'duree_ms',
  'appareil', 'version_app', 'le', 'purge_le', 'retiree',
]);

export type StatTache = { tache: string; effectif: number; mediane_ms: number; p90_ms: number };

/** Interface du dépôt : la console écrira contre elle, un faux serveur la remplit en essai. */
export interface DepotUsage {
  ecrire(societeId: string, personneId: string, evenements: unknown[]): number;
  marquerEcheances(societeId: string): number;
  lire(societeId: string): LigneUsage[];
  compter(societeId: string): number;
  statistiques(societeId: string): StatTache[];
}

export type OptionsDepot = {
  /** Durée de conservation en mois : paramètre, jamais en dur. */
  conservationMois: number;
  maintenant: () => number;
  /** Secret propre à chaque client ; jamais journalisé ni rendu. */
  secretDe: (societeId: string) => string | undefined;
};

function ajouterMois(ms: number, mois: number): number {
  const d = new Date(ms);
  d.setUTCMonth(d.getUTCMonth() + mois);
  return d.getTime();
}

/** Rang le plus proche (méthode du rang supérieur) sur une liste triée non vide. */
function centile(tries: readonly number[], p: number): number {
  const rang = Math.max(1, Math.ceil(p * tries.length));
  return tries[rang - 1] as number;
}

export function creerDepotUsage(options: OptionsDepot): DepotUsage {
  const { conservationMois, maintenant, secretDe } = options;
  if (!Number.isInteger(conservationMois) || conservationMois < MOIS_MIN || conservationMois > MOIS_MAX) {
    throw new RangeError('conservationMois hors limites');
  }
  const lignes: LigneUsage[] = [];
  let compteur = 0;

  // Une ligne échue est marquée dès qu'on la touche : plus jamais lue ni comptée.
  const vivantes = (societeId: string): LigneUsage[] => {
    marquer(societeId);
    return lignes.filter((l) => l.societe_id === societeId && !l.retiree);
  };
  const marquer = (societeId: string): number => {
    const t = maintenant();
    let n = 0;
    for (const l of lignes) {
      if (l.societe_id === societeId && !l.retiree && l.purge_le <= t) {
        l.retiree = true;
        n += 1;
      }
    }
    return n;
  };

  return {
    ecrire(societeId, personneId, evenements) {
      const secret = secretDe(societeId);
      if (secret === undefined) throw new Error('secret du client absent');
      const { acceptes } = validerEvenements(evenements, { dureeMaxMs: UNE_HEURE_MS });
      const p = pseudonyme(personneId, secret);
      const t = maintenant();
      for (const e of acceptes as EvenementUsage[]) {
        compteur += 1;
        lignes.push({
          societe_id: societeId,
          id: `usage-${compteur}`,
          pseudonyme: p,
          type: e.type,
          ecran_code: e.ecran_code ?? null,
          duree_ms: e.duree_ms ?? null,
          appareil: e.appareil ?? null,
          version_app: e.version_app ?? null,
          le: t,
          purge_le: ajouterMois(t, conservationMois),
          retiree: false,
        });
      }
      return acceptes.length;
    },
    marquerEcheances: marquer,
    lire: (societeId) => vivantes(societeId).map((l) => ({ ...l })),
    compter: (societeId) => vivantes(societeId).length,
    statistiques(societeId) {
      const parTache = new Map<string, number[]>();
      for (const l of vivantes(societeId)) {
        if (l.ecran_code === null || l.duree_ms === null) continue;
        parTache.set(l.ecran_code, [...(parTache.get(l.ecran_code) ?? []), l.duree_ms]);
      }
      return [...parTache.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([tache, d]) => {
          const tries = [...d].sort((a, b) => a - b);
          return { tache, effectif: tries.length, mediane_ms: centile(tries, 0.5), p90_ms: centile(tries, 0.9) };
        });
    },
  };
}
