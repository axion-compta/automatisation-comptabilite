import { useState } from 'react';
import type { ResultatDepot } from '../../../../../packages/contrat/src/domaines/depot.js';
import { e03 } from '../../../../../packages/textes/src/ecrans/e03.js';
import { EtatChargement, EtatErreur } from '../../../../../packages/ui/src/composants/Etats.js';
import { ZoneDepot, type CanalDepot } from '../../../../../packages/ui/src/composants/ZoneDepot.js';
import { formaterDateAffiche } from '../../../../../packages/ui/src/format/affichage.js';
import { deposer } from '../../api.js';

const CHEMIN_PIECE = '/documents/piece?id=';
const refus: Record<string, string> = e03.refus;

function Ligne({ r }: { r: ResultatDepot }) {
  if (r.statut === 'recue') {
    return <li>{e03.resultats.recue} <a href={CHEMIN_PIECE + encodeURIComponent(r.id)}>{e03.resultats.voir}</a></li>;
  }
  if (r.statut === 'deja_recue') return <li>{e03.resultats.dejaRecue.replace('{date}', formaterDateAffiche(r.recueLe.slice(0, 10)))}</li>;
  return <li>{e03.resultats.refusee.replace('{raison}', refus[r.code] ?? e03.resultats.refusInconnu)}</li>;
}

/** Écran E03 : dépôt de pièces, un résultat par fichier. L'écran ne lit aucun fichier : il les transmet. */
export function Ecran() {
  const [etat, setEtat] = useState<'repos' | 'envoi' | 'erreur'>('repos');
  const [resultats, setResultats] = useState<ResultatDepot[]>([]);
  function recevoir(fichiers: File[], canal: CanalDepot) {
    setEtat('envoi');
    setResultats([]);
    deposer(fichiers, canal).then(
      (liste) => {
        setResultats(liste);
        setEtat('repos');
      },
      () => setEtat('erreur'),
    );
  }
  return (
    <section aria-labelledby="e03-titre">
      <h1 id="e03-titre">{e03.titre}</h1>
      <ZoneDepot surFichiers={recevoir} libelles={e03.zone} desactive={etat === 'envoi'} />
      <p>{e03.conservation}</p>
      {etat === 'envoi' ? <EtatChargement libelle={e03.etats.envoi} /> : null}
      {etat === 'erreur' ? <EtatErreur message={e03.etats.erreur} /> : null}
      <ul role="status" aria-label={e03.resultats.titre}>
        {resultats.map((r, i) => <Ligne key={i} r={r} />)}
      </ul>
    </section>
  );
}
