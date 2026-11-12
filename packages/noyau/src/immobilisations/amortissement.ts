// Amortissement linéaire au prorata des jours de détention. Un seul arrondi par dotation, au centime.
import { centimes, fraction, soustraire, type Centimes } from '../argent/index.js';
import { ajouterJours, ajouterMois, estDateValide } from '../dates/civiles.js';
import type { Ecriture } from '../ecritures/modele.js';
import { ErreurImmobilisation, type Bien } from './registre.js';

export interface ExerciceAmortissement {
  id: string;
  debut: string;
  fin: string;
}

/** Nombre de jours, bornes comprises (0 si fin avant début). */
function nombreDeJours(debut: string, fin: string): number {
  let n = 0;
  for (let jour = debut; jour <= fin; jour = ajouterJours(jour, 1)) n += 1;
  return n;
}

/**
 * Dotation de l'exercice : base × 12 × jours de détention ÷ (durée en mois × jours de l'exercice).
 * Dans l'exercice qui contient la fin de l'amortissement, la dotation solde la base ; jamais de cumul au-delà.
 */
export function dotationExercice(bien: Bien, exercice: ExerciceAmortissement, cumulAnterieur: Centimes = centimes(0)): Centimes {
  if (!estDateValide(exercice.debut) || !estDateValide(exercice.fin) || exercice.fin < exercice.debut) {
    throw new ErreurImmobilisation('date_invalide');
  }
  if (cumulAnterieur < 0 || cumulAnterieur > bien.base) throw new ErreurImmobilisation('cumul_invalide');
  if (!bien.amortissable) return centimes(0);
  if (!(Number.isSafeInteger(bien.dureeMois) && bien.dureeMois > 0)) throw new ErreurImmobilisation('duree_invalide');
  const reste = soustraire(bien.base, cumulAnterieur);
  if (exercice.fin < bien.miseEnService) return centimes(0);
  if (exercice.fin >= ajouterMois(bien.miseEnService, bien.dureeMois)) return reste;
  const debutDetention = exercice.debut > bien.miseEnService ? exercice.debut : bien.miseEnService;
  const prorata = fraction(
    bien.base,
    12 * nombreDeJours(debutDetention, exercice.fin),
    bien.dureeMois * nombreDeJours(exercice.debut, exercice.fin),
    'demi-superieur',
  );
  return prorata < reste ? prorata : reste;
}

/** Compte d'amortissement : 20x donne 280x, 21x donne 281x. */
function compteAmortissement(compte: string): string {
  if (!/^2[01]\d*$/.test(compte)) throw new ErreurImmobilisation('compte_non_amortissable');
  return '28' + compte.slice(1);
}

/** Écriture de dotation en brouillon, D 6811 / C 28xx, datée de la fin de l'exercice ; `null` si la dotation est nulle. */
export function ecritureDotation(bien: Bien, exercice: ExerciceAmortissement, cumulAnterieur: Centimes = centimes(0)): Ecriture | null {
  const montant = dotationExercice(bien, exercice, cumulAnterieur);
  if (montant === 0) return null;
  const libelle = `Dotation ${bien.libelle}`;
  return {
    id: `dot-${bien.id}-${exercice.id}`,
    journal: 'OD',
    date: exercice.fin,
    statut: 'brouillon',
    lignes: [
      { compte: '6811', libelle, debit: montant, credit: centimes(0) },
      { compte: compteAmortissement(bien.compte), libelle, debit: centimes(0), credit: montant },
    ],
  };
}
