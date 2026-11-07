// Convocation d'une assemblée : date limite, rappel avancé au jour ouvré, cartes (V3-JUR-003).
// Aucune valeur légale ici : délais, formes et décompte arrivent dans la règle datée ; le calendrier est injecté.

export type CodeConvocation =
  | 'regle_invalide'
  | 'decompte_non_traite'
  | 'regle_ambigue'
  | 'forme_inconnue'
  | 'delai_invalide'
  | 'date_invalide'
  | 'calendrier_sans_jour_ouvre';

export class ErreurConvocation extends Error {
  override name = 'ErreurConvocation';
  readonly code: CodeConvocation;
  constructor(code: CodeConvocation, message: string) {
    super(message);
    this.code = code;
  }
}

export interface Calendrier {
  ajouterJours(date: string, n: number): string;
  estOuvre(date: string): boolean;
}

export interface RegleConvocation {
  formesDelaiLegal: readonly string[];
  formesDelaiStatuts: readonly string[];
  formesAssocieUnique: readonly string[];
  delaiLegalJours: number;
  decompte: string;
  joursAvantRappel: number;
  maxRecul: number;
}

export interface EntreeConvocation {
  forme: string;
  dateAssemblee: string;
  delaiStatutsJours: number | null;
  dateEnvoiReelle: string | null;
  aujourdhui: string;
}

export type CarteConvocation = 'saisir_delai_statuts' | 'convocation_tardive' | 'assemblee_trop_proche';

export type ResultatConvocation =
  | { applicable: false }
  | {
      applicable: true;
      dateLimite: string | null;
      rappel: string | null;
      cartes: readonly CarteConvocation[];
      premiereDatePossible: string | null;
    };

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;
const entierPositifOuNul = (v: number): boolean => Number.isSafeInteger(v) && v >= 0;

function verifierDate(date: string, cal?: Calendrier): void {
  // Aller-retour par le calendrier : une date impossible (30 février) ressort changée.
  if (!DATE_ISO.test(date) || (cal !== undefined && cal.ajouterJours(date, 0) !== date)) {
    throw new ErreurConvocation('date_invalide', 'Date mal formée');
  }
}

function verifierRegle(regle: RegleConvocation): void {
  if (regle.decompte !== 'calendaires') {
    throw new ErreurConvocation('decompte_non_traite', 'Seul le décompte en jours calendaires est traité');
  }
  if (![regle.delaiLegalJours, regle.joursAvantRappel, regle.maxRecul].every(entierPositifOuNul)) {
    throw new ErreurConvocation('regle_invalide', 'Les nombres de jours doivent être des entiers positifs ou nuls');
  }
}

/** Date limite d'envoi, rappel avancé au jour ouvré précédent et cartes à afficher. */
export function convocation(entree: EntreeConvocation, regle: RegleConvocation, cal: Calendrier): ResultatConvocation {
  verifierRegle(regle);
  const { forme, dateAssemblee, dateEnvoiReelle, aujourdhui } = entree;
  verifierDate(dateAssemblee, cal);
  verifierDate(aujourdhui);
  if (dateEnvoiReelle !== null) verifierDate(dateEnvoiReelle);
  const dansListes = [regle.formesDelaiLegal, regle.formesDelaiStatuts, regle.formesAssocieUnique].map((l) => l.includes(forme));
  if (dansListes.filter(Boolean).length > 1) {
    throw new ErreurConvocation('regle_ambigue', 'La forme figure dans plusieurs listes');
  }
  if (!dansListes.includes(true)) {
    throw new ErreurConvocation('forme_inconnue', 'Forme absente de la règle');
  }
  if (dansListes[2]) return { applicable: false };
  const delai = dansListes[0] ? regle.delaiLegalJours : entree.delaiStatutsJours;
  if (delai === null) {
    return { applicable: true, dateLimite: null, rappel: null, cartes: ['saisir_delai_statuts'], premiereDatePossible: null };
  }
  if (!entierPositifOuNul(delai)) {
    throw new ErreurConvocation('delai_invalide', 'Le délai doit être un entier positif ou nul');
  }
  const dateLimite = cal.ajouterJours(dateAssemblee, 0 - delai);
  let rappel = cal.ajouterJours(dateLimite, 0 - regle.joursAvantRappel);
  for (let recul = 0; !cal.estOuvre(rappel); recul++) {
    if (recul >= regle.maxRecul) {
      throw new ErreurConvocation('calendrier_sans_jour_ouvre', 'Aucun jour ouvré trouvé en reculant');
    }
    rappel = cal.ajouterJours(rappel, 0 - 1);
  }
  const cartes: CarteConvocation[] = [];
  const tropProche = aujourdhui > dateLimite;
  if (dateEnvoiReelle !== null && dateEnvoiReelle > dateLimite) cartes.push('convocation_tardive');
  if (tropProche) cartes.push('assemblee_trop_proche');
  return {
    applicable: true,
    dateLimite,
    rappel,
    cartes,
    premiereDatePossible: tropProche ? cal.ajouterJours(aujourdhui, delai) : null,
  };
}

/** Garde l'ancienne date pour le journal ; la nouvelle date entraîne un recalcul complet par l'appelant. */
export function deplacerAssemblee(ancienne: string, nouvelle: string): { ancienneDate: string; nouvelleDate: string } {
  verifierDate(ancienne);
  verifierDate(nouvelle);
  return { ancienneDate: ancienne, nouvelleDate: nouvelle };
}
