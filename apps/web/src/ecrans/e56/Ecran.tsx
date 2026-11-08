import { useState, type KeyboardEvent } from 'react';
import { ReponseExercices } from '../../../../../packages/contrat/src/domaines/plan.js';
import { ReponseTableauDeBord, VUES } from '../../../../../packages/contrat/src/domaines/tableau-de-bord.js';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { e56 } from '../../../../../packages/textes/src/ecrans/e56.js';
import { EtatChargement, EtatErreur } from '../../../../../packages/ui/src/composants/Etats.js';
import { Montant } from '../../../../../packages/ui/src/composants/Montant.js';
import { Tableau } from '../../../../../packages/ui/src/composants/Tableau.js';
import { INTERVALLE_TABLEAU_DE_BORD_MS, useLectureInterrogee } from '../../donnees/interrogation.js';
import { useLecture } from '../../donnees/lecture.js';
import './e56.css';

type Vue = (typeof VUES)[number];
type Reponse = ReturnType<typeof ReponseTableauDeBord.parse>['body'];
type Chiffres = Reponse['chiffres'];
const INDICATEURS = [
  { cle: 'ca', texte: e56.chiffres.ca },
  { cle: 'charges', texte: e56.chiffres.charges },
  { cle: 'resultatProvisoire', texte: e56.chiffres.resultat },
  { cle: 'tresorerie', texte: e56.chiffres.tresorerie },
] as const;

/** Chemin de lecture du tableau de bord pour un exercice et une vue. */
export const cheminActivite = (exercice: string, vue: Vue): string => '/exercices/' + encodeURIComponent(exercice) + '/tableau-de-bord?vue=' + vue;
const montant = (c: Chiffres['ca']) => <Montant centimes={centimes(c.centimes)} />;

/** Chiffres clés d'un exercice : valeurs, comparaison et tableau équivalent, tous donnés par le serveur. */
export function Activite({ exercice }: { exercice: string }) {
  const [vue, setVue] = useState<Vue>('exercice');
  const lecture = useLectureInterrogee(cheminActivite(exercice, vue), ReponseTableauDeBord, { intervalleMs: INTERVALLE_TABLEAU_DE_BORD_MS });
  function auClavier(e: KeyboardEvent, index: number) {
    const pas = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    const cible = VUES[(index + pas + VUES.length) % VUES.length];
    if (pas === 0 || !cible) return;
    e.preventDefault();
    setVue(cible);
    document.getElementById('e56-vue-' + cible)?.focus();
  }
  let contenu = null;
  if (lecture.etat === 'chargement') contenu = <EtatChargement libelle={e56.etats.chargement} />;
  else if (lecture.etat === 'erreur') contenu = <EtatErreur message={lecture.erreur?.code === 'acces_refuse' ? e56.etats.acces : e56.etats.erreur} />;
  else if (lecture.donnees) {
    const { chiffres, comparaison } = lecture.donnees.body;
    const precedent = 'chiffres' in comparaison ? comparaison.chiffres : undefined;
    const mot = 'vide' in comparaison ? e56.vide[comparaison.vide] : undefined;
    contenu = (
      <>
        <ul className="e56-cartes">
          {INDICATEURS.map((i) => (
            <li key={i.cle} className="e56-carte">
              <dl>
                <dt>{i.texte}</dt>
                <dd>{montant(chiffres[i.cle])}</dd>
                <dd>{precedent ? <>{e56.comparaison.titre} {montant(precedent[i.cle])}</> : mot}</dd>
              </dl>
            </li>
          ))}
        </ul>
        {precedent && 'tronquee' in comparaison && comparaison.tronquee && <p>{e56.comparaison.tronquee}</p>}
        <Tableau
          legende={e56.tableau.legende}
          colonnes={[
            { cle: 'indicateur', entete: e56.tableau.indicateur, rendu: (i) => i.texte },
            { cle: 'periode', entete: e56.tableau.periode, alignement: 'droite', rendu: (i) => montant(chiffres[i.cle]) },
            { cle: 'precedent', entete: e56.tableau.precedent, alignement: 'droite', rendu: (i) => (precedent ? montant(precedent[i.cle]) : mot) },
          ]}
          lignes={[...INDICATEURS]}
          cleDeLigne={(i) => i.cle}
        />
      </>
    );
  }
  return (
    <>
      <div role="radiogroup" aria-label={e56.vues.nom} className="e56-vues">
        {VUES.map((v, i) => (
          <button key={v} type="button" role="radio" id={'e56-vue-' + v} aria-checked={vue === v} tabIndex={vue === v ? 0 : -1} onClick={() => setVue(v)} onKeyDown={(e) => auClavier(e, i)}>
            {e56.vues[v]}
          </button>
        ))}
      </div>
      <div aria-live="polite">{contenu}</div>
    </>
  );
}

/** Écran E56 : l'exercice ouvert (sinon le plus récent) est lu auprès du serveur. */
export function Ecran() {
  const exercices = useLecture('/exercices', ReponseExercices);
  const liste = exercices.donnees?.body ?? [];
  const courant = (liste.find((e) => e.statut === 'ouvert') ?? liste[0])?.id;
  let contenu = <EtatChargement libelle={e56.etats.chargement} />;
  if (exercices.etat === 'erreur') contenu = <EtatErreur message={exercices.erreur?.code === 'acces_refuse' ? e56.etats.acces : e56.etats.erreur} />;
  else if (courant) contenu = <Activite exercice={courant} />;
  else if (exercices.etat !== 'chargement') contenu = <EtatErreur message={e56.etats.aucunExercice} />;
  return (
    <section aria-labelledby="e56-titre">
      <h1 id="e56-titre">{e56.titre}</h1>
      {contenu}
    </section>
  );
}
