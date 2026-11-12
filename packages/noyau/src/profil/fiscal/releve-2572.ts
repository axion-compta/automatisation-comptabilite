// Relevé de solde de l'IS (2572) : solde à payer ou excédent, chaque ligne avec son origine. Résultat à vérifier.
import { soustraire, type Centimes } from '../../argent/index.js';
import { ErreurProfil } from '../types.js';

export type EntreeReleve2572 = { isDu: Centimes; acomptesVerses: Centimes; creditsImputes: Centimes };
export type CaseReleve = { code: string; libelle: string; montantCentimes: Centimes; origine: string };
export type Releve2572 = {
  statut: 'a_verifier';
  soldeAPayerCentimes: Centimes;
  excedentCentimes: Centimes;
  cases: CaseReleve[];
};

const positifOuNul = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;

export function preparerReleve2572(e: Readonly<EntreeReleve2572>): Releve2572 {
  if (!positifOuNul(e.isDu) || !positifOuNul(e.acomptesVerses) || !positifOuNul(e.creditsImputes)) {
    throw new ErreurProfil('entree_invalide');
  }
  const zero = soustraire(e.isDu, e.isDu);
  const solde = soustraire(soustraire(e.isDu, e.acomptesVerses), e.creditsImputes);
  const aPayer = solde > 0 ? solde : zero;
  const excedent = solde < 0 ? soustraire(zero, solde) : zero;
  const cases: CaseReleve[] = [
    { code: 'is_du', libelle: 'Impôt dû', montantCentimes: e.isDu, origine: 'is_par_periodes' },
    { code: 'acomptes_verses', libelle: 'Acomptes versés', montantCentimes: e.acomptesVerses, origine: 'acomptes_verses' },
    { code: 'credits_imputes', libelle: 'Crédits d’impôt imputés', montantCentimes: e.creditsImputes, origine: 'credits_imputes' },
    solde < 0
      ? { code: 'excedent', libelle: 'Excédent à restituer', montantCentimes: excedent, origine: 'calcul_releve' }
      : { code: 'solde_a_payer', libelle: 'Solde à payer', montantCentimes: aPayer, origine: 'calcul_releve' },
  ];
  return { statut: 'a_verifier', soldeAPayerCentimes: aPayer, excedentCentimes: excedent, cases };
}
