import { ReponseCompteurs } from '../../../../packages/contrat/src/domaines/alertes.js';
import { ReponseExercices } from '../../../../packages/contrat/src/domaines/plan.js';
import { socle } from '../../../../packages/textes/src/ecrans/socle.js';
import { INTERVALLE_TABLEAU_DE_BORD_MS, useLectureInterrogee } from '../donnees/interrogation.js';
import { useLecture } from '../donnees/lecture.js';

export type CompteurEntree = { ouvertes: number; urgentes: number; pointExclamation: boolean };
const INTERVALLE = { intervalleMs: INTERVALLE_TABLEAU_DE_BORD_MS };
const avec = (modele: string, n: number): string => modele.replace('{n}', String(n));

/** Texte complet lu par les lecteurs d'écran, par exemple « 3 alertes, dont une urgente ». */
export function libelleCompteur(c: CompteurEntree): string {
  const base = c.ouvertes === 1 ? socle.compteur.une : avec(socle.compteur.plusieurs, c.ouvertes);
  if (c.urgentes === 1) return base + socle.compteur.uneUrgente;
  if (c.urgentes > 1) return base + avec(socle.compteur.plusieursUrgentes, c.urgentes);
  return c.pointExclamation ? base + socle.compteur.prioritaire : base;
}

/** Exercice ouvert le plus récent et compteurs par entrée du menu ; compteurs vides en cas de panne : la coque reste intacte. */
export function useCompteursMenu(): { exercice: string | undefined; parEntree: Record<string, CompteurEntree> } {
  const exercices = useLecture('/exercices', ReponseExercices);
  const ouvert = exercices.donnees?.body.filter((e) => e.statut === 'ouvert').sort((a, b) => (a.fin < b.fin ? 1 : -1))[0];
  const chemin = '/exercices/' + encodeURIComponent(ouvert?.id ?? '_') + '/compteurs';
  const compteurs = useLectureInterrogee(chemin, ReponseCompteurs, INTERVALLE);
  const parEntree = ouvert && compteurs.etat !== 'erreur' ? (compteurs.donnees?.body.parEntree ?? {}) : {};
  return { exercice: ouvert?.id, parEntree };
}

/** Pastille du nombre d'alertes ouvertes et « ! » ; rien d'affiché à zéro. */
export function Compteur({ compteur }: { compteur: CompteurEntree | undefined }) {
  if (!compteur || (compteur.ouvertes === 0 && !compteur.pointExclamation)) return null;
  return (
    <span className="compteur" role="img" aria-label={libelleCompteur(compteur)}>
      <span className="compteur__nombre" aria-hidden="true">{compteur.ouvertes}</span>
      {compteur.pointExclamation ? <span className="compteur__alerte" aria-hidden="true">!</span> : null}
    </span>
  );
}
