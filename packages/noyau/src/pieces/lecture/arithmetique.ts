// Contrôles arithmétiques d'une pièce lue : le code calcule, l'IA lit. Tolérances et taux viennent des arguments.
import { ajouter, centimes, pourcentage, soustraire, type Centimes } from '../../argent/index.js';
import { ErreurPiece, type MotifAVerifier } from '../types.js';

export interface ReglageArithmetique { toleranceParTaux: number; tolerancePieceMax: number; toleranceParLigne: number; toleranceLignesMax: number; tauxConnusPdb: number[]; montantMaxSociete?: Centimes; }
export type QualificationMontantDu = 'acompte_deduit' | 'avoir_deduit' | 'deja_paye';
export interface EntreeArithmetique {
  parTaux: { tauxPdb: number; ht: Centimes; tva: Centimes }[];
  ttc: Centimes;
  montantDu?: Centimes;
  qualificationMontantDu?: QualificationMontantDu;
  lignes?: { tauxPdb: number; ht: Centimes }[];
}
type RegleArith = 1 | 2 | 3;
const REGLE_PIECE: RegleArith = 2;
const REGLE_LIGNES: RegleArith = 3;
export interface EcartArithmetique { regle: RegleArith; tauxPdb?: number; ecart: Centimes; }
export interface ResultatArithmetique { motifs: MotifAVerifier[]; ecarts: EcartArithmetique[]; }

const entierPositif = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
const entier = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);

function verifierReglage(r: ReglageArithmetique): void {
  const ok = entierPositif(r.toleranceParTaux) && entierPositif(r.tolerancePieceMax) && entierPositif(r.toleranceParLigne) && entierPositif(r.toleranceLignesMax)
    && Array.isArray(r.tauxConnusPdb) && r.tauxConnusPdb.every(entierPositif) && (r.montantMaxSociete === undefined || entierPositif(r.montantMaxSociete));
  if (!ok) throw new ErreurPiece('reglage_invalide', 'Le réglage doit contenir des entiers positifs ou nuls.');
}

function verifierEntree(e: EntreeArithmetique): void {
  const montants = [e.ttc, ...e.parTaux.flatMap((l) => [l.ht, l.tva, l.tauxPdb]), ...(e.lignes ?? []).flatMap((l) => [l.ht, l.tauxPdb])];
  if (e.montantDu !== undefined) montants.push(e.montantDu);
  if (!montants.every(entier)) throw new ErreurPiece('montant_invalide', 'Montants et taux doivent être des entiers.');
}

const absolu = (v: Centimes): Centimes => centimes(v < 0 ? -v : v);
const somme = (valeurs: Centimes[]): Centimes => valeurs.reduce((s, v) => ajouter(s, v), centimes(0));

export function controlerArithmetique(entree: EntreeArithmetique, reglage: ReglageArithmetique): ResultatArithmetique {
  verifierReglage(reglage);
  verifierEntree(entree);
  const motifs = new Set<MotifAVerifier>();
  const ecarts: EcartArithmetique[] = [];
  const { parTaux, ttc } = entree;
  const signaler = (regle: RegleArith, ecart: Centimes, tolerance: number, tauxPdb?: number): void => {
    if (ecart <= tolerance) return;
    motifs.add('ecart_arithmetique');
    ecarts.push(tauxPdb === undefined ? { regle, ecart } : { regle, tauxPdb, ecart });
  };

  for (const l of parTaux) {
    const brut = pourcentage(absolu(l.ht), l.tauxPdb, 'demi-superieur');
    signaler(1, absolu(soustraire(l.ht < 0 ? centimes(-brut) : brut, l.tva)), reglage.toleranceParTaux, l.tauxPdb);
    if (!reglage.tauxConnusPdb.includes(l.tauxPdb)) motifs.add('taux_inconnu');
  }
  if (parTaux.length === 0) {
    if (ttc !== 0) motifs.add('aucun_montant');
  } else {
    const tolerance = Math.min(reglage.toleranceParTaux * parTaux.length, reglage.tolerancePieceMax);
    signaler(REGLE_PIECE, absolu(soustraire(ajouter(somme(parTaux.map((l) => l.ht)), somme(parTaux.map((l) => l.tva))), ttc)), tolerance);
  }
  if (ttc === 0 && parTaux.some((l) => l.ht !== 0)) motifs.add('ttc_nul_ht_non_nul');

  const lignes = entree.lignes ?? [];
  for (const taux of [...new Set(lignes.map((l) => l.tauxPdb))].sort((a, b) => a - b)) {
    const duTaux = lignes.filter((l) => l.tauxPdb === taux);
    const tolerance = Math.min(reglage.toleranceParLigne * duTaux.length, reglage.toleranceLignesMax);
    const attendu = somme(parTaux.filter((l) => l.tauxPdb === taux).map((l) => l.ht));
    signaler(REGLE_LIGNES, absolu(soustraire(somme(duTaux.map((l) => l.ht)), attendu)), tolerance, taux);
  }

  if (entree.montantDu !== undefined && entree.montantDu !== ttc && entree.qualificationMontantDu === undefined) motifs.add('montant_du_non_qualifie');
  if (reglage.montantMaxSociete !== undefined && absolu(ttc) > reglage.montantMaxSociete) motifs.add('montant_hors_bornes');
  return { motifs: [...motifs].sort(), ecarts };
}
