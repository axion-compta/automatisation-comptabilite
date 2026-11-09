import { ReponseCouverture, ReponseTrous, type TrouReleve } from '../../../../../packages/contrat/src/domaines/banque.js';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { alerteReleveManquant } from '../../../../../packages/textes/src/banque/mots.js';
import { e12 } from '../../../../../packages/textes/src/ecrans/e12.js';
import { EtatChargement, EtatErreur } from '../../../../../packages/ui/src/composants/Etats.js';
import { Pastille, type EtatPastille } from '../../../../../packages/ui/src/composants/Pastille.js';
import { formaterMontantAffiche } from '../../../../../packages/ui/src/format/affichage.js';
import { useLecture } from '../../donnees/lecture.js';

const FORME: Record<keyof typeof e12.couverture.etats, EtatPastille> = { couvert: 'ok', partiel: 'attente', manquant: 'bloque' };
const nomMois = (m: string): string => e12.couverture.mois[Number(m.slice(5, 7)) - 1] ?? m;
const rang = (iso: string): number => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;

/** Mois (en toutes lettres) touchés par un trou, du début à la fin ; période inversée : le mois de début seul. */
function moisDuTrou(t: TrouReleve): string[] {
  const fin = Math.max(rang(t.debut), rang(t.fin));
  return Array.from({ length: fin - rang(t.debut) + 1 }, (_, k) => e12.couverture.mois[(rang(t.debut) + k) % 12] ?? '');
}

function Bandeau({ trous }: { trous: TrouReleve[] }) {
  if (trous.length === 0) return null;
  return (
    <div className="e12-bandeau" role="status">
      {trous.map((t) => (
        <p key={t.id}>
          {alerteReleveManquant(moisDuTrou(t).join(e12.couverture.separateur + ' '))}
          {t.ecartCentimes === undefined ? '' : ' ' + e12.couverture.ecart.replace('{montant}', formaterMontantAffiche(centimes(t.ecartCentimes)))}
        </p>
      ))}
    </div>
  );
}

/** Frise de couverture des relevés du compte, avec la même information en liste de texte. */
export function Couverture({ compteId }: { compteId: string }) {
  const couv = useLecture('/banque/comptes/' + encodeURIComponent(compteId) + '/couverture', ReponseCouverture);
  const trous = useLecture('/banque/trous?etat=ouvert', ReponseTrous);
  if (couv.etat === 'chargement') return <EtatChargement libelle={e12.etats.chargement} />;
  if (couv.etat === 'erreur' || !couv.donnees) return <EtatErreur message={e12.couverture.erreur} />;
  const mois = couv.donnees.body.mois;
  const ouverts = (trous.donnees?.body ?? []).filter((t) => t.compteId === compteId && t.etat === 'ouvert');
  return (
    <section aria-labelledby="e12-couverture-titre" className="e12-couverture">
      <h2 id="e12-couverture-titre">{e12.couverture.titre}</h2>
      <Bandeau trous={ouverts} />
      <ol className="e12-frise" aria-hidden="true">
        {mois.map((m) => (
          <li key={m.mois} className="e12-frise-mois">
            <span>{nomMois(m.mois)}</span>
            <Pastille etat={FORME[m.etat]} libelle={e12.couverture.etats[m.etat]} />
          </li>
        ))}
      </ol>
      <ul className="e12-frise-texte" aria-label={e12.couverture.liste}>
        {mois.map((m) => (
          <li key={m.mois}>{e12.couverture.ligne.replace('{mois}', nomMois(m.mois)).replace('{annee}', m.mois.slice(0, 4)).replace('{etat}', e12.couverture.etats[m.etat])}</li>
        ))}
      </ul>
    </section>
  );
}
