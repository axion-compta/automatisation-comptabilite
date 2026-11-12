import { ReponseBareme } from '../../../../../packages/contrat/src/domaines/vehicules-bareme.js';
import { e17 } from '../../../../../packages/textes/src/ecrans/e17.js';
import { useLecture } from '../../donnees/lecture.js';

/** Bandeau « Barème à confirmer » : lit la ligne du barème à la date de fin de la période (AAAA-MM-JJ). */
export function Bandeau({ date }: { date: string }) {
  const lecture = useLecture('/parametres/bareme_ik_voiture?date=' + encodeURIComponent(date), ReponseBareme);
  if (lecture.etat === 'chargement') return null;
  if (lecture.etat === 'pret' && lecture.donnees?.body.statut === 'valide') return null;
  // Statut autre que « valide », ligne absente ou erreur : on prévient, jamais de « tout va bien » par défaut.
  return <p role="status">{e17.bareme.replace('{annee}', date.slice(0, 4))}</p>;
}
