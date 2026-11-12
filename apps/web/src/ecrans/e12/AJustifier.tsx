import { ReponseDemandes, type Demande } from '../../../../../packages/contrat/src/domaines/banque.js';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { demandeFacturesManquantes } from '../../../../../packages/textes/src/banque/mots.js';
import { e12 } from '../../../../../packages/textes/src/ecrans/e12.js';
import { EtatChargement, EtatErreur, EtatVide } from '../../../../../packages/ui/src/composants/Etats.js';
import { Montant } from '../../../../../packages/ui/src/composants/Montant.js';
import { formaterMontantAffiche } from '../../../../../packages/ui/src/format/affichage.js';
import { useLecture } from '../../donnees/lecture.js';

const CHEMIN = '/banque/demandes?etat=ouverte';
const REPONSES = Object.keys(e12.aJustifier.reponses) as (keyof typeof e12.aJustifier.reponses)[];
/** Nom de la contrepartie tiré de la clé du regroupement (« l:nom|type ») ; vide si la clé n'en porte pas. */
const nomDe = (cle: string): string => (cle.startsWith('l:') ? cle.slice(2).split('|')[0] ?? '' : '');
export const phrase = (d: Demande): string => {
  const total = formaterMontantAffiche(centimes(d.impactCentimes));
  if (d.codeQuestion === 'factures_manquantes') return demandeFacturesManquantes(d.nombre, nomDe(d.cle), total);
  return (d.nombre === 1 ? e12.aJustifier.unAQualifier : e12.aJustifier.aQualifier).replace('{nombre}', String(d.nombre)).replace('{total}', total);
};
/** Nombre de demandes ouvertes, pour l'onglet. */
export function useNombreDemandes(): number | undefined {
  return useLecture(CHEMIN, ReponseDemandes).donnees?.total;
}

/** Demandes ouvertes dans l'ordre de l'API ; les réponses prêtes sont affichées mais désactivées (écritures à venir). */
export function AJustifier({ surVoirLignes }: { surVoirLignes: (ligneIds: string[]) => void }) {
  const l = useLecture(CHEMIN, ReponseDemandes);
  if (l.etat === 'chargement') return <EtatChargement libelle={e12.etats.chargement} />;
  if (l.etat === 'erreur' || !l.donnees) return <EtatErreur message={e12.aJustifier.erreur} />;
  if (l.donnees.body.length === 0) return <EtatVide titre={e12.aJustifier.vide} />;
  return (
    <ul className="e12-demandes" aria-label={e12.aJustifier.liste}>
      {l.donnees.body.map((d) => (
        <li key={d.id} className="e12-demande">
          <p>{phrase(d)}</p>
          <p><Montant centimes={centimes(d.impactCentimes)} /></p>
          <div className="e12-reponses">
            {REPONSES.filter((r) => d.reponsesPretes.includes(r)).map((r) => (
              <button key={r} type="button" aria-disabled="true" onClick={(e) => e.preventDefault()}>
                {e12.aJustifier.reponses[r]} <small>({e12.aJustifier.bientot})</small>
              </button>
            ))}
          </div>
          <button type="button" aria-label={e12.aJustifier.voirLignesDe.replace('{demande}', phrase(d))} onClick={() => surVoirLignes(d.ligneIds)}>{e12.aJustifier.voirLignes}</button>
        </li>
      ))}
    </ul>
  );
}
