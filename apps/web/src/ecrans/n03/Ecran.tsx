import { listerExercices, type Exercice } from '../../../../../packages/contrat/src/domaines/plan.js';
import { n03 } from '../../../../../packages/textes/src/ecrans/n03.js';
import { EtatChargement, EtatErreur, EtatVide } from '../../../../../packages/ui/src/composants/Etats.js';
import { Pastille } from '../../../../../packages/ui/src/composants/Pastille.js';
import { Tableau, type ColonneTableau } from '../../../../../packages/ui/src/composants/Tableau.js';
import { formaterDateAffiche } from '../../../../../packages/ui/src/format/affichage.js';
import type { ErreurLecture, SchemaLecture } from '../../api.js';
import { useLecture } from '../../donnees/lecture.js';

type Reponse = { body: Exercice[]; decalage: number; total: number };

// Schéma de réponse de GET /exercices, pris tel quel dans le contrat (jamais redéfini ici).
const schema = listerExercices['~orpc'].outputSchema as unknown as SchemaLecture<Reponse>;

/** Message selon le code d'erreur de la lecture. */
function messageErreur(e: ErreurLecture | undefined): string {
  if (e?.code === 'acces_refuse') return n03.erreur.acces;
  if (e?.code === 'reseau') return n03.erreur.reseau;
  return n03.erreur.autre;
}

/** Date au format français ; une date illisible est affichée telle quelle plutôt que de casser l'écran. */
function dateAffichee(date: string): string {
  try {
    return formaterDateAffiche(date);
  } catch {
    return date;
  }
}

/** Du plus récent au plus ancien (début décroissant), sans modifier la liste reçue. */
function duPlusRecent(liste: readonly Exercice[]): Exercice[] {
  return [...liste].sort((a, b) => (a.debut < b.debut ? 1 : a.debut > b.debut ? -1 : 0));
}

const COLONNES: ColonneTableau<Exercice>[] = [
  { cle: 'libelle', entete: n03.colonnes.libelle, rendu: (e) => e.libelle },
  { cle: 'du', entete: n03.colonnes.du, rendu: (e) => dateAffichee(e.debut) },
  { cle: 'au', entete: n03.colonnes.au, rendu: (e) => dateAffichee(e.fin) },
  {
    cle: 'etat',
    entete: n03.colonnes.etat,
    rendu: (e) =>
      e.statut === 'ouvert' ? (
        <Pastille etat="attente" libelle={n03.etats.ouvert} />
      ) : (
        <Pastille etat="ok" libelle={n03.etats.cloture} />
      ),
  },
];

/** N03 : liste en lecture seule des années comptables. */
export function Ecran() {
  const lecture = useLecture<Reponse>('/exercices', schema);
  let contenu;
  if (lecture.etat === 'chargement') contenu = <EtatChargement libelle={n03.chargement} />;
  else if (lecture.etat === 'erreur') contenu = <EtatErreur message={messageErreur(lecture.erreur)} />;
  else if (lecture.etat === 'vide' || !lecture.donnees) contenu = <EtatVide titre={n03.vide} detail={n03.videDetail} />;
  else
    contenu = (
      <Tableau legende={n03.legende} colonnes={COLONNES} lignes={duPlusRecent(lecture.donnees.body)} cleDeLigne={(e) => e.id} />
    );
  return (
    <section>
      <h1>{n03.titre}</h1>
      {contenu}
    </section>
  );
}
