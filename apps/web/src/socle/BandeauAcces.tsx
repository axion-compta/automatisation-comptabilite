import { Acces } from '../../../../packages/contrat/src/domaines/acces.js';
import { abonnement } from '../../../../packages/textes/src/ecrans/abonnement.js';
import { BanniereAcces } from '../../../../packages/ui/src/composants/BanniereAcces.js';
import { formaterDateAffiche } from '../../../../packages/ui/src/format/affichage.js';
import { useLecture } from '../donnees/lecture.js';
import { lienPortail } from './liens.js';

/** Bandeau d'état d'accès : rien pendant le chargement, en cas d'erreur ou si l'accès est actif. */
export function BandeauAcces() {
  const lecture = useLecture('/acces', Acces);
  if (lecture.etat !== 'pret' || lecture.donnees === undefined) return null;
  const { etat, banniere, reprise } = lecture.donnees;
  if (banniere === null || etat === 'ACTIF') return null;
  const textes = abonnement.banniere[etat];
  const date = banniere.prochaine_etape_le;
  const lien = { libelle: abonnement.liens[banniere.lien], href: banniere.lien === 'portail_abonnement' ? lienPortail('abonnement') : null };
  const resume = reprise === null ? '' : abonnement.reprise(reprise.pieces_traitees);
  return (
    <BanniereAcces
      titre={textes.titre}
      consequence={textes.consequence}
      {...(date === null ? {} : { prochaineEtape: textes.prochaineEtape(formaterDateAffiche(date)) })}
      lien={lien}
      {...(resume === '' ? {} : { resume })}
      gravite={etat === 'SUSPENDU' || etat === 'RESILIE' ? 'attention' : 'info'}
    />
  );
}
