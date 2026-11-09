import { ReponseExercices } from '../../../../../packages/contrat/src/domaines/plan.js';
import { ReponseEstimationTva, ReponsePeriodesTva, type PeriodeTva } from '../../../../../packages/contrat/src/domaines/tva.js';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { piecesARegarder } from '../../../../../packages/textes/src/documents/declarations.js';
import { e19 } from '../../../../../packages/textes/src/ecrans/e19.js';
import { EtatChargement, EtatErreur, EtatVide } from '../../../../../packages/ui/src/composants/Etats.js';
import { Montant } from '../../../../../packages/ui/src/composants/Montant.js';
import { Pastille, type EtatPastille } from '../../../../../packages/ui/src/composants/Pastille.js';
import { Tableau } from '../../../../../packages/ui/src/composants/Tableau.js';
import type { ErreurLecture } from '../../api.js';
import { useLecture } from '../../donnees/lecture.js';
import { useState } from 'react';
import { Declaration, idDeclaration } from './Declaration.js';

const messageErreur = (e: ErreurLecture | undefined): string => (e?.code === 'acces_refuse' ? e19.etats.acces : e19.etats.erreur);
const ETAT_PASTILLE: Record<PeriodeTva['statut'], EtatPastille> = { ouverte: 'attente', validee: 'ok', deposee_par_client: 'ok' };

function Estimation({ exercice }: { exercice: string }) {
  const lecture = useLecture('/exercices/' + encodeURIComponent(exercice) + '/tva/estimation', ReponseEstimationTva);
  if (lecture.etat === 'chargement') return <EtatChargement libelle={e19.etats.chargement} />;
  if (lecture.etat === 'erreur') return <EtatErreur message={messageErreur(lecture.erreur)} />;
  const e = lecture.donnees?.body;
  if (!e) return null;
  if (e.etat === 'calculee') {
    return (
      <dl>
        <dt>{e19.estimation.collectee}</dt>
        <dd><Montant centimes={centimes(e.collecteeCentimes)} /></dd>
        <dt>{e19.estimation.deductible}</dt>
        <dd><Montant centimes={centimes(e.deductibleCentimes)} /></dd>
      </dl>
    );
  }
  if (e.motif === 'regime_non_traite') return <p>{e19.estimation.regimeNonTraite}</p>;
  return (
    <p>
      {piecesARegarder(e.piecesARegarder ?? 0)}. <a href={e19.estimation.cheminPieces}>{e19.estimation.lienPieces}</a>
    </p>
  );
}

function Periodes({ exercice, ouvrir }: { exercice: string; ouvrir: (periodeId: string) => void }) {
  const lecture = useLecture('/exercices/' + encodeURIComponent(exercice) + '/tva/periodes', ReponsePeriodesTva);
  if (lecture.etat === 'chargement') return <EtatChargement libelle={e19.etats.chargement} />;
  if (lecture.etat === 'erreur') return <EtatErreur message={messageErreur(lecture.erreur)} />;
  if (lecture.etat === 'vide' || !lecture.donnees) return <EtatVide titre={e19.periodes.vide} />;
  return (
    <Tableau
      legende={e19.periodes.legende}
      colonnes={[
        { cle: 'debut', entete: e19.periodes.du, rendu: (p: PeriodeTva) => p.debut },
        { cle: 'fin', entete: e19.periodes.au, rendu: (p: PeriodeTva) => p.fin },
        { cle: 'statut', entete: e19.periodes.etat, rendu: (p: PeriodeTva) => <Pastille etat={ETAT_PASTILLE[p.statut]} libelle={e19.periodes.etats[p.statut]} /> },
        { cle: 'declaration', entete: e19.declaration.titre, rendu: (p: PeriodeTva) => (p.statut === 'ouverte' ? null : <button type="button" onClick={() => ouvrir(p.id)}>{e19.declaration.ouvrir}</button>) },
      ]}
      lignes={lecture.donnees.body}
      cleDeLigne={(p) => p.id}
    />
  );
}

/** Écran E19 : estimation de la TVA (bloquée si des pièces sont en doute) et périodes de l'exercice le plus récent. */
export function Ecran() {
  const exercices = useLecture('/exercices', ReponseExercices);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const premier = exercices.donnees?.body[0]?.id;
  let contenu;
  if (exercices.etat === 'chargement') contenu = <EtatChargement libelle={e19.etats.chargement} />;
  else if (exercices.etat === 'erreur') contenu = <EtatErreur message={messageErreur(exercices.erreur)} />;
  else if (premier === undefined) contenu = <EtatVide titre={e19.etats.aucuneAnnee} />;
  else if (ouverte !== null) {
    contenu = (
      <>
        <button type="button" onClick={() => setOuverte(null)}>{e19.declaration.retour}</button>
        <Declaration id={idDeclaration(ouverte)} />
      </>
    );
  } else {
    contenu = (
      <>
        <section aria-labelledby="e19-estimation">
          <h2 id="e19-estimation">{e19.estimation.titre}</h2>
          <Estimation exercice={premier} />
        </section>
        <section aria-labelledby="e19-periodes">
          <h2 id="e19-periodes">{e19.periodes.titre}</h2>
          <Periodes exercice={premier} ouvrir={setOuverte} />
        </section>
      </>
    );
  }
  return (
    <section aria-labelledby="e19-titre">
      <h1 id="e19-titre">{e19.titre}</h1>
      {contenu}
    </section>
  );
}
