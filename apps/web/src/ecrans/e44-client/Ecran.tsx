import { ClientDetail } from '../../../../../packages/contrat/src/domaines/clients.js';
import { e44Client as t } from '../../../../../packages/textes/src/ecrans/e44-client.js';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { EtatChargement, EtatErreur } from '../../../../../packages/ui/src/composants/Etats.js';
import { Montant } from '../../../../../packages/ui/src/composants/Montant.js';
import { useLecture } from '../../donnees/lecture.js';
import { z } from 'zod';

const CHEMIN_LISTE = '/reglages/entreprise/tiers';
const CHEMIN_FACTURE = '/factures/vente?id=';
const Reponse = z.object({ body: ClientDetail });
const Retour = () => (
  <p>
    <a href={CHEMIN_LISTE}>{t.retour}</a>
  </p>
);

function Fiche({ c }: { c: ClientDetail }) {
  const h = c.habitude;
  const phrase = h
    ? t.habitude.phrase.replace('{nom}', c.nom).replace('{compte}', h.compteProduit).replace('{nature}', t.habitude[h.nature === 'service' ? 'service' : 'bien'])
    : t.habitude.aucune;
  return (
    <>
      <h1>{c.nom}</h1>
      <dl>
        <dt>{t.nature.libelle}</dt>
        <dd>{t.nature[c.nature]}</dd>
        <dt>{t.siren}</dt>
        <dd>{c.siren ?? t.absent}</dd>
        <dt>{t.tva}</dt>
        <dd>{c.tva ?? t.absent}</dd>
        <dt>{t.vies.libelle}</dt>
        <dd>{t.vies[c.statutVies]}</dd>
        <dt>{t.solde}</dt>
        <dd><Montant centimes={centimes(c.soldeCentimes)} /></dd>
        <dt>{t.delai.libelle}</dt>
        <dd>{c.delaiMoyenJours === null ? t.delai.inconnu : t.delai.jours.replace('{n}', String(c.delaiMoyenJours))}</dd>
        <dt>{t.habitude.titre}</dt>
        <dd>{phrase}</dd>
      </dl>
      <h2>{t.factures.titre}</h2>
      {c.facturesOuvertes.length === 0 ? (
        <p>{t.factures.aucune}</p>
      ) : (
        <ul>
          {c.facturesOuvertes.map((f) => (
            <li key={f.id}>
              <a href={CHEMIN_FACTURE + encodeURIComponent(f.id)}>{f.numero}</a> <Montant centimes={centimes(f.resteDuCentimes)} /> {t.factures.reste}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const Sans = ({ message }: { message: string }) => <><h1>{t.titre}</h1><EtatErreur message={message} /></>;

function Lecture({ code }: { code: string }) {
  const l = useLecture('/clients/' + encodeURIComponent(code), Reponse);
  if (l.etat === 'chargement') return <><h1>{t.titre}</h1><EtatChargement libelle={t.etats.chargement} /></>;
  if (l.etat === 'erreur') return <Sans message={l.erreur?.statut === 404 ? t.etats.inconnu : t.etats.erreur} />;
  return l.donnees ? <Fiche c={l.donnees.body} /> : <Sans message={t.etats.inconnu} />;
}

/** Écran E44 : fiche d'un client lue par `GET /clients/{code}`, code dans le paramètre de recherche `code`. */
export function Ecran() {
  const code = new URLSearchParams(window.location.search).get('code') ?? '';
  return (
    <section>
      {code === '' ? <Sans message={t.etats.inconnu} /> : <Lecture code={code} />}
      <Retour />
    </section>
  );
}
