// Passage nocturne : tout le catalogue sur l'exercice ouvert, une société après l'autre.
// Écrit contre des interfaces (source, journal, alerte) : aucune file ni base réelle ici.
import { nocturneEnRetard, objetsAControler } from '../../../../packages/noyau/src/controles/declencheurs.js';
import { executerControles, type ObjetControle, type RegleControle, type TraceControle } from '../../../../packages/noyau/src/controles/moteur.js';

export interface SourceSociete<T> {
  charger(societeId: string): Promise<{ regles: readonly RegleControle<T>[]; objets: readonly ObjetControle<T>[] }>;
}

export interface PortJournal {
  dejaPasse(societeId: string, passageId: string): Promise<boolean>;
  ajouter(societeId: string, passageId: string, traces: readonly TraceControle[]): Promise<void>;
}

export type AlerteExploitation =
  | { code: 'nocturne_en_retard'; passageId: string }
  | { code: 'nocturne_societe_en_echec'; passageId: string; societeId: string };

export interface ParametresNocturne<T> {
  societes: readonly string[];
  passageId: string;
  dureeMaxMinutes: number;
  source: SourceSociete<T>;
  journal: PortJournal;
  maintenant(): string;
  alerter(alerte: AlerteExploitation): void | Promise<void>;
}

export interface ResultatSociete { societeId: string; etat: 'fait' | 'deja_fait' | 'echec'; traces: number }
export interface ResultatNocturne { passageId: string; enRetard: boolean; societes: ResultatSociete[] }

async function passerSociete<T>(p: ParametresNocturne<T>, societeId: string): Promise<ResultatSociete> {
  if (await p.journal.dejaPasse(societeId, p.passageId)) return { societeId, etat: 'deja_fait', traces: 0 };
  const { regles, objets } = await p.source.charger(societeId);
  const parCle = new Map(objets.map((o) => [JSON.stringify([o.type, o.id]), o]));
  const aControler = objetsAControler({ declencheur: 'nocturne', tousLesObjets: objets })
    .flatMap((o) => parCle.get(JSON.stringify([o.type, o.id])) ?? []);
  const traces = executerControles(regles, aControler, 'nocturne', p.maintenant());
  await p.journal.ajouter(societeId, p.passageId, traces);
  return { societeId, etat: 'fait', traces: traces.length };
}

/** Une société à la fois : jamais deux sociétés dans le même passage de données. */
export async function passerNocturne<T>(p: ParametresNocturne<T>): Promise<ResultatNocturne> {
  const debut = p.maintenant();
  const societes: ResultatSociete[] = [];
  for (const societeId of p.societes) {
    try {
      societes.push(await passerSociete(p, societeId));
    } catch {
      societes.push({ societeId, etat: 'echec', traces: 0 });
      await p.alerter({ code: 'nocturne_societe_en_echec', passageId: p.passageId, societeId });
    }
  }
  const fin = p.maintenant();
  const enRetard = nocturneEnRetard(debut, fin, p.dureeMaxMinutes, fin);
  if (enRetard) await p.alerter({ code: 'nocturne_en_retard', passageId: p.passageId });
  return { passageId: p.passageId, enRetard, societes };
}
