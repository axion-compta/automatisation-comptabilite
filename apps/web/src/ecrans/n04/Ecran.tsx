import { useId, useState, type ChangeEvent } from 'react';
import { z } from 'zod';
import { n04 } from '../../../../../packages/textes/src/ecrans/n04.js';
import { CompteDuPlan, Exercice } from '../../../../../packages/contrat/src/domaines/plan.js';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { EtatChargement, EtatErreur, EtatVide } from '../../../../../packages/ui/src/composants/Etats.js';
import { Montant } from '../../../../../packages/ui/src/composants/Montant.js';
import { Tableau, type ColonneTableau } from '../../../../../packages/ui/src/composants/Tableau.js';
import { formaterMontantAffiche } from '../../../../../packages/ui/src/format/affichage.js';
import type { ErreurLecture } from '../../api.js';
import { useLecture } from '../../donnees/lecture.js';

const TAILLE_PAGE = 50;
const enveloppe = <T extends z.ZodType>(corps: T) =>
  z.object({ body: z.array(corps), decalage: z.number().int().min(0), total: z.number().int().min(0) });
const ReponseExercices = enveloppe(Exercice);
const ReponsePlan = enveloppe(CompteDuPlan);
const remplir = (modele: string, valeurs: Record<string, string | number>): string =>
  Object.entries(valeurs).reduce((t, [k, v]) => t.replace('{' + k + '}', String(v)), modele);

function messageErreur(e: ErreurLecture | undefined): string {
  if (e?.code === 'reseau') return n04.etats.reseau;
  if (e?.code === 'acces_refuse') return n04.etats.acces;
  if (e?.code === 'introuvable') return n04.etats.introuvable;
  return n04.etats.generique;
}

type Filtres = { annee: string; classe: string; q: string; decalage: number };
function cheminPlan(f: Filtres): string {
  const p = new URLSearchParams({ limite: String(TAILLE_PAGE), decalage: String(f.decalage) });
  if (f.classe !== '') p.set('classe', f.classe);
  if (f.q !== '') p.set('q', f.q);
  return '/exercices/' + encodeURIComponent(f.annee) + '/plan?' + p.toString();
}

const colonnes: ColonneTableau<CompteDuPlan>[] = [
  { cle: 'numero', entete: n04.tableau.numero, rendu: (c) => c.numero },
  { cle: 'libelle', entete: n04.tableau.libelle, rendu: (c) => c.libelle },
  {
    cle: 'solde',
    entete: n04.tableau.solde,
    alignement: 'droite',
    rendu: (c) => {
      const m = centimes(c.soldeCentimes);
      return <Montant centimes={m} libelleNegatif={remplir(n04.tableau.soldeNegatif, { montant: formaterMontantAffiche(m) })} />;
    },
  },
];

function Plan({ filtres, surPage }: { filtres: Filtres; surPage: (decalage: number) => void }) {
  const lecture = useLecture(cheminPlan(filtres), ReponsePlan);
  if (lecture.etat === 'chargement') return <EtatChargement libelle={n04.etats.chargement} />;
  if (lecture.etat === 'erreur') return <EtatErreur message={messageErreur(lecture.erreur)} />;
  if (lecture.etat === 'vide' || !lecture.donnees) return <EtatVide titre={n04.etats.videTitre} detail={n04.etats.videDetail} />;
  const page = lecture.donnees;
  const resume = (debut: number, fin: number, total: number) => remplir(n04.pagination.resume, { debut, fin, total });
  const { precedent, suivant } = n04.pagination;
  const pagination = { decalage: page.decalage, limite: TAILLE_PAGE, total: page.total, libellePrecedent: precedent, libelleSuivant: suivant, resume, surPage };
  return <Tableau legende={n04.tableau.legende} colonnes={colonnes} lignes={page.body} cleDeLigne={(c) => c.numero} pagination={pagination} />;
}

/** N04 : plan comptable de l'année choisie, avec le solde calculé par le serveur. */
export function Ecran() {
  const [idAnnee, idClasse, idRecherche] = [useId(), useId(), useId()];
  const exercices = useLecture('/exercices', ReponseExercices);
  const [annee, setAnnee] = useState('');
  const [classe, setClasse] = useState('');
  const [brouillon, setBrouillon] = useState('');
  const [q, setQ] = useState('');
  const [decalage, setDecalage] = useState(0);
  const liste = exercices.donnees?.body ?? [];
  const courante = annee || (liste.find((e) => e.statut === 'ouvert') ?? liste[0])?.id || '';
  const choisir = (poser: (v: string) => void) => (e: ChangeEvent<HTMLSelectElement>) => {
    poser(e.target.value);
    setDecalage(0);
  };

  let contenu;
  if (exercices.etat === 'chargement') contenu = <EtatChargement libelle={n04.etats.chargement} />;
  else if (exercices.etat === 'erreur') contenu = <EtatErreur message={messageErreur(exercices.erreur)} />;
  else if (courante === '') contenu = <EtatVide titre={n04.etats.aucuneAnnee} />;
  else {
    const soumettre = (e: { preventDefault: () => void }) => {
      e.preventDefault();
      setQ(brouillon.trim());
      setDecalage(0);
    };
    contenu = (
      <>
        <form onSubmit={soumettre}>
          <label htmlFor={idAnnee}>{n04.champs.annee}</label>{' '}
          <select id={idAnnee} value={courante} onChange={choisir(setAnnee)}>
            {liste.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
          </select>{' '}
          <label htmlFor={idClasse}>{n04.champs.classe}</label>{' '}
          <select id={idClasse} value={classe} onChange={choisir(setClasse)}>
            <option value="">{n04.toutesClasses}</option>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={String(n)}>{remplir(n04.classe, { numero: n })}</option>)}
          </select>{' '}
          <label htmlFor={idRecherche}>{n04.champs.recherche}</label>{' '}
          <input id={idRecherche} type="search" maxLength={50} value={brouillon} onChange={(e) => setBrouillon(e.target.value)} />{' '}
          <button type="submit">{n04.rechercher}</button>
        </form>
        <Plan filtres={{ annee: courante, classe, q, decalage }} surPage={setDecalage} />
      </>
    );
  }
  return (
    <main>
      <h1>{n04.titre}</h1>
      {contenu}
    </main>
  );
}
