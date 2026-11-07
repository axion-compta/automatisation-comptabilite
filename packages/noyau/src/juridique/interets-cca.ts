// Intérêts de compte courant d'associé : Σ soldes créditeurs journaliers × taux convenu ÷ jours de l'année.
// Aucun calendrier ici : l'appelant fournit les soldes et le nombre de jours. Pas de retenue ni d'écriture.
import { centimes, fraction, soustraire, type Arrondi, type Centimes } from '../argent/index.js';

export type CodeErreurInteretsCca = 'jours_invalides' | 'trop_de_jours' | 'solde_invalide' | 'parametre_invalide';

export class ErreurInteretsCca extends Error {
  override name = 'ErreurInteretsCca';
  readonly code: CodeErreurInteretsCca;
  constructor(code: CodeErreurInteretsCca, detail = '') {
    super(detail === '' ? code : `${code} : ${detail}`);
    this.code = code;
  }
}

const POINTS_DE_BASE = 10_000n;

export interface EntreeInteretsCca {
  soldesJournaliers: readonly number[];
  joursAnnee: number;
  tauxConvenuPointsDeBase: number;
  tauxMaxPointsDeBase: number | null;
  arrondi: Arrondi;
}

export interface ResultatInteretsCca {
  interets: Centimes;
  interetsAuPlafond: Centimes | null;
  reintegration: Centimes;
}

function pointsValides(valeur: number): void {
  if (!Number.isSafeInteger(valeur) || valeur < 0) throw new ErreurInteretsCca('parametre_invalide', String(valeur));
}

export function calculerInteretsCca(entree: EntreeInteretsCca): ResultatInteretsCca {
  const { soldesJournaliers, joursAnnee, tauxConvenuPointsDeBase, tauxMaxPointsDeBase, arrondi } = entree;
  if (!Number.isSafeInteger(joursAnnee) || joursAnnee <= 0) throw new ErreurInteretsCca('jours_invalides', String(joursAnnee));
  if (soldesJournaliers.length > joursAnnee) throw new ErreurInteretsCca('trop_de_jours', String(soldesJournaliers.length));
  pointsValides(tauxConvenuPointsDeBase);
  if (tauxMaxPointsDeBase !== null) pointsValides(tauxMaxPointsDeBase);
  let somme = 0n;
  for (const solde of soldesJournaliers) {
    if (!Number.isSafeInteger(solde)) throw new ErreurInteretsCca('solde_invalide', String(solde));
    if (solde > 0) somme += BigInt(solde);
  }
  const base = POINTS_DE_BASE * BigInt(joursAnnee);
  const interets = fraction(somme, tauxConvenuPointsDeBase, base, arrondi);
  if (tauxMaxPointsDeBase === null) return { interets, interetsAuPlafond: null, reintegration: centimes(0) };
  const interetsAuPlafond = fraction(somme, tauxMaxPointsDeBase, base, arrondi);
  const reintegration = tauxConvenuPointsDeBase > tauxMaxPointsDeBase ? soustraire(interets, interetsAuPlafond) : centimes(0);
  return { interets, interetsAuPlafond, reintegration };
}
