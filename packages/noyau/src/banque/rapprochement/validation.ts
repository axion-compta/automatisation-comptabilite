// Validation en lot de liens de rapprochement : geste distinct, nombre annoncé avant, journal par lien. Tout ou rien.
import type { Centimes } from '../../argent/index.js';
import type { EtatRapprochement, Lien } from '../types.js';

export type CodeValidation =
  | 'lien_non_validable' | 'rien_a_valider' | 'ia_interdite' | 'systeme_interdit' | 'hors_limites' | 'confirmation_differente';

export class ErreurValidation extends Error {
  override name = 'ErreurValidation';
  constructor(readonly code: CodeValidation, readonly id?: string) {
    super(id === undefined ? code : `${code}: ${id}`);
  }
}

export type FiltreValidation = { ids: readonly string[] } | { surs: true };
export type Preparation = { nbObjetsTouches: number; ids: string[] };
export type Acteur = { type: 'personne' | 'ia' | 'systeme'; id: string };
export type ContexteValidation = {
  mode: 'assiste' | 'autonome'; limites?: { montantMaxParLien: Centimes }; horodatage: string; confirmationNb: number;
};
export type LienValide = Lien & { validePar: string; valideLe: string };
export type EntreeJournal = {
  objetType: 'lien'; objetId: string; action: 'valider'; avant: Lien; apres: LienValide;
  acteurType: Acteur['type']; acteurId: string; horodatage: string;
};

export function preparerValidation(
  liens: readonly Lien[], etats: Readonly<Record<string, EtatRapprochement>>, filtre: FiltreValidation,
): Preparation {
  let ids: string[];
  if ('surs' in filtre) {
    ids = liens.filter((l) => l.etat === 'propose' && etats[l.ligneId] === 'RAPPROCHEE').map((l) => l.id);
  } else {
    ids = [...new Set(filtre.ids)];
    for (const id of ids) {
      if (liens.find((l) => l.id === id)?.etat !== 'propose') throw new ErreurValidation('lien_non_validable', id);
    }
  }
  if (ids.length === 0) throw new ErreurValidation('rien_a_valider');
  return { nbObjetsTouches: ids.length, ids };
}

export function validerLot(
  liens: readonly Lien[], ids: readonly string[], acteur: Acteur, contexte: ContexteValidation,
): { liens: LienValide[]; journal: EntreeJournal[] } {
  if (acteur.type === 'systeme') throw new ErreurValidation('systeme_interdit');
  if (acteur.type === 'ia' && contexte.mode === 'assiste') throw new ErreurValidation('ia_interdite');
  const prep = preparerValidation(liens, {}, { ids });
  if (!Number.isSafeInteger(contexte.confirmationNb) || contexte.confirmationNb !== prep.nbObjetsTouches) {
    throw new ErreurValidation('confirmation_differente');
  }
  const cibles = prep.ids.map((id) => liens.find((l) => l.id === id) as Lien);
  if (acteur.type === 'ia') {
    const max = contexte.limites?.montantMaxParLien;
    if (max === undefined || !Number.isSafeInteger(max) || max < 0) throw new ErreurValidation('hors_limites');
    const trop = cibles.find((l) => !Number.isSafeInteger(l.montantAffecte) || Math.abs(l.montantAffecte) > max);
    if (trop) throw new ErreurValidation('hors_limites', trop.id);
  }
  const journal: EntreeJournal[] = [];
  const valides = cibles.map((avant) => {
    const apres: LienValide = { ...avant, etat: 'valide', version: avant.version + 1, validePar: acteur.id, valideLe: contexte.horodatage };
    journal.push({
      objetType: 'lien', objetId: avant.id, action: 'valider', avant: { ...avant }, apres,
      acteurType: acteur.type, acteurId: acteur.id, horodatage: contexte.horodatage,
    });
    return apres;
  });
  return { liens: valides, journal };
}
