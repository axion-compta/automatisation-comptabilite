import { z } from 'zod';
import { DemandeVue } from '../../../../../packages/contrat/src/domaines/personnes.js';
import { e50 } from '../../../../../packages/textes/src/ecrans/e50.js';
import { e50Personnes } from '../../../../../packages/textes/src/ecrans/e50-personnes.js';
import { EtatChargement, EtatErreur, EtatVide } from '../../../../../packages/ui/src/composants/Etats.js';
import { Pastille } from '../../../../../packages/ui/src/composants/Pastille.js';
import { Tableau, type ColonneTableau } from '../../../../../packages/ui/src/composants/Tableau.js';
import { formaterDateAffiche } from '../../../../../packages/ui/src/format/affichage.js';
import { ErreurLecture } from '../../api.js';
import { useLecture } from '../../donnees/lecture.js';

const t = e50Personnes;
const Reponse = z.object({ body: z.array(DemandeVue) });
const avec = (modele: string, valeurs: Record<string, string>): string => modele.replace(/\{(\w+)\}/g, (m, k: string) => valeurs[k] ?? m);

/** Phrase de conservation d'un refus : date et source, ou « date à confirmer ». */
const conservation = (d: DemandeVue): string | null =>
  d.issue === 'refus_conservation'
    ? avec(t.conserveJusquAu, { date: d.conserve_jusqu_au ? formaterDateAffiche(d.conserve_jusqu_au) : t.dateAConfirmer, source: d.source_motif ?? t.dateAConfirmer })
    : null;

const colonnes: ColonneTableau<DemandeVue>[] = [
  { cle: 'type', entete: t.colonnes.type, rendu: (d) => t.types[d.type] },
  { cle: 'recue', entete: t.colonnes.recueLe, rendu: (d) => formaterDateAffiche(d.recue_le) },
  { cle: 'echeance', entete: t.colonnes.echeance, rendu: (d) => formaterDateAffiche(d.echeance) },
  {
    cle: 'etat',
    entete: t.colonnes.etat,
    rendu: (d) => (
      <>
        <span>{t.etats[d.etat]}</span>
        {d.en_retard ? <Pastille etat="bloque" libelle={t.enRetard} /> : null}
        {d.a_rappeler ? <Pastille etat="attente" libelle={t.aRappeler} /> : null}
        {d.issue ? <span>{t.issues[d.issue]}</span> : null}
        {conservation(d) ? <span>{conservation(d)}</span> : null}
      </>
    ),
  },
];

/** Section « Demandes des personnes » de l'écran E50 (lecture seule). */
export function DemandesPersonnes() {
  const lecture = useLecture('/personnes/demandes', Reponse);
  let contenu;
  if (lecture.etat === 'erreur') contenu = <EtatErreur message={lecture.erreur instanceof ErreurLecture && lecture.erreur.statut === 503 ? t.erreurs.reglageAbsent : e50.etats.erreur} />;
  else if (!lecture.donnees) contenu = <EtatChargement libelle={t.titre} />;
  else if (lecture.donnees.body.length === 0) contenu = <EtatVide titre={t.aucuneDemande} />;
  else contenu = <Tableau legende={t.titre} colonnes={colonnes} lignes={lecture.donnees.body} cleDeLigne={(d) => d.id} />;
  return (
    <section aria-labelledby="e50-demandes">
      <h2 id="e50-demandes">{t.titre}</h2>
      <p>{t.intro}</p>
      {contenu}
    </section>
  );
}
