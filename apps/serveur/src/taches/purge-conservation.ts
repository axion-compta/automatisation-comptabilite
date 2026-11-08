// Purge planifiée selon la règle de conservation, avec preuve d'effacement des sauvegardes.
// Écrit contre des interfaces (objets, purges, gels, effacement, sauvegardes, trace, alerte) : rien de réel ici.
import { ajouterJours, comparerDates } from '../../../../packages/noyau/src/dates/civiles.js';
import {
  conserverJusquAu,
  purgePossible,
  type CategorieConservation,
  type Gel,
  type PointDepart,
  type RegleConservation,
} from '../../../../packages/noyau/src/conservation/regles.js';
import type { PortAlerteExploitation } from '../../../../packages/noyau/src/exploitation/port-alerte.js';

export class ErreurPurge extends Error {
  override name = 'ErreurPurge';
  readonly code: 'rotation_invalide';
  constructor(code: 'rotation_invalide') {
    super(code);
    this.code = code;
  }
}

export interface ObjetConservable {
  id: string;
  societeId: string;
  categorie: CategorieConservation;
  pays: string[];
  dates: Partial<Record<PointDepart, string>>;
}
export interface PurgePlanifiee {
  objetId: string;
  societeId: string;
  categorie: CategorieConservation;
  datePrevue: string | null;
  statut: 'planifiee' | 'refusee' | 'effacee_base' | 'effacee_sauvegardes';
  code?: 'gel_actif' | 'a_confirmer' | 'export_non_remis';
  preuve?: { effaceBaseLe: string; sauvegardesAuPlusTardLe: string; source: string };
}
export interface PortObjets { lister(societeId: string): Promise<readonly ObjetConservable[]> }
export interface PortPurges {
  lire(societeId: string, objetId: string): Promise<PurgePlanifiee | null>;
  ecrire(purge: PurgePlanifiee): Promise<void>;
  /** Purges au statut `effacee_base` : l'objet n'est plus listé par `PortObjets`, il faut donc les relire ici. */
  listerEffaceesBase(societeId: string): Promise<readonly PurgePlanifiee[]>;
}
export interface PortGels { lire(societeId: string): Promise<readonly Gel[]> }
export interface PortEffacement { effacerBase(societeId: string, objetId: string): Promise<void> }
export interface PortSauvegardes { plusAncienneLe(societeId: string): Promise<string | null> }
export interface PortTrace {
  ajouter(societeId: string, trace: { code: 'suppression_refusee_gel'; objetId: string; le: string }): Promise<void>;
}
export interface AlertePurge { code: 'purge_en_echec'; societeId: string; objetId: string }

export interface ParametresPurge {
  societes: readonly string[];
  regles: readonly RegleConservation[];
  aujourdhui: string;
  rotationSauvegardesJours: number;
  finsDeContrat: Record<string, { exportRemisLe?: string }>;
  ports: {
    objets: PortObjets;
    purges: PortPurges;
    gels: PortGels;
    effacement: PortEffacement;
    sauvegardes: PortSauvegardes;
    trace: PortTrace;
  };
  alerte: PortAlerteExploitation<AlertePurge>;
}

const EFFACEES = ['effacee_base', 'effacee_sauvegardes'];

async function traiterObjet(p: ParametresPurge, objet: ObjetConservable, gels: readonly Gel[], limite: string): Promise<void> {
  const { societeId, id: objetId, categorie } = objet;
  const base = { objetId, societeId, categorie };
  const ecrire = (reste: Omit<PurgePlanifiee, 'objetId' | 'societeId' | 'categorie'>): Promise<void> =>
    p.ports.purges.ecrire({ ...base, ...reste });
  const conservation = conserverJusquAu(p.regles, { pays: objet.pays, categorie, dates: objet.dates });
  const decision = purgePossible(conservation, { gels, aujourdhui: p.aujourdhui });
  if (!decision.ok && decision.code === 'gel_actif') {
    await p.ports.trace.ajouter(societeId, { code: 'suppression_refusee_gel', objetId, le: p.aujourdhui });
    return ecrire({ datePrevue: null, statut: 'refusee', code: 'gel_actif' });
  }
  const fin = p.finsDeContrat[societeId];
  if (fin !== undefined && fin.exportRemisLe === undefined) {
    return ecrire({ datePrevue: null, statut: 'refusee', code: 'export_non_remis' });
  }
  if (!decision.ok && decision.code === 'a_confirmer') {
    return ecrire({ datePrevue: null, statut: 'refusee', code: 'a_confirmer' });
  }
  if (!decision.ok || conservation.etat !== 'date') {
    return ecrire({ datePrevue: conservation.etat === 'date' ? conservation.date : null, statut: 'planifiee' });
  }
  try {
    await p.ports.effacement.effacerBase(societeId, objetId);
  } catch {
    await p.alerte.alerter({ code: 'purge_en_echec', societeId, objetId });
    return;
  }
  await ecrire({
    datePrevue: conservation.date,
    statut: 'effacee_base',
    preuve: { effaceBaseLe: p.aujourdhui, sauvegardesAuPlusTardLe: limite, source: conservation.regle.source },
  });
}

async function passerSociete(p: ParametresPurge, societeId: string, limite: string): Promise<void> {
  const objets = await p.ports.objets.lister(societeId);
  const gels = await p.ports.gels.lire(societeId);
  const aConfirmer = (await p.ports.purges.listerEffaceesBase(societeId)).filter(
    (x) => x.societeId === societeId && x.statut === 'effacee_base',
  );
  for (const objet of objets) {
    if (objet.societeId !== societeId) continue;
    const existante = await p.ports.purges.lire(societeId, objet.id);
    if (existante !== null && EFFACEES.includes(existante.statut)) continue;
    await traiterObjet(p, objet, gels, limite);
  }
  if (aConfirmer.length === 0) return;
  const plusAncienne = await p.ports.sauvegardes.plusAncienneLe(societeId);
  if (plusAncienne === null) return;
  for (const purge of aConfirmer) {
    if (purge.preuve !== undefined && comparerDates(plusAncienne, purge.preuve.effaceBaseLe) > 0) {
      await p.ports.purges.ecrire({ ...purge, statut: 'effacee_sauvegardes' });
    }
  }
}

/** Une société après l'autre. Paramètres vérifiés avant tout effacement. */
export async function passerPurge(p: ParametresPurge): Promise<void> {
  if (!Number.isSafeInteger(p.rotationSauvegardesJours) || p.rotationSauvegardesJours < 0) {
    throw new ErreurPurge('rotation_invalide');
  }
  const limite = ajouterJours(p.aujourdhui, p.rotationSauvegardesJours);
  for (const societeId of p.societes) await passerSociete(p, societeId, limite);
}
