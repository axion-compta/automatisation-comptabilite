// Correction en masse guidée : aperçu avant / après, nombre annoncé, puis brouillons seulement.
// Une écriture validée n'est jamais modifiée : contre-passation et nouvelle écriture. Fonctions pures.
import { estDateValide } from '../dates/civiles.js';
import { corriger } from './correction.js';
import type { Ecriture, LigneEcriture } from './modele.js';

export type CodeErreurReclassement =
  | 'compte_invalide'
  | 'cible_identique'
  | 'date_invalide'
  | 'confirmation_differente'
  | 'rien_a_appliquer'
  | 'motif_obligatoire';

export class ErreurReclassement extends Error {
  override name = 'ErreurReclassement';
  constructor(readonly code: CodeErreurReclassement) {
    super(code);
  }
}

export type FiltreReclassement = { readonly compteSource: string; readonly dateDebut?: string; readonly dateFin?: string };
export type Verrou = { readonly debut: string; readonly fin: string };
export type ElementApercu = {
  readonly ecritureId: string;
  readonly statut: Ecriture['statut'];
  readonly avant: readonly LigneEcriture[];
  readonly apres: readonly LigneEcriture[];
  readonly ecriture: Ecriture;
};
export type ApercuReclassement = {
  readonly compteSource: string;
  readonly compteCible: string;
  /** Nombre d'écritures qui seront touchées, annoncé avant tout geste. */
  readonly nombre: number;
  readonly elements: readonly ElementApercu[];
  /** Écritures d'une période verrouillée, exclues et comptées à part. */
  readonly verrouillees: number;
  /** Écritures déjà contre-passées ou proposées, non touchées. */
  readonly ignorees: number;
};
export type Confirmation = { readonly nombre: number; readonly date: string; readonly motif: string };
export type ResultatReclassement = { readonly brouillons: readonly Ecriture[]; readonly marquees: readonly Ecriture[] };

const compteValide = (c: string): boolean => c.trim() !== '' && /^\d+$/.test(c.trim());

export function apercuReclassement(
  ecritures: readonly Ecriture[],
  filtre: FiltreReclassement,
  compteCible: string,
  verrous: readonly Verrou[] = [],
): ApercuReclassement {
  if (!compteValide(filtre.compteSource) || !compteValide(compteCible)) throw new ErreurReclassement('compte_invalide');
  if (filtre.compteSource === compteCible) throw new ErreurReclassement('cible_identique');
  for (const d of [filtre.dateDebut, filtre.dateFin]) if (d !== undefined && !estDateValide(d)) throw new ErreurReclassement('date_invalide');
  const elements: ElementApercu[] = [];
  let verrouillees = 0;
  let ignorees = 0;
  for (const e of ecritures) {
    if (!e.lignes.some((l) => l.compte === filtre.compteSource)) continue;
    if (filtre.dateDebut !== undefined && e.date < filtre.dateDebut) continue;
    if (filtre.dateFin !== undefined && e.date > filtre.dateFin) continue;
    if (verrous.some((v) => e.date >= v.debut && e.date <= v.fin)) {
      verrouillees += 1;
      continue;
    }
    if (e.contrePassee === true || (e.statut !== 'brouillon' && e.statut !== 'valide')) {
      ignorees += 1;
      continue;
    }
    const apres = e.lignes.map((l) => (l.compte === filtre.compteSource ? { ...l, compte: compteCible } : { ...l }));
    elements.push({ ecritureId: e.id, statut: e.statut, avant: e.lignes.map((l) => ({ ...l })), apres, ecriture: e });
  }
  return { compteSource: filtre.compteSource, compteCible, nombre: elements.length, elements, verrouillees, ignorees };
}

/** Brouillons seulement : un brouillon est modifié, une validée donne contre-passation et nouvelle écriture. */
export function appliquer(apercu: ApercuReclassement, confirmation: Confirmation): ResultatReclassement {
  if (confirmation.nombre !== apercu.nombre) throw new ErreurReclassement('confirmation_differente');
  if (apercu.nombre === 0) throw new ErreurReclassement('rien_a_appliquer');
  const motif = confirmation.motif.trim();
  if (motif === '') throw new ErreurReclassement('motif_obligatoire');
  if (!estDateValide(confirmation.date)) throw new ErreurReclassement('date_invalide');
  const brouillons: Ecriture[] = [];
  const marquees: Ecriture[] = [];
  for (const el of apercu.elements) {
    if (el.statut === 'brouillon') {
      brouillons.push({ ...el.ecriture, lignes: el.apres.map((l) => ({ ...l })) });
      continue;
    }
    const r = corriger(el.ecriture, {
      idContrePassation: el.ecritureId + '-cp',
      idCorrection: el.ecritureId + '-rc',
      date: confirmation.date,
      motif,
      lignes: el.apres,
    });
    brouillons.push(r.contrePassation, r.correction);
    marquees.push(r.marqueOriginale);
  }
  return { brouillons, marquees };
}
