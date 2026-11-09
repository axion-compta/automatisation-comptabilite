import type { ReactNode } from 'react';
import { ReponseFrais, type FraisResume } from '../../../../../packages/contrat/src/domaines/frais.js';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { e12 } from '../../../../../packages/textes/src/ecrans/e12.js';
import { e17 } from '../../../../../packages/textes/src/ecrans/e17.js';
import { e17Frais } from '../../../../../packages/textes/src/ecrans/e17-frais.js';
import { fr } from '../../../../../packages/textes/src/fr.js';
import { EtatChargement, EtatErreur, EtatVide } from '../../../../../packages/ui/src/composants/Etats.js';
import { Carte } from '../../../../../packages/ui/src/composants/Carte.js';
import { Montant } from '../../../../../packages/ui/src/composants/Montant.js';
import { Pastille, type EtatPastille } from '../../../../../packages/ui/src/composants/Pastille.js';
import { Tableau } from '../../../../../packages/ui/src/composants/Tableau.js';
import { formaterMontantAffiche } from '../../../../../packages/ui/src/format/affichage.js';
import { useLecture } from '../../donnees/lecture.js';

const DIXIEMES_PAR_KM = 10;
const CHEMIN_DETAIL = '/factures/frais/detail?id=';
const CLASSE_GRISEE = 'e17-ligne--grisee';
const STYLE_GRISE = { color: 'var(--couleur-texte-discret)' } as const;

const MANQUES: Record<string, string> = { justificatif: e17.manques.justificatif, motif_perte: e17.manques.motifPerte, motif_trajet: e17.manques.motifTrajet, depart_arrivee: e17.manques.departArrivee, vehicule: e17.manques.vehicule, carte_grise: e17.manques.carteGrise, montant_illisible: e17.manques.montantIllisible, date_illisible: e17.manques.dateIllisible };
const STATUTS: Record<string, { etat: EtatPastille; mot: string }> = {
  propose: { etat: 'attente', mot: e17.statuts.propose },
  valide: { etat: 'ok', mot: e17.statuts.valide },
  rembourse: { etat: 'ok', mot: e17.statuts.rembourse },
  en_compte_courant: { etat: 'ok', mot: e17.statuts.enCompteCourant },
};

/** Une phrase : ce qui manque, dans l'ordre reçu. */
function phraseManque(f: FraisResume): string {
  const m = f.manque?.[0];
  if (m === undefined) return '';
  if (m === 'payeur') return e17.payeur.question.replace('{montant}', formaterMontantAffiche(centimes(f.montantTtcCentimes)));
  return MANQUES[m] ?? '';
}

function Etat({ f }: { f: FraisResume }) {
  if (f.statut === 'exclu_paye_societe') return <Pastille etat="bloque" libelle={e17.totaux.exclus} />;
  if (f.statut === 'a_completer') return <Pastille etat="attente" libelle={e17.totaux.enAttente} />;
  const s = STATUTS[f.statut];
  return s ? <Pastille etat={s.etat} libelle={s.mot} /> : null;
}

const Cellule = ({ f, children }: { f: FraisResume; children: ReactNode }) =>
  f.statut === 'exclu_paye_societe' ? <span className={CLASSE_GRISEE} style={STYLE_GRISE}>{children}</span> : <>{children}</>;

/** Écran E17 : liste des frais et trajets, trois totaux séparés jamais additionnés (lecture seule). */
export function Ecran() {
  const lecture = useLecture('/frais', ReponseFrais);
  let contenu: ReactNode;
  if (lecture.etat === 'chargement') contenu = <EtatChargement libelle={fr.etats.chargement} />;
  else if (lecture.etat === 'erreur' || !lecture.donnees) contenu = <EtatErreur message={fr.erreurs.generique} />;
  else if (lecture.etat === 'vide') contenu = <EtatVide titre={e17.vide} />;
  else {
    const { body, totaux } = lecture.donnees;
    const km = totaux.kmSansMontantDixiemes / DIXIEMES_PAR_KM;
    contenu = (
      <>
        <Carte titre={e17.totaux.aRembourser}><Montant centimes={centimes(totaux.aRembourserCentimes)} /></Carte>
        <Carte titre={e17.totaux.enAttente}><Montant centimes={centimes(totaux.enAttenteCentimes)} /></Carte>
        <Carte titre={e17.totaux.exclus}><Montant centimes={centimes(totaux.exclusCentimes)} /></Carte>
        {km > 0 ? <p>{e17.totaux.kmSansMontant.replace('{km}', km.toLocaleString('fr-FR'))}</p> : null}
        <Tableau
          legende={e17.titre}
          colonnes={[
            { cle: 'date', entete: e17Frais.champs.date, rendu: (f: FraisResume) => <Cellule f={f}>{f.date}</Cellule> },
            { cle: 'libelle', entete: e12.tableau.libelle, rendu: (f: FraisResume) => <Cellule f={f}><a href={CHEMIN_DETAIL + encodeURIComponent(f.id)}>{f.libelle}</a></Cellule> },
            { cle: 'montant', entete: e17Frais.champs.montant, alignement: 'droite', rendu: (f: FraisResume) => <Cellule f={f}><Montant centimes={centimes(f.montantTrajetCentimes ?? f.montantTtcCentimes)} /></Cellule> },
            { cle: 'etat', entete: e17Frais.champs.etat, rendu: (f: FraisResume) => <Cellule f={f}><Etat f={f} /><div>{f.statut === 'exclu_paye_societe' ? e17.payeParEntreprise : phraseManque(f)}</div></Cellule> },
          ]}
          lignes={body}
          cleDeLigne={(f) => f.id}
        />
      </>
    );
  }
  return (
    <section aria-labelledby="e17-titre">
      <h1 id="e17-titre">{e17.titre}</h1>
      {contenu}
    </section>
  );
}
