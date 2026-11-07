// Correction d'une écriture validée : contre-passation puis écriture corrigée.
// Fonctions pures : l'écriture reçue n'est jamais modifiée.
import { verifierEcriture, type Ecriture, type LigneEcriture } from './modele.js';

export type CodeErreurCorrection =
  | 'motif_obligatoire'
  | 'originale_non_validee'
  | 'deja_contre_passee'
  | 'ids_non_distincts';

export class ErreurCorrection extends Error {
  override name = 'ErreurCorrection';
  readonly code: CodeErreurCorrection;
  constructor(code: CodeErreurCorrection, message: string) {
    super(message);
    this.code = code;
  }
}

export interface ParamsContrePassation {
  id: string;
  date: string;
  motif: string;
}

export interface ParamsCorrection {
  idContrePassation: string;
  idCorrection: string;
  date: string;
  motif: string;
  lignes: readonly LigneEcriture[];
}

export interface ResultatCorrection {
  contrePassation: Ecriture;
  correction: Ecriture;
  marqueOriginale: Ecriture;
}

function controler(originale: Ecriture, motif: string): void {
  if (motif.trim() === '') {
    throw new ErreurCorrection('motif_obligatoire', 'Le motif de la correction est obligatoire.');
  }
  if (originale.statut !== 'valide') {
    throw new ErreurCorrection(
      'originale_non_validee',
      'Seule une écriture validée se corrige par contre-passation.',
    );
  }
  if (originale.contrePassee === true) {
    throw new ErreurCorrection('deja_contre_passee', 'Cette écriture est déjà contre-passée.');
  }
}

/** Brouillon de correction dont chaque ligne a son débit et son crédit inversés. */
export function contrePasser(originale: Ecriture, params: ParamsContrePassation): Ecriture {
  controler(originale, params.motif);
  const contre: Ecriture = {
    id: params.id,
    journal: originale.journal,
    date: params.date,
    statut: 'brouillon',
    type: 'correction',
    lienOriginale: originale.id,
    lignes: originale.lignes.map((l) => ({ ...l, debit: l.credit, credit: l.debit })),
  };
  verifierEcriture(contre);
  return contre;
}

/** Contre-passation, écriture corrigée et copie marquée de l'originale. */
export function corriger(originale: Ecriture, params: ParamsCorrection): ResultatCorrection {
  const { idContrePassation, idCorrection } = params;
  if (
    idContrePassation === idCorrection ||
    idContrePassation === originale.id ||
    idCorrection === originale.id
  ) {
    throw new ErreurCorrection(
      'ids_non_distincts',
      "L'originale, la contre-passation et la correction ont chacune leur identifiant.",
    );
  }
  const contrePassation = contrePasser(originale, {
    id: idContrePassation,
    date: params.date,
    motif: params.motif,
  });
  const correction: Ecriture = {
    id: idCorrection,
    journal: originale.journal,
    date: params.date,
    statut: 'brouillon',
    type: 'correction',
    lienOriginale: originale.id,
    lignes: params.lignes.map((l) => ({ ...l })),
  };
  verifierEcriture(correction);
  const marqueOriginale: Ecriture = {
    ...originale,
    contrePassee: true,
    lignes: originale.lignes.map((l) => ({ ...l })),
  };
  return { contrePassation, correction, marqueOriginale };
}
