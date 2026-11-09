import { useState } from 'react';
import { ReponseTraces, type ResultatControle, type TraceControle } from '../../../../../packages/contrat/src/domaines/controles.js';
import { ReponseExercices } from '../../../../../packages/contrat/src/domaines/plan.js';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { e57 } from '../../../../../packages/textes/src/ecrans/e57.js';
import { EtatChargement, EtatErreur, EtatVide } from '../../../../../packages/ui/src/composants/Etats.js';
import { Montant } from '../../../../../packages/ui/src/composants/Montant.js';
import { Pastille, type EtatPastille } from '../../../../../packages/ui/src/composants/Pastille.js';
import { Tableau } from '../../../../../packages/ui/src/composants/Tableau.js';
import { formaterDateAffiche } from '../../../../../packages/ui/src/format/affichage.js';
import { useLecture } from '../../donnees/lecture.js';

const RESULTATS = ['OK', 'ALERTE', 'IMPOSSIBLE', 'NON_APPLICABLE', 'ECARTE'] as const satisfies readonly ResultatControle[];
type Filtre = ResultatControle | 'TOUS';
const FILTRES: readonly Filtre[] = ['TOUS', ...RESULTATS];
const PASTILLE: Record<ResultatControle, EtatPastille> = { OK: 'ok', ALERTE: 'attente', IMPOSSIBLE: 'bloque', NON_APPLICABLE: 'attente', ECARTE: 'attente' };
const DEBUT_DATE = 0;
const FIN_DATE = 'AAAA-MM-JJ'.length;

/** Chemin de lecture des contrôles tracés d'un exercice. */
export const cheminControles = (exercice: string): string => '/exercices/' + encodeURIComponent(exercice) + '/controles';
const nombre = (l: readonly TraceControle[], r: ResultatControle) => l.filter((t) => t.resultat === r).length;

/** Contrôles tracés d'un exercice : le serveur trie (non réussis d'abord), l'écran filtre seulement. */
export function Controles({ exercice }: { exercice: string }) {
  const [filtre, setFiltre] = useState<Filtre>('TOUS');
  const lecture = useLecture(cheminControles(exercice), ReponseTraces);
  if (lecture.etat === 'chargement') return <EtatChargement libelle={e57.etats.chargement} />;
  if (lecture.etat === 'erreur') return <EtatErreur message={lecture.erreur?.code === 'acces_refuse' ? e57.etats.acces : e57.etats.erreur} />;
  const toutes = lecture.donnees?.body ?? [];
  if (toutes.length === 0) return <EtatVide titre={e57.etats.vide} detail={e57.etats.videDetail} />;
  const lignes = filtre === 'TOUS' ? toutes : toutes.filter((t) => t.resultat === filtre);
  return (
    <>
      <p>{[nombre(toutes, 'OK') + ' ' + e57.resume.reussis, nombre(toutes, 'ALERTE') + ' ' + e57.resume.alertes, nombre(toutes, 'IMPOSSIBLE') + ' ' + e57.resume.impossibles].join(', ')}</p>
      <div role="radiogroup" aria-label={e57.filtre.nom}>
        {FILTRES.map((f) => (
          <button key={f} type="button" role="radio" aria-checked={filtre === f} onClick={() => setFiltre(f)}>
            {f === 'TOUS' ? e57.filtre.tous : e57.resultats[f]}
          </button>
        ))}
      </div>
      <Tableau
        legende={e57.tableau.legende}
        colonnes={[
          { cle: 'controle', entete: e57.tableau.controle, rendu: (t) => t.regleId },
          { cle: 'resultat', entete: e57.tableau.resultat, rendu: (t) => <Pastille etat={PASTILLE[t.resultat]} libelle={e57.resultats[t.resultat]} /> },
          { cle: 'valeur', entete: e57.tableau.valeur, rendu: (t) => t.valeur ?? <span aria-label={e57.valeurAbsente.libelle}>{e57.valeurAbsente.tiret}</span> },
          { cle: 'ecart', entete: e57.tableau.ecart, alignement: 'droite', rendu: (t) => (t.ecartCentimes === null ? <span aria-label={e57.valeurAbsente.libelle}>{e57.valeurAbsente.tiret}</span> : <Montant centimes={centimes(t.ecartCentimes)} />) },
          { cle: 'date', entete: e57.tableau.date, rendu: (t) => formaterDateAffiche(t.horodatage.slice(DEBUT_DATE, FIN_DATE)) },
        ]}
        lignes={lignes}
        cleDeLigne={(t) => t.regleId + '|' + t.objetId + '|' + t.horodatage}
      />
    </>
  );
}

/** Écran E57 : l'exercice ouvert (sinon le plus récent) est lu auprès du serveur. */
export function Ecran() {
  const exercices = useLecture('/exercices', ReponseExercices);
  const liste = exercices.donnees?.body ?? [];
  const courant = (liste.find((e) => e.statut === 'ouvert') ?? liste[0])?.id;
  let contenu = <EtatChargement libelle={e57.etats.chargement} />;
  if (exercices.etat === 'erreur') contenu = <EtatErreur message={exercices.erreur?.code === 'acces_refuse' ? e57.etats.acces : e57.etats.erreur} />;
  else if (courant) contenu = <Controles exercice={courant} />;
  else if (exercices.etat !== 'chargement') contenu = <EtatErreur message={e57.etats.aucunExercice} />;
  return (
    <section aria-labelledby="e57-titre">
      <h1 id="e57-titre">{e57.titre}</h1>
      {contenu}
    </section>
  );
}
