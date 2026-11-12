// Bloc « TVA et impôts » : estimation (même fonction que la route /tva/estimation), prochaine échéance, position face à la franchise.
// Aucun seuil ici : les seuils datés arrivent par `seuilsAu`. Une pièce en doute donne un bloc sans aucun montant.
import { calendrier, type EntreeEcheance, type FiltreCalendrier, type LigneEcheance } from '../alertes/calendrier.js';
import type { Centimes } from '../argent/index.js';
import { positionFranchise, type ObjetFranchise, type PositionFranchise } from '../controles/regles/franchise-seuils.js';
import type { Periode } from '../interface/types.js';
import { blocTva, type EnveloppeBloc } from './blocs.js';

export type EstimationLue =
  | { exerciceId: string; etat: 'calculee'; collecteeCentimes: number; deductibleCentimes: number }
  | { exerciceId: string; etat: 'non_calculee'; motif: string; piecesARegarder?: number };
export type SeuilsFranchise = Pick<ObjetFranchise, 'seuilVentes' | 'seuilServices' | 'majoreVentes' | 'majoreServices'>;
export interface DonneesBlocTva {
  estimation: EstimationLue;
  prochaineEcheance: LigneEcheance | null;
  franchise: PositionFranchise | null;
}

export function blocTvaImpots(o: {
  periode: Periode;
  exerciceId: string;
  piecesEnDoute: number;
  estimer: (exerciceId: string) => EstimationLue | undefined;
  echeances: { entrees: readonly EntreeEcheance[]; filtre: FiltreCalendrier };
  franchise?: { caVentes: Centimes; caServices: Centimes; alertePdb: number; seuilsAu: (date: string) => SeuilsFranchise };
}): EnveloppeBloc<DonneesBlocTva | { piecesEnDoute: number }> {
  return blocTva<DonneesBlocTva>(o.periode, o.piecesEnDoute, () => {
    const estimation = o.estimer(o.exerciceId);
    if (estimation === undefined) return undefined;
    const prochaineEcheance = calendrier(o.echeances.entrees, o.echeances.filtre).find((l) => l.statut === 'a_venir') ?? null;
    const f = o.franchise;
    const franchise = f === undefined ? null : positionFranchise({ ...f.seuilsAu(o.periode.fin), caVentes: f.caVentes, caServices: f.caServices, alertePdb: f.alertePdb });
    return { estimation, prochaineEcheance, franchise };
  });
}
