// Signalements : contenu propre à la compta, sans aucune clé vers les écritures (spec 06, point P8).
// Purge quotidienne selon un paramètre daté et sourcé, vide par défaut : durée absente = rien n'est effacé, une alerte part.
// Écrit contre des interfaces (dépôt, paramètre, alerte, planificateur) : rien de réel ici.
import type { Planificateur } from '../../../../packages/noyau/src/exploitation/planificateur.js';
import type { PortAlerteExploitation } from '../../../../packages/noyau/src/exploitation/port-alerte.js';
import { rapportOutilErreurs, signalementsAPurger } from '../../../../packages/noyau/src/securite/signalements.js';

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;
const LONGUEUR_DATE = 10;

export interface Signalement {
  societeId: string;
  signalementId: string;
  personneId: string;
  nature: string;
  etat: 'ouvert' | 'traite';
  creeLe: string;
  /** Même identifiant que celui de l'erreur rapportée. */
  correlationId: string;
}
export interface PortSignalements {
  ajouter(s: Signalement): Promise<void>;
  lister(societeId: string): Promise<readonly Signalement[]>;
  supprimer(societeId: string, ids: readonly string[]): Promise<void>;
}
/** Ligne du paramètre daté : `dureeJours` vide par défaut. */
export interface LigneParametre { dateEffet: string; dureeJours: number | null; source: string }
export interface PortParametre { lire(societeId: string): Promise<readonly LigneParametre[]> }
export interface AlerteSignalements { code: 'parametre_signalements_absent'; societeId: string }

export class ErreurSignalement extends Error {
  override name = 'ErreurSignalement';
  readonly code: 'correlation_invalide' | 'champ_vide';
  constructor(code: 'correlation_invalide' | 'champ_vide') {
    super(code);
    this.code = code;
  }
}

/** Textes montrés à la personne : aucun délai, aucun mot interdit. */
export const TEXTES_SIGNALEMENT = {
  confirmation: 'Votre signalement a bien été transmis.',
  suite: 'Nous reviendrons vers vous dès que possible.',
} as const;

export interface DemandeSignalement { societeId: string; personneId: string; nature: string; correlationId: string }

export async function enregistrerSignalement(
  depot: PortSignalements, demande: DemandeSignalement, maintenant: Date, nouvelId: () => string,
): Promise<Signalement> {
  if (rapportOutilErreurs({ correlation_id: demande.correlationId }).correlation_id === 'inconnu') {
    throw new ErreurSignalement('correlation_invalide');
  }
  for (const v of [demande.societeId, demande.personneId, demande.nature]) {
    if (typeof v !== 'string' || v.trim() === '') throw new ErreurSignalement('champ_vide');
  }
  const s: Signalement = {
    societeId: demande.societeId, signalementId: nouvelId(), personneId: demande.personneId,
    nature: demande.nature, etat: 'ouvert', creeLe: maintenant.toISOString(), correlationId: demande.correlationId,
  };
  await depot.ajouter(s);
  return s;
}

/** Durée en jours de la ligne la plus récente en vigueur et sourcée ; `undefined` si aucune. */
export function dureeEnVigueur(lignes: readonly LigneParametre[], jour: string): number | undefined {
  const valides = lignes
    .filter((l) => l.dateEffet <= jour && l.source.trim() !== '')
    .sort((a, b) => (a.dateEffet < b.dateEffet ? 1 : a.dateEffet > b.dateEffet ? -1 : 0));
  const d = valides[0]?.dureeJours;
  return typeof d === 'number' && Number.isInteger(d) && d >= 0 ? d : undefined;
}

export interface ParametresPurgeSignalements {
  societes: readonly string[];
  depot: PortSignalements;
  parametre: PortParametre;
  alerte: PortAlerteExploitation<AlerteSignalements>;
}

/** Retourne le nombre de signalements effacés. */
export async function purgerSignalements(p: ParametresPurgeSignalements, maintenant: string): Promise<number> {
  let total = 0;
  const jour = maintenant.slice(0, LONGUEUR_DATE);
  for (const societeId of p.societes) {
    const duree = dureeEnVigueur(await p.parametre.lire(societeId), jour);
    if (duree === undefined) {
      await p.alerte.alerter({ code: 'parametre_signalements_absent', societeId });
      continue;
    }
    const lignes = await p.depot.lister(societeId);
    const { aPurger } = signalementsAPurger(
      lignes.map((s) => ({ id: s.signalementId, creeLe: s.creeLe })), maintenant, duree * MS_PAR_JOUR,
    );
    if (aPurger.length > 0) await p.depot.supprimer(societeId, aPurger);
    total += aPurger.length;
  }
  return total;
}

/** Inscrit la purge quotidienne (UTC) auprès du planificateur commun. */
export function inscrirePurgeSignalements(planificateur: Planificateur, p: ParametresPurgeSignalements): void {
  planificateur.inscrire({
    nom: 'purge-signalements',
    rythme: { chaque: 'jour', heure: 3, minute: 0 },
    executer: async (passage) => {
      await purgerSignalements(p, passage.prevuLe);
    },
  });
}
