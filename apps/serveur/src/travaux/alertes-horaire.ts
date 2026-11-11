// Évaluation des alertes (AL-R1) : travail horaire et relances sur événements.
// Écrit contre des interfaces (ports) : aucune file, base ni adresse réelle ici.
import { compteursParEntree } from '../../../../packages/noyau/src/alertes/gravite.js';
import { evaluer, type Alerte, type Constat, type LigneJournal } from '../../../../packages/noyau/src/alertes/moteur.js';
import type { Planificateur } from '../../../../packages/noyau/src/exploitation/planificateur.js';

export interface PortAlertes {
  lister(societeId: string): Promise<readonly Alerte[]>;
  enregistrer(societeId: string, alertes: readonly Alerte[], journal: readonly LigneJournal[]): Promise<void>;
}
export interface SourceConstats {
  constats(societeId: string): Promise<{ constats: readonly Constat[]; regles: readonly string[] }>;
}
export type CompteursMenu = Record<string, { ouvertes: number; urgentes: number; pointExclamation: boolean }>;
export interface PortCompteursMenu { enregistrer(societeId: string, compteurs: CompteursMenu): Promise<void> }

export interface ParametresEvaluateur {
  alertes: PortAlertes;
  source: SourceConstats;
  compteurs: PortCompteursMenu;
  entreeDe(regle: string): string;
  nouvelId(): string;
}
export interface Evaluateur { evaluer(societeId: string, horodatage: string): Promise<void> }

/**
 * Une évaluation à la fois par société : la lecture, le calcul et l'écriture ne s'entrecroisent jamais,
 * donc deux déclencheurs simultanés (horaire et événement) ne créent aucune alerte en double.
 */
export function creerEvaluateur(p: ParametresEvaluateur): Evaluateur {
  const files = new Map<string, Promise<void>>();
  async function passer(societeId: string, horodatage: string): Promise<void> {
    const existantes = await p.alertes.lister(societeId);
    const { constats, regles } = await p.source.constats(societeId);
    const r = evaluer(existantes, constats, regles, horodatage, p.nouvelId);
    await p.alertes.enregistrer(societeId, r.alertes, r.journal);
    await p.compteurs.enregistrer(societeId, compteursParEntree(r.alertes, p.entreeDe));
  }
  return {
    evaluer(societeId, horodatage) {
      const precedent = files.get(societeId) ?? Promise.resolve();
      const suite = precedent.catch(() => undefined).then(() => passer(societeId, horodatage));
      files.set(societeId, suite);
      return suite;
    },
  };
}

export const NOM_TRAVAIL_HORAIRE = 'alertes.horaire';

/** Inscrit le travail horaire (UTC, minute 0) ; une société en échec n'empêche pas les suivantes. */
export function inscrireTravailHoraire(
  planificateur: Planificateur,
  o: { evaluateur: Evaluateur; societes(): Promise<readonly string[]> },
): void {
  planificateur.inscrire({
    nom: NOM_TRAVAIL_HORAIRE,
    rythme: { chaque: 'heure', minute: 0 },
    async executer(passage) {
      let echecs = 0;
      for (const societeId of await o.societes()) {
        try {
          await o.evaluateur.evaluer(societeId, passage.prevuLe);
        } catch {
          echecs += 1;
        }
      }
      if (echecs > 0) throw new Error('societes_en_echec');
    },
  });
}
