import { ReponseFraisDetail, type FraisDetail } from '../../../../../packages/contrat/src/domaines/frais.js';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { e17Frais as t } from '../../../../../packages/textes/src/ecrans/e17-frais.js';
import { socle } from '../../../../../packages/textes/src/ecrans/socle.js';
import { EtatChargement, EtatErreur } from '../../../../../packages/ui/src/composants/Etats.js';
import { Montant } from '../../../../../packages/ui/src/composants/Montant.js';
import { useLecture } from '../../donnees/lecture.js';

const CHEMIN_LISTE = '/factures/frais';
const PAYEUR: Record<FraisDetail['payeur'], string> = { societe: t.valeurs.societe, personne: t.valeurs.vous, a_confirmer: t.valeurs.aConfirmer };

/** Dixièmes entiers affichés avec une décimale, par découpage de la chaîne (aucun flottant). */
function km(dixiemes: number): string {
  const s = String(dixiemes).padStart(2, '0');
  return s.slice(0, -1) + ',' + s.slice(-1);
}

function Ligne({ nom, children }: { nom: string; children: React.ReactNode }) {
  return (
    <>
      <dt>{nom}</dt>
      <dd>{children}</dd>
    </>
  );
}

function Detail({ f }: { f: FraisDetail }) {
  const c = t.champs;
  const tr = f.trajet;
  return (
    <dl>
      <Ligne nom={c.nature}>{f.libelle}</Ligne>
      <Ligne nom={c.date}>{f.date}</Ligne>
      {tr ? null : <Ligne nom={c.montant}><Montant centimes={centimes(f.montantTtcCentimes)} /></Ligne>}
      <Ligne nom={c.payePar}>{PAYEUR[f.payeur]}</Ligne>
      <Ligne nom={c.source}>{f.ligneBanqueId ? t.valeurs.releve : t.valeurs.declaration}</Ligne>
      <Ligne nom={c.etat}>{f.statut}</Ligne>
      {tr ? null : <Ligne nom={c.justificatif}>{f.pieceId ? t.valeurs.oui : t.valeurs.non}</Ligne>}
      {f.motifSansJustificatif ? <Ligne nom={c.motifPerte}>{f.motifSansJustificatif}</Ligne> : null}
      {f.partPersoTtcCentimes > 0 ? <Ligne nom={c.partPersonnelle}><Montant centimes={centimes(f.partPersoTtcCentimes)} /></Ligne> : null}
      {tr ? (
        <>
          <Ligne nom={c.depart}>{tr.depart}</Ligne>
          <Ligne nom={c.arrivee}>{tr.arrivee}</Ligne>
          <Ligne nom={c.motifTrajet}>{tr.motif}</Ligne>
          <Ligne nom={c.kmSaisis}>{km(tr.kmSaisisDixiemes)}</Ligne>
          {f.kmDixiemes === undefined ? null : <Ligne nom={c.kmRetenus}>{km(f.kmDixiemes)}</Ligne>}
          <Ligne nom={c.allerRetour}>{tr.allerRetour ? t.valeurs.oui : t.valeurs.non}</Ligne>
          {f.vehiculeId ? <Ligne nom={c.vehicule}>{f.vehiculeId}</Ligne> : null}
          <Ligne nom={c.montantTrajet}>
            {f.montantTrajetCentimes == null ? t.baremeAConfirmer : <Montant centimes={centimes(f.montantTrajetCentimes)} />}
          </Ligne>
        </>
      ) : null}
    </dl>
  );
}

function Lecture({ id }: { id: string }) {
  const lecture = useLecture('/frais/' + encodeURIComponent(id), ReponseFraisDetail);
  if (lecture.etat === 'chargement') return <EtatChargement libelle={socle.etats.chargement} />;
  if (lecture.etat === 'erreur') {
    const code = lecture.erreur?.code;
    return <EtatErreur message={code === 'introuvable' ? t.inconnu : code === 'acces_refuse' ? socle.etats.acces403 : socle.etats.erreurReseau} />;
  }
  return lecture.donnees ? <Detail f={lecture.donnees.body} /> : <p>{t.inconnu}</p>;
}

/** Écran E17 : détail d'un frais par paramètre de recherche `id` ; aucun appel sans identifiant. */
export function Ecran() {
  const id = new URLSearchParams(window.location.search).get('id') ?? '';
  return (
    <section aria-labelledby="e17-frais-titre">
      <h1 id="e17-frais-titre">{t.titre}</h1>
      {id === '' ? <p>{t.inconnu}</p> : <Lecture id={id} />}
      <p><a href={CHEMIN_LISTE}>{t.retour}</a></p>
    </section>
  );
}
