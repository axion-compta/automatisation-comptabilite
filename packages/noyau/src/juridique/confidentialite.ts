// Option de confidentialité des comptes : proposée aux seules sociétés éligibles, jamais cochée (V3-JUR-009).
// Aucune forme ni seuil ici : tout arrive dans les conditions datées. Le logiciel ne dépose rien.

export type CodeConfidentialite =
  | 'conditions_invalides'
  | 'donnee_invalide'
  | 'option_non_proposee'
  | 'choix_invalide'
  | 'auteur_absent'
  | 'date_invalide';

export class ErreurConfidentialite extends Error {
  override name = 'ErreurConfidentialite';
  readonly code: CodeConfidentialite;
  constructor(code: CodeConfidentialite, message: string) {
    super(message);
    this.code = code;
  }
}

export interface ConditionsConfidentialite {
  formesAdmises: readonly string[];
  seuils: { bilanCentimes: number; chiffreAffairesCentimes: number; effectif: number };
  maxSeuilsDepasses: number;
}

export interface EntreeConfidentialite {
  forme: string;
  bilanCentimes: number | null;
  chiffreAffairesCentimes: number | null;
  effectif: number | null;
  depotPropose: boolean;
}

export type OptionConfidentialite =
  | { proposee: false; carte: 'completer_bilan_effectif' | null }
  | { proposee: true; choix: 'non_choisi' };

const entierPositifOuNul = (v: number): boolean => Number.isSafeInteger(v) && v >= 0;

/** Proposition de l'option à la date de clôture. Jamais cochée : le choix revient au dirigeant. */
export function optionConfidentialite(entree: EntreeConfidentialite, conditions: ConditionsConfidentialite): OptionConfidentialite {
  const limites = [conditions.seuils.bilanCentimes, conditions.seuils.chiffreAffairesCentimes, conditions.seuils.effectif];
  if (!limites.every(entierPositifOuNul) || !entierPositifOuNul(conditions.maxSeuilsDepasses) || conditions.maxSeuilsDepasses > limites.length) {
    throw new ErreurConfidentialite('conditions_invalides', 'Seuils ou nombre de dépassements admis invalides');
  }
  const valeurs = [entree.bilanCentimes, entree.chiffreAffairesCentimes, entree.effectif];
  if (valeurs.some((v) => v !== null && !entierPositifOuNul(v))) {
    throw new ErreurConfidentialite('donnee_invalide', 'Donnée de taille invalide');
  }
  if (!conditions.formesAdmises.includes(entree.forme) || !entree.depotPropose) {
    return { proposee: false, carte: null };
  }
  if (valeurs.some((v) => v === null)) {
    return { proposee: false, carte: 'completer_bilan_effectif' };
  }
  const depasses = valeurs.filter((v, i) => (v as number) > (limites[i] as number)).length;
  return depasses > conditions.maxSeuilsDepasses ? { proposee: false, carte: null } : { proposee: true, choix: 'non_choisi' };
}

/** Enregistre le choix nominatif et daté du dirigeant ; aucune mutation de l'option. */
export function choisir(
  option: OptionConfidentialite,
  saisie: { choix: 'demandee' | 'refusee'; par: string; le: string },
): { choix: 'demandee' | 'refusee'; choisiPar: string; choisiLe: string } {
  if (!option.proposee) {
    throw new ErreurConfidentialite('option_non_proposee', "L'option n'est pas proposée");
  }
  if (saisie.choix !== 'demandee' && saisie.choix !== 'refusee') {
    throw new ErreurConfidentialite('choix_invalide', 'Choix inconnu');
  }
  if (saisie.par.trim() === '') {
    throw new ErreurConfidentialite('auteur_absent', "L'auteur du choix est absent");
  }
  const jour = new Date(`${saisie.le}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(saisie.le) || Number.isNaN(jour.getTime()) || jour.toISOString().slice(0, 10) !== saisie.le) {
    throw new ErreurConfidentialite('date_invalide', 'Date mal formée');
  }
  return { choix: saisie.choix, choisiPar: saisie.par, choisiLe: saisie.le };
}
