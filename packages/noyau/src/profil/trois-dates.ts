import { estDateIso, exigerDate } from './types.js';

export type DatesSociete = {
  depotCapital: string | null;
  immatriculation: string | null;
  debutActivite: string | null;
  exerciceDebut: string;
  exerciceFin: string;
};
export type PeriodePiece = 'avant_depot' | 'avant_immatriculation' | 'exercice' | 'apres_exercice' | 'avant_exercice';
export type TraitementPiece = {
  reprise: 'oui' | 'non' | 'a_verifier';
  chargePermise: boolean;
  tvaDeductiblePermise: boolean;
  carte?: 'reprise_a_verifier';
};

export function verifierDates(d: DatesSociete): { valide: boolean; motifs: string[] } {
  const toutes = [d.depotCapital, d.immatriculation, d.debutActivite, d.exerciceDebut, d.exerciceFin];
  if (toutes.some((x) => x !== null && !estDateIso(x))) return { valide: false, motifs: ['date_invalide'] };
  const motifs: string[] = [];
  if (d.exerciceFin < d.exerciceDebut) motifs.push('ordre_inverse');
  if (d.immatriculation !== null && d.depotCapital !== null && d.immatriculation < d.depotCapital) motifs.push('immatriculation_avant_depot');
  return { valide: motifs.length === 0, motifs };
}

export function enFormation(d: DatesSociete): boolean {
  return d.immatriculation === null;
}

export function periodeDePiece(d: DatesSociete, datePiece: string): PeriodePiece {
  exigerDate(datePiece, 'datePiece');
  if (d.depotCapital !== null && datePiece < exigerDate(d.depotCapital, 'depotCapital')) return 'avant_depot';
  if (d.immatriculation === null || datePiece < exigerDate(d.immatriculation, 'immatriculation')) return 'avant_immatriculation';
  if (datePiece < exigerDate(d.exerciceDebut, 'exerciceDebut')) return 'avant_exercice';
  return datePiece > exigerDate(d.exerciceFin, 'exerciceFin') ? 'apres_exercice' : 'exercice';
}

export function traitementPieceAvantImmatriculation(e: { dansEtatDesActes: boolean | null; decisionDeReprise: boolean | null }): TraitementPiece {
  if (e.dansEtatDesActes === true || e.decisionDeReprise === true) return { reprise: 'oui', chargePermise: true, tvaDeductiblePermise: true };
  const connu = e.dansEtatDesActes === false && e.decisionDeReprise === false;
  return { reprise: connu ? 'non' : 'a_verifier', chargePermise: false, tvaDeductiblePermise: false, carte: 'reprise_a_verifier' };
}

export function choixFraisDeConstitution(): { options: ['charge', 'immobilisation']; tranche: false } {
  return { options: ['charge', 'immobilisation'], tranche: false };
}
