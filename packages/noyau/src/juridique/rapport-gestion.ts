// Rapport de gestion : dispense ou brouillon simple, jamais d'hypothèse sur une donnée manquante (V3-JUR-002).
// Aucune valeur légale ici : formes, seuils, activités et mode de comparaison arrivent dans la règle datée.

export type CodeRapportGestion = 'regle_invalide' | 'donnee_invalide' | 'bilan_negatif';

export class ErreurRapportGestion extends Error {
  override name = 'ErreurRapportGestion';
  readonly code: CodeRapportGestion;
  constructor(code: CodeRapportGestion, message: string) {
    super(message);
    this.code = code;
  }
}

export interface RegleDispense {
  formesConcernees: readonly string[];
  seuils: { bilanCentimes: number; chiffreAffairesCentimes: number; effectif: number };
  maxSeuilsDepasses: number;
  depassement: 'strict' | 'large';
  activitesExclues: readonly string[];
}

export interface ProfilCloture {
  forme: string;
  bilanCentimes: number | null;
  chiffreAffairesCentimes: number | null;
  effectif: number | null;
  activite: string | null;
}

export type QuestionRapport = 'bilan' | 'chiffre_affaires' | 'effectif' | 'activite';

export type DecisionRapportGestion =
  | { statut: 'dispense' }
  | {
      statut: 'brouillon';
      motif: 'seuils_depasses' | 'activite_exclue' | 'donnee_manquante' | 'forme_non_concernee';
      questions: readonly QuestionRapport[];
    };

const entierPositifOuNul = (v: number): boolean => Number.isSafeInteger(v) && v >= 0;

function verifierRegle(regle: RegleDispense): void {
  const valeurs = Object.values(regle.seuils);
  if (!valeurs.every(entierPositifOuNul)) {
    throw new ErreurRapportGestion('regle_invalide', 'Chaque seuil doit être un entier positif ou nul');
  }
  if (!entierPositifOuNul(regle.maxSeuilsDepasses) || regle.maxSeuilsDepasses > valeurs.length) {
    throw new ErreurRapportGestion('regle_invalide', 'Le nombre de seuils dépassés admis est hors bornes');
  }
  if (regle.depassement !== 'strict' && regle.depassement !== 'large') {
    throw new ErreurRapportGestion('regle_invalide', 'Mode de dépassement inconnu');
  }
}

function verifierProfil(profil: ProfilCloture): void {
  if (profil.forme === '') {
    throw new ErreurRapportGestion('donnee_invalide', 'La forme est vide');
  }
  const { bilanCentimes: bilan, chiffreAffairesCentimes: ca, effectif } = profil;
  if (bilan !== null) {
    if (Number.isSafeInteger(bilan) && bilan < 0) {
      throw new ErreurRapportGestion('bilan_negatif', 'Le total du bilan ne peut pas être négatif');
    }
    if (!entierPositifOuNul(bilan)) {
      throw new ErreurRapportGestion('donnee_invalide', 'Total du bilan invalide');
    }
  }
  if (ca !== null && !entierPositifOuNul(ca)) {
    throw new ErreurRapportGestion('donnee_invalide', "Chiffre d'affaires invalide");
  }
  if (effectif !== null && !entierPositifOuNul(effectif)) {
    throw new ErreurRapportGestion('donnee_invalide', 'Effectif invalide');
  }
}

/** Dispense à la date de clôture, sinon brouillon avec le motif et les questions à poser. */
export function decisionRapportGestion(profil: ProfilCloture, regle: RegleDispense): DecisionRapportGestion {
  verifierRegle(regle);
  verifierProfil(profil);
  if (!regle.formesConcernees.includes(profil.forme)) {
    return { statut: 'brouillon', motif: 'forme_non_concernee', questions: [] };
  }
  if (profil.activite !== null && regle.activitesExclues.includes(profil.activite)) {
    return { statut: 'brouillon', motif: 'activite_exclue', questions: [] };
  }
  const questions: QuestionRapport[] = [];
  if (profil.bilanCentimes === null) questions.push('bilan');
  if (profil.chiffreAffairesCentimes === null) questions.push('chiffre_affaires');
  if (profil.effectif === null) questions.push('effectif');
  if (profil.activite === null) questions.push('activite');
  if (
    profil.bilanCentimes === null ||
    profil.chiffreAffairesCentimes === null ||
    profil.effectif === null ||
    profil.activite === null
  ) {
    return { statut: 'brouillon', motif: 'donnee_manquante', questions };
  }
  const depasse = (valeur: number, limite: number): boolean =>
    regle.depassement === 'strict' ? valeur > limite : valeur >= limite;
  const nombre = [
    depasse(profil.bilanCentimes, regle.seuils.bilanCentimes),
    depasse(profil.chiffreAffairesCentimes, regle.seuils.chiffreAffairesCentimes),
    depasse(profil.effectif, regle.seuils.effectif),
  ].filter(Boolean).length;
  if (nombre > regle.maxSeuilsDepasses) {
    return { statut: 'brouillon', motif: 'seuils_depasses', questions: [] };
  }
  return { statut: 'dispense' };
}
