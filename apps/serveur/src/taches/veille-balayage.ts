// Balayage planifié des sources de la veille : empreinte ciblée, sans IA, alerte si changement ou arrêt.
// Écrit contre des interfaces (lecture, veille, alerte) : aucun réseau, aucune base, aucune file réelle ici.
import { createHash } from 'node:crypto';
import type { PortAlerteExploitation } from '../../../../packages/noyau/src/exploitation/port-alerte.js';
import { creerFiche, type FicheChangement } from '../../../../packages/noyau/src/sources/veille-circuit.js';
import {
  enPeriodeRapprochee, etatVeille, ErreurEtatVeille,
  type Calendrier, type PeriodeRapprochee,
} from '../../../../packages/noyau/src/sources/veille-etat.js';

export interface SourceVeille { id: string; adresse: string; debutMarqueur: string; finMarqueur: string }
export interface PortLecture { lire(adresse: string, signal: AbortSignal): Promise<string> }
export interface PortVeille {
  sources(): Promise<readonly SourceVeille[]>;
  empreinte(sourceId: string): Promise<string | null>;
  noterEmpreinte(sourceId: string, empreinte: string, le: string): Promise<void>;
  dernierBalayage(): Promise<string | null>;
  noterBalayage(jour: string): Promise<void>;
  ficheExiste(id: string): Promise<boolean>;
  ajouterFiche(fiche: FicheChangement): Promise<void>;
}
export type AlerteVeille =
  | { code: 'changement_detecte'; sourceId: string; ficheId: string }
  | { code: 'source_illisible'; sourceId: string }
  | { code: 'veille_arretee'; dernierBalayage: string | null };
export type PortAlerte = PortAlerteExploitation<AlerteVeille>;

/** Hachage du texte compris entre les deux marqueurs (blancs normalisés) ; null si un marqueur manque. */
export function empreinteCiblee(contenu: string, source: SourceVeille): string | null {
  const debut = contenu.indexOf(source.debutMarqueur);
  if (debut < 0) return null;
  const depart = debut + source.debutMarqueur.length;
  const fin = contenu.indexOf(source.finMarqueur, depart);
  if (fin < 0) return null;
  const texte = contenu.slice(depart, fin).replace(/\s+/g, ' ').trim();
  return createHash('sha256').update(texte).digest('hex');
}

/** Vrai en période rapprochée (chaque jour), si aucun balayage n'a eu lieu, ou si l'intervalle est écoulé. */
export function balayageDu(
  p: { jour: string; dernierBalayage: string | null; intervalleJours: number; periode: PeriodeRapprochee },
  cal: Calendrier,
): boolean {
  if (typeof p.intervalleJours !== 'number' || !Number.isInteger(p.intervalleJours) || p.intervalleJours < 0) {
    throw new ErreurEtatVeille('nombre_invalide');
  }
  if (p.dernierBalayage !== null && p.jour < p.dernierBalayage) throw new ErreurEtatVeille('ordre_inverse');
  if (enPeriodeRapprochee(p.jour, p.periode)) return p.dernierBalayage === null || p.dernierBalayage < p.jour;
  if (p.dernierBalayage === null) return true;
  return cal.ajouterJours(p.dernierBalayage, p.intervalleJours) <= p.jour;
}

async function lireAvecDelai(lecture: PortLecture, source: SourceVeille, delaiMs: number): Promise<string> {
  const controleur = new AbortController();
  let minuterie: ReturnType<typeof setTimeout> | undefined;
  const delai = new Promise<never>((_, rejeter) => {
    minuterie = setTimeout(() => {
      controleur.abort();
      rejeter(new Error('delai_depasse'));
    }, delaiMs);
  });
  try {
    return await Promise.race([lecture.lire(source.adresse, controleur.signal), delai]);
  } finally {
    clearTimeout(minuterie);
  }
}

export interface ParametresBalayage {
  jour: string;
  le: string;
  delaiMs: number;
  lecture: PortLecture;
  veille: PortVeille;
  alerte: PortAlerte;
}

/** Une source illisible n'arrête pas les autres ; le jour n'est noté que si toutes ont été lues. */
export async function balayer(p: ParametresBalayage): Promise<void> {
  let echec = false;
  for (const source of await p.veille.sources()) {
    let empreinte: string | null = null;
    try {
      empreinte = empreinteCiblee(await lireAvecDelai(p.lecture, source, p.delaiMs), source);
    } catch {
      empreinte = null;
    }
    if (empreinte === null) {
      echec = true;
      await p.alerte.alerter({ code: 'source_illisible', sourceId: source.id });
      continue;
    }
    const avant = await p.veille.empreinte(source.id);
    if (avant === null) {
      await p.veille.noterEmpreinte(source.id, empreinte, p.le);
    } else if (avant !== empreinte) {
      const fiche = creerFiche({ id: `${source.id}:${empreinte}`, sourceId: source.id, detecteeLe: p.le, empreinteAvant: avant, empreinteApres: empreinte });
      if (!(await p.veille.ficheExiste(fiche.id))) await p.veille.ajouterFiche(fiche);
      await p.veille.noterEmpreinte(source.id, empreinte, p.le);
      await p.alerte.alerter({ code: 'changement_detecte', sourceId: source.id, ficheId: fiche.id });
    }
  }
  if (!echec) await p.veille.noterBalayage(p.jour);
}

/** Alerte à Will seulement si la veille s'est arrêtée. */
export async function surveillerVeille(
  p: {
    dernierBalayage: string | null;
    maintenant: string;
    maxJoursNormal: number;
    maxJoursRapproche: number;
    periode: PeriodeRapprochee;
    alerte: PortAlerte;
  },
  cal: Calendrier,
): Promise<void> {
  const { alerte, ...reste } = p;
  if (etatVeille(reste, cal) === 'alerte') await alerte.alerter({ code: 'veille_arretee', dernierBalayage: p.dernierBalayage });
}
