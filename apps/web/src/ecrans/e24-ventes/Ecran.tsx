import { useState } from 'react';
import { ReponseVentes, type VenteResume } from '../../../../../packages/contrat/src/domaines/ventes.js';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { e24Ventes as t } from '../../../../../packages/textes/src/ecrans/e24-ventes.js';
import { socle } from '../../../../../packages/textes/src/ecrans/socle.js';
import { EtatChargement, EtatErreur, EtatVide } from '../../../../../packages/ui/src/composants/Etats.js';
import { Montant } from '../../../../../packages/ui/src/composants/Montant.js';
import { Pastille, type EtatPastille } from '../../../../../packages/ui/src/composants/Pastille.js';
import { Tableau, type ColonneTableau } from '../../../../../packages/ui/src/composants/Tableau.js';
import { formaterMontantAffiche } from '../../../../../packages/ui/src/format/affichage.js';
import { useLecture } from '../../donnees/lecture.js';

const CHEMIN_DETAIL = '/factures/vente?id=';
type Etat = keyof typeof t.etats;
const ETATS = Object.keys(t.etats) as Etat[];
const FORME: Record<Etat, EtatPastille> = {
  a_relire: 'attente', proposee: 'attente', a_encaisser: 'attente', payee_en_partie: 'attente',
  payee: 'ok', en_retard: 'bloque', en_litige: 'bloque', doublon: 'bloque',
};
const estEtat = (e: string): e is Etat => e in t.etats;

function colonnes(): ColonneTableau<VenteResume>[] {
  const c = t.colonnes;
  return [
    {
      cle: 'numero', entete: c.numero,
      rendu: (v) => (
        <>
          {v.numero}
          {v.avoirsLies.map((a) => (
            <div key={a.id}>{t.avoirLie.replace('{montant}', formaterMontantAffiche(centimes(a.ttcCentimes)))}</div>
          ))}
        </>
      ),
    },
    { cle: 'client', entete: c.client, rendu: (v) => v.client?.nom ?? '' },
    { cle: 'date', entete: c.date, rendu: (v) => v.dateFacture },
    { cle: 'ttc', entete: c.ttc, alignement: 'droite', rendu: (v) => <Montant centimes={centimes(v.ttcCentimes)} /> },
    { cle: 'resteDu', entete: c.resteDu, alignement: 'droite', rendu: (v) => <Montant centimes={centimes(v.resteDuCentimes)} /> },
    {
      cle: 'etat', entete: c.etat,
      rendu: (v) => {
        if (!estEtat(v.etat)) return v.etat;
        const retard = v.etat === 'en_retard' && v.joursDeRetard !== undefined;
        return (
          <>
            <Pastille etat={FORME[v.etat]} libelle={t.etats[v.etat]} />
            {retard ? <div>{t.enRetard.replace('{jours}', String(v.joursDeRetard))}</div> : null}
          </>
        );
      },
    },
    {
      cle: 'action', entete: c.action,
      rendu: (v) => {
        const libelle = estEtat(v.etat) ? (t.actions as Partial<Record<Etat, string>>)[v.etat] : undefined;
        return libelle ? <a href={CHEMIN_DETAIL + encodeURIComponent(v.id)}>{libelle}</a> : null;
      },
    },
  ];
}

function Liste({ requete }: { requete: string }) {
  const lecture = useLecture('/ventes' + requete, ReponseVentes);
  if (lecture.etat === 'chargement') return <EtatChargement libelle={t.chargement} />;
  if (lecture.etat === 'erreur') return <EtatErreur message={lecture.erreur?.code === 'acces_refuse' ? socle.etats.acces403 : t.erreur} />;
  if (lecture.etat === 'vide' || !lecture.donnees) return <EtatVide titre={t.videTitre} detail={t.vide} />;
  return <Tableau legende={t.legende} colonnes={colonnes()} lignes={lecture.donnees.body} cleDeLigne={(v) => v.id} />;
}

/** Écran E24, onglet Ventes : liste en lecture, filtres état, client et mois transmis à `GET /ventes`. */
export function Ecran() {
  const [etat, setEtat] = useState('');
  const [client, setClient] = useState('');
  const [mois, setMois] = useState('');
  const q = new URLSearchParams();
  if (etat) q.set('etat', etat);
  if (client.trim()) q.set('client', client.trim());
  if (mois) q.set('mois', mois);
  const requete = q.size > 0 ? '?' + q.toString() : '';
  return (
    <section aria-labelledby="e24-ventes-titre">
      <h1 id="e24-ventes-titre">{t.titre}</h1>
      <form role="search" aria-label={t.filtres.nom} onSubmit={(e) => e.preventDefault()}>
        <label>
          {t.filtres.etat}
          <select value={etat} onChange={(e) => setEtat(e.target.value)}>
            <option value="">{t.filtres.tous}</option>
            {ETATS.map((e) => <option key={e} value={e}>{t.etats[e]}</option>)}
          </select>
        </label>
        <label>
          {t.filtres.client}
          <input type="search" maxLength={50} value={client} onChange={(e) => setClient(e.target.value)} />
        </label>
        <label>
          {t.filtres.periode}
          <input type="month" value={mois} onChange={(e) => setMois(e.target.value)} />
        </label>
      </form>
      <Liste requete={requete} />
    </section>
  );
}
