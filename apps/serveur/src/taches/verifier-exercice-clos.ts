// Relecture d'un exercice clos : détecte une altération, la signale, ne répare jamais.
// Écrit contre des interfaces (écritures, instantanés, boîte d'envoi, alerte) : aucun réseau, aucune base.
import type { Passage, Planificateur, Rythme } from '../../../../packages/noyau/src/exploitation/planificateur.js';
import type { PortAlerteExploitation } from '../../../../packages/noyau/src/exploitation/port-alerte.js';
import type { Enveloppe } from '../../../../packages/noyau/src/evenements/enveloppe.js';
import type { BoiteEnvoi } from '../../../../packages/noyau/src/evenements/publication.js';
import { executerControles } from '../../../../packages/noyau/src/controles/moteur.js';
import { regleRelectureExercice } from '../../../../packages/noyau/src/controles/regles/principes-moteur.js';
import type { PortEcritures } from '../persistance/ecritures-figees.js';
import type { PortMoteur } from '../persistance/moteur-ports.js';

export type MotifVerification = 'annuelle' | 'a_la_demande' | 'avant_export';
export type StatutVerification = 'intact' | 'altere' | 'instantane_absent';
export type AlerteExercice = { code: 'exercice_altere' | 'instantane_absent'; societeId: string; exerciceId: string };

export interface ParametresVerification {
  societeId: string;
  exerciceId: string;
  motif: MotifVerification;
  ecritures: PortEcritures;
  instantanes: Pick<PortMoteur, 'dernierInstantane'>;
  maintenant(): string;
  boiteEnvoi: BoiteEnvoi;
  alerte: PortAlerteExploitation<AlerteExercice>;
}

export interface ResultatVerification { statut: StatutVerification; exportAutorise: boolean }

export async function verifierExerciceClos(p: ParametresVerification): Promise<ResultatVerification> {
  const { societeId, exerciceId, motif } = p;
  const horodatage = p.maintenant();
  const ecritures = await p.ecritures.lister(societeId, exerciceId);
  const ligne = await p.instantanes.dernierInstantane(societeId, exerciceId);
  let statut: StatutVerification = 'instantane_absent';
  if (ligne) {
    const [trace] = executerControles(
      [regleRelectureExercice],
      [{ type: 'exercice', id: exerciceId, donnee: { ecritures, instantane: ligne } }],
      motif === 'avant_export' ? 'avant_export' : 'a_la_demande',
      horodatage,
    );
    statut = trace?.resultat === 'OK' ? 'intact' : 'altere';
  }
  const enveloppe: Enveloppe = {
    id: ['exercice-verifie', societeId, exerciceId, motif, horodatage].join(':'),
    type: 'compta.exercice.verifie',
    societe_id: societeId,
    exercice_id: exerciceId,
    objet_id: exerciceId,
    version: 1,
    acteur: { type: 'systeme', id: 'verifier-exercice-clos' },
    canal: 'systeme',
    horodatage,
    correlation_id: ['verif', exerciceId, horodatage].join(':'),
    charge: { motif, statut },
  };
  p.boiteEnvoi.deposer(enveloppe);
  if (statut !== 'intact') {
    await p.alerte.alerter({ code: statut === 'altere' ? 'exercice_altere' : 'instantane_absent', societeId, exerciceId });
  }
  return { statut, exportAutorise: statut === 'intact' };
}

/** Inscrit la relecture annuelle au planificateur ; `preparer` fournit les ports du passage (le branchement réel reste à décider). */
export function inscrireVerificationExercice(
  planificateur: Planificateur, rythme: Rythme,
  preparer: (passage: Passage) => Promise<Omit<ParametresVerification, 'motif'>>,
): void {
  planificateur.inscrire({
    nom: 'verifier-exercice-clos', rythme,
    async executer(passage) {
      await verifierExerciceClos({ ...(await preparer(passage)), motif: 'annuelle' });
    },
  });
}
