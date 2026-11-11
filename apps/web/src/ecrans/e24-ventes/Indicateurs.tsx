import { useState } from 'react';
import { z } from 'zod';
import { Indicateurs as SchemaIndicateurs } from '../../../../../packages/contrat/src/domaines/ventes-indicateurs.js';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { e24Ventes as t } from '../../../../../packages/textes/src/ecrans/e24-ventes.js';
import { EtatErreur } from '../../../../../packages/ui/src/composants/Etats.js';
import { Indicateur } from '../../../../../packages/ui/src/composants/Indicateur.js';
import { useLecture } from '../../donnees/lecture.js';

const CHEMIN_LISTE = '/factures/ventes';
const Reponse = z.object({ body: SchemaIndicateurs });

const lien = (mois: string, etat?: string) => {
  const q = new URLSearchParams({ mois });
  if (etat) q.set('etat', etat);
  return CHEMIN_LISTE + '?' + q.toString();
};

/** Rangée d'indicateurs du mois (E24) : jamais de chiffre en chargement ni en erreur. */
export function Indicateurs({ mois }: { mois: string }) {
  const [propositions, setPropositions] = useState(false);
  const moisLu = mois || new Date().toISOString().slice(0, 7);
  const q = new URLSearchParams({ mois: moisLu });
  if (propositions) q.set('avecPropositions', 'true');
  const lecture = useLecture('/ventes/indicateurs?' + q.toString(), Reponse);
  const coche = (
    <label>
      <input type="checkbox" checked={propositions} onChange={(e) => setPropositions(e.target.checked)} />
      {t.avecPropositions}
    </label>
  );
  let corps;
  if (lecture.etat === 'erreur') {
    corps = <EtatErreur message={t.erreurIndicateurs} />;
  } else if (lecture.etat === 'chargement' || !lecture.donnees) {
    corps = (
      <div role="status" aria-label={t.chargementIndicateurs}>
        {(['factureMois', 'resteAEncaisser', 'enRetard', 'tvaCollectee', 'tvaEnAttente'] as const).map((k) => (
          <Indicateur key={k} libelle={t.indicateurs[k]} montant={null} chargement />
        ))}
      </div>
    );
  } else {
    const d = lecture.donnees.body;
    const prov = { provisoire: d.provisoire || propositions, texteProvisoire: t.provisoire };
    const nonCalculee = 'nonCalculee' in d.tvaCollectee;
    const vide = d.chiffreAffaires.montantCentimes === 0 && d.aEncaisser.montantCentimes === 0 && d.enRetard.montantCentimes === 0;
    corps = (
      <>
        {nonCalculee ? <div role="status">{t.profilIncomplet}</div> : null}
        <Indicateur libelle={t.indicateurs.factureMois} montant={centimes(d.chiffreAffaires.montantCentimes)} href={lien(moisLu)} {...prov} />
        <Indicateur libelle={t.indicateurs.resteAEncaisser} montant={centimes(d.aEncaisser.montantCentimes)} href={lien(moisLu, 'a_encaisser')} {...prov} />
        <Indicateur libelle={t.indicateurs.enRetard} montant={centimes(d.enRetard.montantCentimes)} href={lien(moisLu, 'en_retard')} {...prov} />
        <div>{t.clientsEnRetard.replace('{n}', String(d.enRetard.clients))}</div>
        <Indicateur
          libelle={t.indicateurs.tvaCollectee}
          montant={'nonCalculee' in d.tvaCollectee ? null : centimes(d.tvaCollectee.montantCentimes)}
          texteAbsence={t.tvaNonCalculee}
          href={lien(moisLu)}
          {...prov}
        />
        <Indicateur
          libelle={t.indicateurs.tvaEnAttente}
          montant={nonCalculee ? null : centimes(d.tvaEnAttente.montantCentimes)}
          texteAbsence={t.tvaNonCalculee}
          href={lien(moisLu)}
          {...prov}
        />
        {vide ? <p>{t.aucuneVenteMois}</p> : null}
      </>
    );
  }
  return (
    <section aria-label={t.nomIndicateurs}>
      {coche}
      {corps}
    </section>
  );
}
