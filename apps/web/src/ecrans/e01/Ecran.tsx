import type { ReactNode } from 'react';
import { ReponseCompteurs } from '../../../../../packages/contrat/src/domaines/alertes.js';
import { ReponseExercices } from '../../../../../packages/contrat/src/domaines/plan.js';
import { ReponseTableauDeBord } from '../../../../../packages/contrat/src/domaines/tableau-de-bord.js';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { e01 } from '../../../../../packages/textes/src/ecrans/e01.js';
import { Anneau } from '../../../../../packages/ui/src/composants/Anneau.js';
import { Carte } from '../../../../../packages/ui/src/composants/Carte.js';
import { CarteAlerte } from '../../../../../packages/ui/src/composants/CarteAlerte.js';
import { EtatChargement, EtatErreur, EtatVide } from '../../../../../packages/ui/src/composants/Etats.js';
import { Montant } from '../../../../../packages/ui/src/composants/Montant.js';
import { formaterMontantAffiche } from '../../../../../packages/ui/src/format/affichage.js';
import { INTERVALLE_TABLEAU_DE_BORD_MS, useLectureInterrogee } from '../../donnees/interrogation.js';
import { useLecture } from '../../donnees/lecture.js';
import './e01.css';

const ALERTES_MAX = 3;
const INTERVALLE = { intervalleMs: INTERVALLE_TABLEAU_DE_BORD_MS };
const CODES = ['tresorerie', 'resultat', 'tva_impots', 'a_faire'] as const;
const remplir = (modele: string, n: string | number): string => modele.replace('{n}', String(n));
const mots: Record<string, string> = e01.mots;
const titres: Record<string, string> = e01.alertes.titres;

type Enveloppe = { code: string; etat: string; mot: string; donnees?: Record<string, unknown> | undefined };
type Eur = { centimes: number };
const eur = (v: unknown): Eur | undefined => (typeof v === 'object' && v !== null && 'centimes' in v ? (v as Eur) : undefined);
const montant = (v: Eur) => (
  <Montant centimes={centimes(v.centimes)} libelleNegatif={e01.montantNegatif.replace('{montant}', formaterMontantAffiche(centimes(v.centimes)))} />
);

/** Contenu d'un bloc : les montants sont ceux du serveur, tels quels. */
function contenu(b: Enveloppe | undefined, code: (typeof CODES)[number]): ReactNode {
  if (!b) return <p>{e01.mots.calcul_impossible}</p>;
  const d = b.donnees ?? {};
  if (b.etat === 'impossible') return <p>{b.mot === 'pieces_a_regarder' ? remplir(e01.mots.pieces_a_regarder, String(d['piecesEnDoute'])) : e01.mots.calcul_impossible}</p>;
  if (b.etat === 'vide') return <p>{mots['vide_' + code] ?? e01.mots.calcul_impossible}</p>;
  const mot = <p>{mots['ok_' + code] ?? ''}</p>;
  const principal = eur(d['tresorerie']) ?? eur(d['resultatProvisoire']);
  const attente = d['enAttente'] as { nombre: number; montant: Eur } | undefined;
  return (
    <>
      {mot}
      {principal ? <p>{montant(principal)}</p> : null}
      {attente ? <p>{remplir(e01.enAttente, attente.nombre)} {montant(attente.montant)}</p> : null}
    </>
  );
}

type Centre = { mot: 'vert' | 'orange' | 'rouge'; nombre: number; sur: number } | { mot: 'donnees_absentes' };
/** Le mot du centre doit être une couleur connue ; sinon la donnée est tenue pour absente. */
function centreDe(c: { mot: string; nombre?: number; sur?: number }): Centre {
  const { mot, nombre, sur } = c;
  return (mot === 'vert' || mot === 'orange' || mot === 'rouge') && nombre !== undefined && sur !== undefined ? { mot, nombre, sur } : { mot: 'donnees_absentes' };
}

function Contenu({ exercice }: { exercice: string }) {
  const tableau = useLectureInterrogee('/exercices/' + exercice + '/tableau-de-bord?vue=mois', ReponseTableauDeBord, INTERVALLE);
  const compteurs = useLectureInterrogee('/exercices/' + exercice + '/compteurs', ReponseCompteurs, INTERVALLE);
  if (tableau.etat === 'chargement') return <EtatChargement libelle={e01.etats.chargement} />;
  if (tableau.etat === 'erreur') return <EtatErreur message={tableau.erreur?.code === 'acces_refuse' ? e01.etats.acces : e01.etats.erreur} />;
  const t = tableau.donnees?.body;
  const cartes = compteurs.donnees?.body.alertesDuJour.cartes.slice(0, ALERTES_MAX) ?? [];
  const ouvertes = Object.values(compteurs.donnees?.body.parEntree ?? {}).reduce((s, c) => s + c.ouvertes, 0);
  return (
    <>
      {t ? <Anneau anneau={{ ...t.anneau, centre: centreDe(t.anneau.centre) }} textes={{ ...e01.anneau, colonnes: [...e01.anneau.colonnes] as [string, string, string] }} /> : null}
      <div className="e01-blocs">
        {CODES.map((code) => (
          <div key={code} className="e01-bloc">
            <Carte titre={e01.blocs[code]}>{contenu(t?.blocs.find((b) => b.code === code), code)}</Carte>
          </div>
        ))}
      </div>
      {cartes.length > 0 ? (
        <section className="e01-alertes" aria-label={e01.alertes.titre}>
          {cartes.map((a) => (
            <CarteAlerte key={a.id} alerte={{ id: a.id, gravite: a.gravite, titre: titres[a.titreCode] ?? e01.alertes.sansTitre, ...(a.echeanceLe ? { echeanceLe: a.echeanceLe } : {}) }}
              textes={{ ...e01.alertes, jours: String }} joursReport={[]} motifMin={0} />
          ))}
          <button type="button" className="axion-bouton axion-bouton--discret" onClick={() => window.dispatchEvent(new Event('ouvrir-cloche'))}>
            {remplir(e01.alertes.voirTout, ouvertes)}
          </button>
        </section>
      ) : null}
    </>
  );
}

/** Écran E01 : quatre blocs, anneau et alertes du jour ; un bloc en panne n'empêche pas les autres. */
export function Ecran() {
  const exercices = useLecture('/exercices', ReponseExercices);
  const ouvert = exercices.donnees?.body.filter((e) => e.statut === 'ouvert').sort((a, b) => (a.fin < b.fin ? 1 : -1))[0];
  let corps: ReactNode = <EtatChargement libelle={e01.etats.chargement} />;
  if (exercices.etat === 'erreur') corps = <EtatErreur message={e01.etats.erreur} />;
  else if (exercices.etat !== 'chargement') corps = ouvert ? <Contenu exercice={ouvert.id} /> : <EtatVide titre={e01.etats.videExercice} />;
  return (
    <section aria-labelledby="e01-titre">
      <h1 id="e01-titre">{e01.titre}</h1>
      <div aria-live="polite">{corps}</div>
    </section>
  );
}
