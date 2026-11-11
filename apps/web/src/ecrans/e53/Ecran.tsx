import { useState } from 'react';
import { z } from 'zod';
import { ReponseDemandePalier } from '../../../../../packages/contrat/src/domaines/palier.js';
import { Volume } from '../../../../../packages/contrat/src/domaines/volume.js';
import { abonnement } from '../../../../../packages/textes/src/ecrans/abonnement.js';
import { e53 } from '../../../../../packages/textes/src/ecrans/e53.js';
import { EtatChargement, EtatErreur } from '../../../../../packages/ui/src/composants/Etats.js';
import { Jauge } from '../../../../../packages/ui/src/composants/Jauge.js';
import { ecrire, ErreurEcriture, nouvelleCle, type SchemaLecture } from '../../api.js';
import { useLecture } from '../../donnees/lecture.js';
import { lienPortail } from '../../socle/liens.js';

type Reponse = z.infer<typeof Volume>;
const schemaVolume: SchemaLecture<Reponse> = Volume;
const BPS_PAR_POURCENT = 100;
const avec = (modele: string, palier: string): string => modele.replace('{palier}', palier);
const messageErreur = (e: unknown): string => {
  const code = e instanceof ErreurEcriture ? e.code : '';
  return Object.hasOwn(abonnement.erreurs, code) ? (abonnement.erreurs as Record<string, string>)[code]! : e53.demande.erreur;
};

type Panneau = { cle: string; accord: boolean; envoi: boolean; erreur: string | null };

/** Demande de palier supérieur : accord à cocher, une seule clé d'idempotence par ouverture. */
function Demande({ vol, panneau, change }: { vol: Reponse; panneau: Panneau; change: (p: Panneau) => void }) {
  const cible = vol.palier_superieur!;
  const envoyer = async () => {
    change({ ...panneau, envoi: true, erreur: null });
    try {
      await ecrire('POST', '/abonnement/demandes-palier', { code_demande: cible.code, accord: true }, ReponseDemandePalier, panneau.cle);
      change({ ...panneau, envoi: false, erreur: null, accord: true, cle: '' });
    } catch (e) {
      change({ ...panneau, envoi: false, erreur: messageErreur(e) });
    }
  };
  return (
    <div data-bloc="demande">
      <label>
        <input type="checkbox" checked={panneau.accord} onChange={(ev) => change({ ...panneau, accord: ev.target.checked })} />
        {avec(e53.demande.accord, cible.nom_affiche)}
      </label>
      <button type="button" disabled={!panneau.accord || panneau.envoi} onClick={() => void envoyer()}>
        {panneau.envoi ? e53.demande.envoi : e53.demande.envoyer}
      </button>
      {panneau.erreur ? <p role="alert">{panneau.erreur}</p> : null}
    </div>
  );
}

function Contenu({ vol }: { vol: Reponse }) {
  const [panneau, setPanneau] = useState<Panneau | null>(null);
  const [fini, setFini] = useState(false);
  const href = lienPortail('abonnement');
  const envoye = panneau !== null && panneau.cle === '';
  return (
    <>
      <p>{avec(e53.palier, vol.palier.nom_affiche)}</p>
      <Jauge
        valeur={vol.utilise}
        maximum={vol.compris}
        libelle={abonnement.jauge.libelle}
        texteValeur={abonnement.jauge.valeur(String(vol.utilise), String(vol.compris))}
        estimation={abonnement.jauge.estimation(String(vol.prevision_fin_de_mois))}
      />
      <ul>
        {vol.alertes_bps.map((s) => (
          <li key={s}>{abonnement.jauge.seuilAtteint(String(s / BPS_PAR_POURCENT) + ' %')}</li>
        ))}
      </ul>
      {vol.depasse ? <p>{abonnement.jauge.depasse}</p> : null}
      {vol.proposer_choix && !fini ? (
        <div data-bloc="choix">
          <p>{e53.choix.intro}</p>
          <button type="button" onClick={() => { setFini(true); setPanneau(null); }}>{e53.choix.attendre}</button>
          {vol.palier_superieur ? (
            <button type="button" onClick={() => setPanneau({ cle: nouvelleCle(), accord: false, envoi: false, erreur: null })}>
              {e53.choix.demander}
            </button>
          ) : null}
        </div>
      ) : null}
      {panneau && !envoye && vol.palier_superieur ? <Demande vol={vol} panneau={panneau} change={setPanneau} /> : null}
      {envoye ? <p role="status">{avec(e53.demande.succes, vol.palier.nom_affiche)}</p> : null}
      {href ? <a href={href}>{abonnement.liens.portail_abonnement}</a> : <p>{e53.lien.contact}</p>}
    </>
  );
}

/** E53 : jauge de volume, demande de palier supérieur, lien vers le portail. */
export function Ecran() {
  const lecture = useLecture<Reponse>('/volume', schemaVolume);
  let contenu;
  if (lecture.etat === 'erreur') contenu = <EtatErreur message={e53.etats.erreur} />;
  else if (lecture.etat !== 'pret' || !lecture.donnees) contenu = <EtatChargement libelle={e53.etats.chargement} />;
  else contenu = <Contenu vol={lecture.donnees} />;
  return (
    <section>
      <h1>{e53.titre}</h1>
      {contenu}
    </section>
  );
}
