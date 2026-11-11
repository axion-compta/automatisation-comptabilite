import { z } from 'zod';
import { PieceDetail } from '../../../../../packages/contrat/src/domaines/pieces.js';
import { centimes } from '../../../../../packages/noyau/src/argent/index.js';
import { e08 } from '../../../../../packages/textes/src/ecrans/e08.js';
import { ChampLu } from '../../../../../packages/ui/src/composants/ChampLu.js';
import { EtatChargement, EtatErreur } from '../../../../../packages/ui/src/composants/Etats.js';
import { Montant } from '../../../../../packages/ui/src/composants/Montant.js';
import { useLecture } from '../../donnees/lecture.js';

const Reponse = z.object({ body: PieceDetail });
type Champ = PieceDetail['champs'][number];
type Mot = keyof typeof e08.mots;
const CHEMIN_LISTE = '/documents';
const CENT = 2;
const motDe = (m: string): Mot => (Object.hasOwn(e08.mots, m) ? (m as Mot) : 'a_verifier');
const dans = (table: Record<string, string>, cle: string): string => (Object.hasOwn(table, cle) ? table[cle]! : table['autre']!);

/** Points de base (« 1900 ») en texte (« 19 % ») par découpage de la chaîne, sans calcul. */
export function tauxEnTexte(pdb: string): string {
  if (!/^\d+$/.test(pdb)) return pdb;
  const s = pdb.padStart(CENT + 1, '0');
  const entier = s.slice(0, -CENT).replace(/^0+(?=\d)/, '');
  const fraction = s.slice(-CENT).replace(/0+$/, '');
  return (fraction === '' ? entier : `${entier},${fraction}`) + ' %';
}

function libelleChamp(nom: string): string {
  const [prefixe = '', pdb = ''] = nom.split('@');
  if (prefixe === 'ht' || prefixe === 'tva') return e08.prefixes[prefixe].replace('{taux}', tauxEnTexte(pdb));
  return dans(e08.champs, nom);
}

function Valeur({ c }: { c: Champ }) {
  return c.valeurCentimes === undefined ? <>{c.valeur}</> : <Montant centimes={centimes(c.valeurCentimes)} />;
}

function Fiche({ p }: { p: PieceDetail }) {
  const ligne = (nom: string, valeur: string) => (
    <>
      <dt>{nom}</dt>
      <dd>{valeur}</dd>
    </>
  );
  return (
    <>
      <h1>{p.nomNormalise}</h1>
      <p>{e08.prepare}</p>
      {p.sensible ? (
        <p role="status">{e08.protegee}</p>
      ) : (
        <dl>
          {p.champs.map((c) => (
            <ChampLu key={c.nom} libelle={libelleChamp(c.nom)} valeur={<Valeur c={c} />} mot={motDe(c.mot)} libelles={e08.mots} explication={e08.explication} />
          ))}
        </dl>
      )}
      <dl>
        {ligne(e08.resume.type, dans(e08.types, p.typePiece))}
        {ligne(e08.resume.etat, dans(e08.etatsPiece, p.etat))}
        {ligne(e08.resume.comptee, p.comptee ? e08.comptee : e08.nonComptee)}
        {p.motifNonComptee === undefined ? null : ligne(e08.resume.motif, dans(e08.motifs, p.motifNonComptee))}
      </dl>
      {p.motifsAVerifier.length === 0 ? null : (
        <section aria-label={e08.motifs.titre}>
          <h2>{e08.motifs.titre}</h2>
          <ul>
            {p.motifsAVerifier.map((m) => (
              <li key={m}>{dans(e08.motifs, m)}</li>
            ))}
          </ul>
        </section>
      )}
      <p>{e08.originaux}</p>
    </>
  );
}

function Lecture({ id }: { id: string }) {
  const lecture = useLecture('/pieces/' + encodeURIComponent(id), Reponse);
  if (lecture.etat === 'chargement') return <EtatChargement libelle={e08.etats.chargement} />;
  if (lecture.etat === 'erreur') return <EtatErreur message={lecture.erreur?.statut === 404 ? e08.etats.inconnue : e08.etats.erreur} />;
  return lecture.donnees ? <Fiche p={lecture.donnees.body} /> : <EtatErreur message={e08.etats.inconnue} />;
}

/** Écran E08 : fiche d'une pièce lue par `GET /pieces/{id}`, identifiant dans le paramètre de recherche `id`. */
export function Ecran() {
  const id = new URLSearchParams(window.location.search).get('id') ?? '';
  return (
    <section>
      {id === '' ? <EtatErreur message={e08.etats.inconnue} /> : <Lecture id={id} />}
      <p>
        <a href={CHEMIN_LISTE}>{e08.retour}</a>
      </p>
    </section>
  );
}
