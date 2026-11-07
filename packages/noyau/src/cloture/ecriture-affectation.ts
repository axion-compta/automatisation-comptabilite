// Écriture d'affectation du résultat : brouillon proposé, seulement après la décision d'approbation.
import { centimes, soustraire, type Centimes } from '../argent/index.js';
import type { Ecriture, LigneEcriture } from '../ecritures/modele.js';

export type CodeErreurAffectation =
  | 'decision_approbation_absente'
  | 'affectation_incoherente'
  | 'dividende_sur_perte'
  | 'resultat_nul';

export class ErreurAffectation extends Error {
  override name = 'ErreurAffectation';
  readonly code: CodeErreurAffectation;
  constructor(code: CodeErreurAffectation) {
    super(code);
    this.code = code;
  }
}

export interface AffectationVoulue {
  resultat: Centimes;
  apurementPertes: Centimes;
  reserve: Centimes;
  dividende: Centimes;
}

export interface ComptesAffectation {
  resultatBenefice: string;
  resultatPerte: string;
  reportDebiteur: string;
  reserveLegale: string;
  dividendesAPayer: string;
  reportCrediteur: string;
}

export interface ContexteAffectation {
  id: string;
  date: string;
  journal: string;
  decisionApprobation?: { date: string };
}

const ZERO = centimes(0);

function ligne(compte: string, libelle: string, debit: Centimes, credit: Centimes): LigneEcriture {
  return { compte, libelle, debit, credit };
}

export function ecritureAffectation(
  affectation: AffectationVoulue,
  comptes: ComptesAffectation,
  ctx: ContexteAffectation,
): Ecriture {
  if (!ctx.decisionApprobation) throw new ErreurAffectation('decision_approbation_absente');
  const { resultat, apurementPertes, reserve, dividende } = affectation;
  if (![resultat, apurementPertes, reserve, dividende].every(Number.isSafeInteger)) {
    throw new ErreurAffectation('affectation_incoherente');
  }
  if (resultat === 0) throw new ErreurAffectation('resultat_nul');
  let lignes: LigneEcriture[];
  if (resultat < 0) {
    if (dividende !== 0) throw new ErreurAffectation('dividende_sur_perte');
    if (apurementPertes !== 0 || reserve !== 0) throw new ErreurAffectation('affectation_incoherente');
    const perte = soustraire(ZERO, resultat);
    lignes = [
      ligne(comptes.reportDebiteur, 'Perte reportée', perte, ZERO),
      ligne(comptes.resultatPerte, 'Affectation de la perte', ZERO, perte),
    ];
  } else {
    const report = soustraire(soustraire(soustraire(resultat, apurementPertes), reserve), dividende);
    if (report < 0 || apurementPertes < 0 || reserve < 0 || dividende < 0) {
      throw new ErreurAffectation('affectation_incoherente');
    }
    lignes = [
      ligne(comptes.resultatBenefice, 'Affectation du bénéfice', resultat, ZERO),
      ligne(comptes.reportDebiteur, 'Apurement des pertes antérieures', ZERO, apurementPertes),
      ligne(comptes.reserveLegale, 'Dotation à la réserve légale', ZERO, reserve),
      ligne(comptes.dividendesAPayer, 'Dividendes à payer', ZERO, dividende),
      ligne(comptes.reportCrediteur, 'Report à nouveau créditeur', ZERO, report),
    ].filter((l) => l.debit !== 0 || l.credit !== 0);
  }
  return { id: ctx.id, journal: ctx.journal, date: ctx.date, statut: 'brouillon', lignes };
}
