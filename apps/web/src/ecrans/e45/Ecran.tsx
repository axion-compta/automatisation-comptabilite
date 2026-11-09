import { z } from 'zod';
import { ReponseProfil, type ChampProfilV1 } from '../../../../../packages/contrat/src/domaines/profil.js';
import { ReponseRegimesTva } from '../../../../../packages/contrat/src/domaines/regimes.js';
import { e45 } from '../../../../../packages/textes/src/ecrans/e45.js';
import { profilCodes } from '../../../../../packages/textes/src/ecrans/profil-codes.js';
import { ChampSource } from '../../../../../packages/ui/src/composants/ChampSource.js';
import { EtatChargement, EtatErreur, EtatVide } from '../../../../../packages/ui/src/composants/Etats.js';
import type { SchemaLecture } from '../../api.js';
import { useLecture } from '../../donnees/lecture.js';
import { route as routeN03 } from '../n03/route.js';

type Profil = z.infer<typeof ReponseProfil>;
type Regimes = z.infer<typeof ReponseRegimesTva>;
const schemaProfil: SchemaLecture<Profil> = ReponseProfil;
const schemaRegimes: SchemaLecture<Regimes> = ReponseRegimesTva;

/** Clés obligatoires du profil, dans l'ordre d'affichage (liste de la spec 09). */
const OBLIGATOIRES = ['denomination', 'forme', 'siren', 'exercice_debut', 'exercice_fin', 'regime_tva', 'regime_imposition', 'tenue'];
const CLE_TVA = 'regime_tva';
const libelles = {
  statut: profilCodes.statuts,
  confiance: profilCodes.confiances,
  voirLaSource: e45.boutons.voirSource,
  vide: profilCodes.statuts.vide,
};

const intitule = (cle: string): string => (Object.hasOwn(e45.champs, cle) ? (e45.champs as Record<string, string>)[cle]! : cle);
const texte = (v: unknown): string => (typeof v === 'string' ? v : v === null || v === undefined ? '' : JSON.stringify(v));

/** Obligatoires d'abord (même absents), puis les autres dans l'ordre reçu. */
function ordonner(champs: readonly ChampProfilV1[]): (ChampProfilV1 | string)[] {
  const parCle = new Map(champs.map((c) => [c.cle, c]));
  const autres = champs.filter((c) => !OBLIGATOIRES.includes(c.cle));
  return [...OBLIGATOIRES.map((cle) => parCle.get(cle) ?? cle), ...autres];
}

function Ligne({ champ }: { champ: ChampProfilV1 | string }) {
  if (typeof champ === 'string') return <ChampSource intitule={intitule(champ)} valeur="" statut="vide" libelles={libelles} />;
  const source = champ.source ? { href: '/documents/' + encodeURIComponent(champ.source.ref), libelle: champ.source.ref } : null;
  return <ChampSource intitule={intitule(champ.cle)} valeur={texte(champ.valeur)} statut={champ.statut} confiance={champ.confiance} source={source} libelles={libelles} />;
}

/** Bandeau d'état : phrase du régime de TVA à confirmer d'abord, puis l'état et les blocages. */
function Bandeau({ profil }: { profil: Profil['body'] }) {
  const phrases = [
    ...(profil.aConfirmer.includes(CLE_TVA) ? [profilCodes.etats.regime_tva_a_confirmer] : []),
    profilCodes.phraseDeCode('etats', profil.etat),
    ...profil.blocages.map((b) => profilCodes.phraseDeCode('blocages', b)),
  ];
  return (
    <ul role="status" aria-label={e45.etat}>
      {phrases.map((p) => (
        <li key={p}>{p}</li>
      ))}
    </ul>
  );
}

/** Bloc TVA : tant que le régime n'est pas confirmé, aucun montant. */
function BlocTva({ profil, regimes }: { profil: Profil['body']; regimes: Regimes['body'] }) {
  const champ = profil.champs.find((c) => c.cle === CLE_TVA);
  const confirme = champ?.statut === 'confirme' && regimes[0]?.statut === 'confirme';
  return (
    <section data-bloc="tva" aria-labelledby="e45-tva">
      <h2 id="e45-tva">{e45.tva.titre}</h2>
      {confirme ? <p>{e45.tva.regime + ' : ' + regimes[0]?.regime}</p> : <p>{profilCodes.etats.tva_non_calculee}</p>}
    </section>
  );
}

/** E45 : profil de l'entreprise en lecture seule. */
export function Ecran() {
  const profil = useLecture<Profil>('/profil', schemaProfil);
  const regimes = useLecture<Regimes>('/profil/regimes/tva', schemaRegimes);
  let contenu;
  if (profil.etat === 'erreur' || regimes.etat === 'erreur') contenu = <EtatErreur message={e45.erreur} />;
  else if (profil.etat === 'chargement' || regimes.etat === 'chargement') contenu = <EtatChargement libelle={e45.chargement} />;
  else if (!profil.donnees || !regimes.donnees || profil.donnees.body.champs.length === 0) contenu = <EtatVide titre={e45.vide} />;
  else {
    const p = profil.donnees.body;
    contenu = (
      <>
        <Bandeau profil={p} />
        {ordonner(p.champs).map((c) => (
          <Ligne key={typeof c === 'string' ? c : c.cle} champ={c} />
        ))}
        <BlocTva profil={p} regimes={regimes.donnees.body} />
        <a href={routeN03.chemin}>{e45.annees}</a>
      </>
    );
  }
  return (
    <section>
      <h1>{e45.titre}</h1>
      {contenu}
    </section>
  );
}
