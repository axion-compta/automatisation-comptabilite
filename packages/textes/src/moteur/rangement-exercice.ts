// Question posée quand une pièce n'est pas datée de l'année comptable en cours. Vouvoiement.
import { formaterDate } from './messages.js';

export type MotifQuestion = 'exercice_precedent' | 'a_cheval';

/** Les dates sont au format AAAA-MM-JJ ; l'année comptable est toujours citée avec ses dates. */
export function questionRangementTexte(motif: MotifQuestion, debut: string, fin: string): string {
  const annee = 'l’année comptable du ' + formaterDate(debut) + ' au ' + formaterDate(fin);
  if (motif === 'a_cheval') return 'Cette pièce couvre deux années comptables. La ranger dans ' + annee + ' ?';
  return 'Cette pièce est datée d’une année comptable passée. La ranger dans ' + annee + ' ?';
}
