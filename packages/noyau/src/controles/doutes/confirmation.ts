// Règle C5 : confirmation renforcée au-delà de seuils réglables (nombre d'objets, montant).
import { ajouter, centimes, type Centimes } from '../../argent/index.js';

export type CodeErreurConfirmation = 'montant_invalide' | 'seuil_invalide';

export class ErreurConfirmation extends Error {
  override name = 'ErreurConfirmation';
  readonly code: CodeErreurConfirmation;
  constructor(code: CodeErreurConfirmation, message: string) {
    super(message);
    this.code = code;
  }
}

export interface Recapitulatif {
  nombre: number;
  total: Centimes;
  comptes: string[];
}

export interface SeuilsConfirmation {
  objets: number;
  montant: Centimes;
}

export type NiveauConfirmation = 'simple' | 'renforcee';

function entierPositifOuNul(v: number): boolean {
  return Number.isSafeInteger(v) && v >= 0;
}

export function recapitulatif(objets: readonly { montant: Centimes; compte: string }[]): Recapitulatif {
  let total = centimes(0);
  for (const o of objets) {
    if (!Number.isSafeInteger(o.montant)) {
      throw new ErreurConfirmation('montant_invalide', 'Un montant doit être un entier de centimes.');
    }
    total = ajouter(total, o.montant);
  }
  const comptes = [...new Set(objets.map((o) => o.compte))].sort();
  return { nombre: objets.length, total, comptes };
}

export function niveauConfirmation(recap: Recapitulatif, seuils: SeuilsConfirmation): NiveauConfirmation {
  if (!entierPositifOuNul(seuils.objets) || !entierPositifOuNul(seuils.montant)) {
    throw new ErreurConfirmation('seuil_invalide', 'Un seuil doit être un entier positif ou nul.');
  }
  const ecart = recap.total < 0 ? -recap.total : recap.total;
  return recap.nombre > seuils.objets || ecart > seuils.montant ? 'renforcee' : 'simple';
}

function identiques(a: Recapitulatif, b: Recapitulatif): boolean {
  return (
    a.nombre === b.nombre &&
    a.total === b.total &&
    a.comptes.length === b.comptes.length &&
    a.comptes.every((c, i) => c === b.comptes[i])
  );
}

export function peutAppliquer(
  niveau: NiveauConfirmation,
  confirmation: { renforceeCochee: boolean; recapitulatifVu?: Recapitulatif },
  recap: Recapitulatif,
): boolean {
  if (niveau === 'simple') return true;
  const vu = confirmation.recapitulatifVu;
  return confirmation.renforceeCochee && vu !== undefined && identiques(vu, recap);
}
