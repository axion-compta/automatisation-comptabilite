// Consommateurs d'événements de l'interface : relance des alertes, invalidation et recalcul des instantanés.
// Lit l'enveloppe de L00-T49 ; écrit contre des interfaces (ports) et un faux service.
import type { Enveloppe } from '../../../../packages/noyau/src/evenements/enveloppe.js';
import type { Periode } from '../../../../packages/noyau/src/interface/types.js';
import {
  appliquerEvenement, carteAntidatee, doitRecalculer, type EvenementEcriture, type Instantane,
} from '../../../../packages/noyau/src/tableau-de-bord/instantanes.js';
import type { Evaluateur } from './alertes-horaire.js';

export interface PortInstantanes {
  lister(societeId: string): Promise<readonly Instantane[]>;
  remplacer(societeId: string, instantanes: readonly Instantane[]): Promise<void>;
  versionEcritures(societeId: string): Promise<number>;
  periodesDeclarees(societeId: string): Promise<readonly Periode[]>;
}
export interface PortVus {
  /** Dernière version vue pour l'objet, ou 0 ; `dejaVu` répond pour un identifiant d'événement. */
  derniereVersion(societeId: string, objetId: string): Promise<number>;
  noter(e: Enveloppe): Promise<void>;
  dejaVu(societeId: string, id: string): Promise<boolean>;
}
export interface PortCartes { ouvrirAntidatee(societeId: string, objetId: string, date: string): Promise<void> }

export const TYPES_ECRITURE: Readonly<Record<string, EvenementEcriture>> = Object.freeze({
  'compta.ecriture.validee': 'validee',
  'compta.ecriture.corrigee': 'corrigee',
  'compta.ecriture.contre_passee': 'contre_passee',
  'compta.ecriture.validation_annulee': 'validation_annulee',
});
export const TYPES_RELANCE: readonly string[] = Object.freeze([
  ...Object.keys(TYPES_ECRITURE), 'compta.tiers.cree', 'compta.piece.lue', 'compta.releve.importe', 'compta.echeance.modifiee',
]);

export interface ParametresConsommateur {
  vus: PortVus;
  instantanes: PortInstantanes;
  cartes: PortCartes;
  evaluateur: Evaluateur;
  calculer(societeId: string, i: Instantane, versionCourante: number): Promise<Instantane>;
}
export type IssueEvenement = 'traite' | 'doublon' | 'ancien' | 'ignore';

/** Recalcule seulement les instantanés invalidés ou en retard de version. */
export async function recalculerInstantanes(p: ParametresConsommateur, societeId: string): Promise<number> {
  const version = await p.instantanes.versionEcritures(societeId);
  const courants = await p.instantanes.lister(societeId);
  let n = 0;
  const suivants: Instantane[] = [];
  for (const i of courants) {
    if (doitRecalculer(i, version)) {
      suivants.push({ ...(await p.calculer(societeId, i, version)), invalide: false, versionEcritures: version });
      n += 1;
    } else suivants.push(i);
  }
  if (n > 0) await p.instantanes.remplacer(societeId, suivants);
  return n;
}

export function creerConsommateur(p: ParametresConsommateur): { consommer(e: Enveloppe): Promise<IssueEvenement> } {
  let file: Promise<unknown> = Promise.resolve();
  const traiter = async (e: Enveloppe): Promise<IssueEvenement> => {
      if (!TYPES_RELANCE.includes(e.type)) return 'ignore';
      if (await p.vus.dejaVu(e.societe_id, e.id)) return 'doublon';
      if (e.version <= (await p.vus.derniereVersion(e.societe_id, e.objet_id))) return 'ancien';
      const genre = TYPES_ECRITURE[e.type];
      const date = e.charge.date;
      if (genre !== undefined && typeof date === 'string') {
        const declarees = await p.instantanes.periodesDeclarees(e.societe_id);
        const suivants = appliquerEvenement(await p.instantanes.lister(e.societe_id), { type: genre, date });
        await p.instantanes.remplacer(e.societe_id, suivants);
        if (carteAntidatee(date, declarees)) await p.cartes.ouvrirAntidatee(e.societe_id, e.objet_id, date);
        await recalculerInstantanes(p, e.societe_id);
      }
      await p.evaluateur.evaluer(e.societe_id, e.horodatage);
      await p.vus.noter(e);
      return 'traite';
  };
  // Un événement à la fois : deux livraisons simultanées du même `id` ne passent jamais ensemble.
  return {
    consommer(e) {
      const suite = file.catch(() => undefined).then(() => traiter(e));
      file = suite;
      return suite;
    },
  };
}
