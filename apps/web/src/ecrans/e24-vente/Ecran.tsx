import { z } from 'zod';
import { VenteDetail } from '../../../../../packages/contrat/src/domaines/ventes.js';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { cartesVentes } from '../../../../../packages/textes/src/cartes/ventes.js';
import { e24Ventes } from '../../../../../packages/textes/src/ecrans/e24-ventes.js';
import { e24Vente as t } from '../../../../../packages/textes/src/ecrans/e24-vente.js';
import { socle } from '../../../../../packages/textes/src/ecrans/socle.js';
import { EtatChargement, EtatErreur } from '../../../../../packages/ui/src/composants/Etats.js';
import { Montant } from '../../../../../packages/ui/src/composants/Montant.js';
import { formaterDateAffiche, formaterMontantAffiche } from '../../../../../packages/ui/src/format/affichage.js';
import { useLecture } from '../../donnees/lecture.js';

const CHEMIN_LISTE = '/factures/ventes';
const CHEMIN_VENTE = '/factures/vente?id=';
const Reponse = z.object({ body: VenteDetail });

/** Taux en points de base (1 900 = 19 %), calcul entier : 550 donne « 5,5 % ». */
export function tauxEnTexte(pdb: number): string {
  if (!Number.isInteger(pdb) || pdb < 0) return t.tauxIllisible;
  const r = pdb % 100;
  const decimales = r === 0 ? '' : ',' + (r % 10 === 0 ? String(r / 10) : String(r).padStart(2, '0'));
  const valeur = String(Math.floor(pdb / 100)) + decimales;
  return valeur + ' ' + t.pourcent;
}

type Carte = VenteDetail['cartes'][number];

function texteCarte(c: Carte, v: VenteDetail): { titre: string; detail: string } {
  const g = (cartesVentes as Record<string, { titre: string; detail: string } | undefined>)[c.code];
  if (!g) return { titre: c.mot, detail: c.message };
  if (g.detail.includes('{ecart}')) return { titre: g.titre, detail: c.message };
  const detail = g.detail
    .replace('{numero}', v.numero)
    .replace('{date}', formaterDateAffiche(v.dateFacture))
    .replace('{montant}', formaterMontantAffiche(centimes(v.resteDuCentimes)));
  return { titre: g.titre, detail };
}

function Ligne({ nom, children }: { nom: string; children: React.ReactNode }) {
  return (
    <>
      <dt>{nom}</dt>
      <dd>{children}</dd>
    </>
  );
}

function Detail({ v }: { v: VenteDetail }) {
  return (
    <>
      <h1 id="e24-vente-titre">{v.numero}</h1>
      <section aria-label={t.sections.facture}>
        <h2>{t.sections.facture}</h2>
        <dl>
          {v.client ? <Ligne nom={t.champs.client}>{v.client.nom}</Ligne> : null}
          <Ligne nom={t.champs.dateFacture}>{formaterDateAffiche(v.dateFacture)}</Ligne>
          {v.echeance ? <Ligne nom={t.champs.echeance}>{formaterDateAffiche(v.echeance)}</Ligne> : null}
          <Ligne nom={t.champs.total}><Montant centimes={centimes(v.ttcCentimes)} /></Ligne>
          <Ligne nom={t.champs.resteDu}><Montant centimes={centimes(v.resteDuCentimes)} /></Ligne>
        </dl>
      </section>
      <section aria-label={t.sections.lignes}>
        <h2>{t.sections.lignes}</h2>
        <ul>{v.lignes.map((l, i) => <li key={i}>{l.libelle} · {l.quantite} · <Montant centimes={centimes(l.ttcCentimes)} /></li>)}</ul>
      </section>
      <section aria-label={t.sections.controles}>
        <h2>{t.sections.controles}</h2>
        {v.cartes.length === 0 ? <p>{t.aucuneCarte}</p> : v.cartes.map((c, i) => <article key={i}><h3>{texteCarte(c, v).titre}</h3><p>{texteCarte(c, v).detail}</p></article>)}
      </section>
      <section aria-label={t.sections.ecriture}>
        <h2>{t.sections.ecriture}</h2>
        {v.ecriture ? (
          <>
            <p>{t.prepareParIa}</p>
            <table>
              <thead><tr>{Object.values(t.ecritureColonnes).map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {v.ecriture.lignes.map((l, i) => (
                  <tr key={i}><td>{l.compte}</td><td><Montant centimes={centimes(l.debitCentimes)} /></td><td><Montant centimes={centimes(l.creditCentimes)} /></td></tr>
                ))}
              </tbody>
            </table>
          </>
        ) : <p>{t.aucuneEcriture}</p>}
      </section>
      <section aria-label={t.sections.paiements}>
        <h2>{t.sections.paiements}</h2>
        {v.paiements.length === 0 ? <p>{t.aucunPaiement}</p> : (
          <ul>{v.paiements.map((p, i) => <li key={i}>{formaterDateAffiche(p.date)} · <Montant centimes={centimes(p.montantCentimes)} /></li>)}</ul>
        )}
      </section>
      <section aria-label={t.sections.avoirsLies}>
        <h2>{t.sections.avoirsLies}</h2>
        {v.avoirsLies.length === 0 ? <p>{t.aucunAvoir}</p> : (
          <ul>{v.avoirsLies.map((a) => <li key={a.id}><a href={CHEMIN_VENTE + encodeURIComponent(a.id)}>{e24Ventes.avoirLie.replace('{montant}', formaterMontantAffiche(centimes(a.ttcCentimes)))}</a></li>)}</ul>
        )}
      </section>
    </>
  );
}

function Lecture({ id }: { id: string }) {
  const lecture = useLecture('/ventes/' + encodeURIComponent(id), Reponse);
  if (lecture.etat === 'chargement') return <EtatChargement libelle={t.chargement} />;
  if (lecture.etat === 'erreur') {
    const code = lecture.erreur?.code;
    return <EtatErreur message={code === 'introuvable' ? t.inconnue : code === 'acces_refuse' ? socle.etats.acces403 : t.erreur} />;
  }
  return lecture.donnees ? <Detail v={lecture.donnees.body} /> : <p>{t.inconnue}</p>;
}

/** Écran E24 : détail d'une vente (lecture seule) par paramètre de recherche `id`. */
export function Ecran() {
  const id = new URLSearchParams(window.location.search).get('id') ?? '';
  return (
    <section aria-labelledby="e24-vente-titre">
      {id === '' ? <><h1 id="e24-vente-titre">{t.titre}</h1><EtatErreur message={t.inconnue} /></> : <Lecture id={id} />}
      <p><a href={CHEMIN_LISTE}>{t.retour}</a></p>
    </section>
  );
}
