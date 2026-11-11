import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { DemandeVue, TYPES_DROIT_PERSONNE } from '../../../../../packages/contrat/src/domaines/personnes.js';
import { e50Personnes } from '../../../../../packages/textes/src/ecrans/e50-personnes.js';
import { EtatChargement, EtatErreur, EtatVide } from '../../../../../packages/ui/src/composants/Etats.js';
import { Bouton } from '../../../../../packages/ui/src/composants/Bouton.js';
import { Pastille } from '../../../../../packages/ui/src/composants/Pastille.js';
import { Tableau, type ColonneTableau } from '../../../../../packages/ui/src/composants/Tableau.js';
import { formaterDateAffiche } from '../../../../../packages/ui/src/format/affichage.js';
import { ErreurEcriture, ecrire, nouvelleCle } from '../../api.js';
import { useLecture } from '../../donnees/lecture.js';
import { TraiterDemande } from './TraiterDemande.js';

const t = e50Personnes;
const Reponse = z.object({ body: z.array(DemandeVue) });
const Cree = z.object({ body: DemandeVue });
const ROUTE = '/personnes/demandes';
const L = { traiter: 'Traiter', enregistrer: 'Enregistrer une demande reçue', type: 'Type de demande', date: 'Date de réception', envoyer: 'Enregistrer' };
const FINALS = ['traitee', 'refusee', 'transmise_a_la_societe'];
const avec = (modele: string, valeurs: Record<string, string>): string => modele.replace(/\{(\w+)\}/g, (m, k: string) => valeurs[k] ?? m);

/** Phrase de conservation d'un refus : date et source, ou « date à confirmer ». */
const conservation = (d: DemandeVue): string | null =>
  d.issue === 'refus_conservation'
    ? avec(t.conserveJusquAu, { date: d.conserve_jusqu_au ? formaterDateAffiche(d.conserve_jusqu_au) : t.dateAConfirmer, source: d.source_motif ?? t.dateAConfirmer })
    : null;

const colonnes = (ouvrir: (d: DemandeVue, el: HTMLElement) => void): ColonneTableau<DemandeVue>[] => [
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
  {
    cle: 'actions',
    entete: L.traiter,
    rendu: (d) => (FINALS.includes(d.etat) ? null : <Bouton variante="discret" style={{ minHeight: 24, minWidth: 24 }} onClick={(e) => ouvrir(d, e.currentTarget)}>{L.traiter}</Bouton>),
  },
];

/** Formulaire court : enregistrer une demande reçue. */
function EnregistrerDemande({ surEnregistree }: { surEnregistree: () => void }) {
  const [type, setType] = useState<string>(TYPES_DROIT_PERSONNE[0]);
  const [date, setDate] = useState('');
  const [erreur, setErreur] = useState(false);
  const enCours = useRef(false);
  const cle = useRef(nouvelleCle());
  async function envoyer(e: FormEvent) {
    e.preventDefault();
    if (enCours.current || date === '') return;
    enCours.current = true;
    try {
      await ecrire('POST', ROUTE, { type, recue_le: date }, Cree, cle.current);
      cle.current = nouvelleCle();
      setDate('');
      setErreur(false);
      surEnregistree();
    } catch (err) {
      if (err instanceof ErreurEcriture && err.statut >= 400 && err.statut < 500) cle.current = nouvelleCle();
      setErreur(true);
    }
    enCours.current = false;
  }
  return (
    <form aria-labelledby="e50-enregistrer" onSubmit={envoyer}>
      <h3 id="e50-enregistrer">{L.enregistrer}</h3>
      <label>
        {L.type}
        <select name="type" value={type} onChange={(e) => setType(e.target.value)} style={{ minHeight: 24 }}>
          {TYPES_DROIT_PERSONNE.map((x) => (
            <option key={x} value={x}>{t.types[x]}</option>
          ))}
        </select>
      </label>
      <label>
        {L.date}
        <input name="recue_le" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ minHeight: 24 }} />
      </label>
      {erreur ? <p role="alert">{t.erreurs.reglageAbsent}</p> : null}
      <Bouton type="submit">{L.envoyer}</Bouton>
    </form>
  );
}

/** Section « Demandes des personnes » de l'écran E50 : liste, traitement, enregistrement. */
export function DemandesPersonnes() {
  const lecture = useLecture(ROUTE, Reponse);
  const client = useQueryClient();
  const [ouverte, setOuverte] = useState<DemandeVue | null>(null);
  const origine = useRef<HTMLElement | null>(null);
  const relire = () => client.invalidateQueries({ queryKey: ['lecture', ROUTE] });
  const fermer = () => {
    setOuverte(null);
    const el = origine.current;
    setTimeout(() => el?.isConnected && el.focus(), 0);
  };
  let contenu;
  if (lecture.etat === 'erreur') contenu = <EtatErreur message={t.erreurs.reglageAbsent} />;
  else if (!lecture.donnees) contenu = <EtatChargement libelle={t.titre} />;
  else if (lecture.donnees.body.length === 0) contenu = <EtatVide titre={t.aucuneDemande} />;
  else contenu = <Tableau legende={t.titre} colonnes={colonnes((d, el) => { origine.current = el; setOuverte(d); })} lignes={lecture.donnees.body} cleDeLigne={(d) => d.id} />;
  return (
    <section aria-labelledby="e50-demandes">
      <h2 id="e50-demandes">{t.titre}</h2>
      <p>{t.intro}</p>
      {contenu}
      {ouverte ? <TraiterDemande key={ouverte.id} demande={ouverte} surFerme={fermer} surTraitee={() => { void relire(); fermer(); }} /> : null}
      <EnregistrerDemande surEnregistree={() => void relire()} />
    </section>
  );
}
