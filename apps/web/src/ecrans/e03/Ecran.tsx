import { useEffect, useState } from 'react';
import { ReponsePieces } from '../../../../../packages/contrat/src/domaines/pieces.js';
import type { ResultatDepot } from '../../../../../packages/contrat/src/domaines/depot.js';
import { e03 } from '../../../../../packages/textes/src/ecrans/e03.js';
import { EtatChargement, EtatErreur } from '../../../../../packages/ui/src/composants/Etats.js';
import { ZoneDepot, type CanalDepot } from '../../../../../packages/ui/src/composants/ZoneDepot.js';
import { formaterDateAffiche } from '../../../../../packages/ui/src/format/affichage.js';
import { deposer, lire } from '../../api.js';
import { VisiteGuidee } from '../../socle/VisiteGuidee.js';

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
  const [totalPieces, setTotalPieces] = useState<number | null>(null);
  useEffect(() => {
    // Total inconnu (lecture en échec) : la visite reste cachée.
    lire('/pieces?limite=1&decalage=0', ReponsePieces).then(
      (r) => setTotalPieces(r.total),
      () => setTotalPieces(null),
    );
  }, []);
  const recues = resultats.filter((r): r is Extract<ResultatDepot, { statut: 'recue' }> => r.statut === 'recue');
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
      <VisiteGuidee nombrePieces={totalPieces === null ? null : totalPieces + recues.length} {...(recues[0] ? { idPiece: recues[0].id } : {})} />
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
