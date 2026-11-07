// Reprise de dossier : seuil de signification et statuts des constats (V3-REP-024, V3-REP-026, V3-REP-028).
// Aucune valeur légale ici : plancher et pourcentage sont des paramètres datés fournis par l'appelant.
import { pourcentage, type Arrondi, type Centimes } from '../argent/index.js';
import { ErreurChat, type GraviteConstat, type StatutConstat } from '../chat/types.js';

const PERMISSION_LEVER_BLOQUANT = 'compta-lever-bloquant';
const BASE_POINTS_DE_BASE = 10_000;
const TRANSITIONS: Readonly<Record<StatutConstat, readonly StatutConstat[]>> = {
  ouvert: ['explique', 'corrige', 'accepte'],
  explique: ['corrige', 'accepte'],
  corrige: [],
  accepte: [],
};

export interface ParametresSeuil {
  readonly totalBilan: Centimes;
  readonly chiffreAffaires: Centimes;
  readonly plancher: Centimes;
  readonly pointsDeBase: number;
  readonly arrondi: Arrondi;
}

const montantValide = (m: number): boolean => Number.isSafeInteger(m) && m >= 0;

/** Plus grand entre le plancher et le pourcentage du plus grand de (total du bilan, chiffre d'affaires). */
export function seuilSignification(p: ParametresSeuil): Centimes {
  const pdb = p.pointsDeBase;
  if (!montantValide(p.totalBilan) || !montantValide(p.chiffreAffaires) || !montantValide(p.plancher)
    || !Number.isInteger(pdb) || pdb < 0 || pdb > BASE_POINTS_DE_BASE) {
    throw new ErreurChat('parametre_invalide');
  }
  const base = Math.max(p.totalBilan, p.chiffreAffaires) as Centimes;
  const proportion = pourcentage(base, pdb, p.arrondi);
  return Math.max(p.plancher, proportion) as Centimes;
}

export function changerStatut(
  constat: { readonly gravite: GraviteConstat; readonly statut: StatutConstat },
  nouveau: StatutConstat,
  permissions: readonly string[],
): StatutConstat {
  if (!(constat.statut in TRANSITIONS) || !TRANSITIONS[constat.statut].includes(nouveau)) {
    throw new ErreurChat('parametre_invalide');
  }
  if (nouveau === 'accepte' && constat.gravite === 'critique' && !permissions.includes(PERMISSION_LEVER_BLOQUANT)) {
    throw new ErreurChat('droit_insuffisant');
  }
  return nouveau;
}
