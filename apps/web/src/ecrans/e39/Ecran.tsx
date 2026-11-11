import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { ReponseProfil, type ChampProfilV1 } from '../../../../../packages/contrat/src/domaines/profil.js';
import { e39 } from '../../../../../packages/textes/src/ecrans/e39.js';
import { profilCodes } from '../../../../../packages/textes/src/ecrans/profil-codes.js';
import { ChampSource } from '../../../../../packages/ui/src/composants/ChampSource.js';
import { EtatChargement, EtatErreur, EtatVide } from '../../../../../packages/ui/src/composants/Etats.js';
import { ecrire, nouvelleCle, type SchemaLecture } from '../../api.js';
import { useLecture } from '../../donnees/lecture.js';

type Profil = z.infer<typeof ReponseProfil>['body'];
const schemaProfil: SchemaLecture<z.infer<typeof ReponseProfil>> = ReponseProfil;
const reponseChamp: SchemaLecture<unknown> = z.object({ body: z.unknown() });

const libelles = { statut: profilCodes.statuts, confiance: profilCodes.confiances, voirLaSource: e39.boutons.voirSource, vide: profilCodes.statuts.vide };
const intitule = (cle: string): string => (Object.hasOwn(e39.champs, cle) ? (e39.champs as Record<string, string>)[cle]! : cle);
const texte = (v: unknown): string => (typeof v === 'string' ? v : v === null || v === undefined ? '' : JSON.stringify(v));
const aConfirmer = (c: ChampProfilV1) => c.statut === 'a_confirmer';

function Ligne({ champ }: { champ: ChampProfilV1 }) {
  const source = champ.source ? { href: '/documents/' + encodeURIComponent(champ.source.ref), libelle: champ.source.ref } : null;
  return <ChampSource intitule={intitule(champ.cle)} valeur={texte(champ.valeur)} statut={champ.statut} confiance={champ.confiance} source={source} libelles={libelles} />;
}

/** Clés ayant deux valeurs (ou plus) à confirmer en même temps : jamais devinées. */
function contradictions(champs: readonly ChampProfilV1[]): Map<string, ChampProfilV1[]> {
  const parCle = new Map<string, ChampProfilV1[]>();
  for (const c of champs.filter(aConfirmer)) parCle.set(c.cle, [...(parCle.get(c.cle) ?? []), c]);
  return new Map([...parCle].filter(([, v]) => v.length > 1));
}

/** E39 : récapitulatif du profil, une seule validation. */
export function Ecran() {
  const profil = useLecture<z.infer<typeof ReponseProfil>>('/profil', schemaProfil);
  const client = useQueryClient();
  const [choix, setChoix] = useState<Record<string, number>>({});
  const [refus, setRefus] = useState(false);
  const [fini, setFini] = useState(false);
  const idValidation = useRef(nouvelleCle());

  if (profil.etat === 'erreur') return <EtatErreur message={e39.erreur} />;
  if (profil.etat === 'chargement' || !profil.donnees) return <EtatChargement libelle={e39.chargement} />;
  const p: Profil = profil.donnees.body;
  if (p.champs.length === 0) return <EtatVide titre={e39.vide} />;

  if (p.blocages.length > 0) {
    return (
      <section>
        <h1>{e39.titre}</h1>
        <h2>{e39.blocage.titre}</h2>
        <ul role="alert">
          {p.blocages.map((b) => (
            <li key={b}>{profilCodes.phraseDeCode('blocages', b)}</li>
          ))}
        </ul>
      </section>
    );
  }

  const conflits = contradictions(p.champs);
  const manque = [...conflits.keys()].some((k) => choix[k] === undefined);
  const enTete = p.champs.filter(aConfirmer);
  const reste = p.champs.filter((c) => !aConfirmer(c));
  const jour = new Date().toISOString().slice(0, 10);

  async function valider(): Promise<void> {
    setRefus(false);
    const id = idValidation.current;
    const cles = [...new Set(p.champs.filter(aConfirmer).map((c) => c.cle))];
    try {
      for (const cle of cles) {
        const base = '/profil/champs/' + encodeURIComponent(cle);
        const options = conflits.get(cle);
        if (options) {
          const retenu = options[choix[cle]!]!;
          await ecrire('POST', base, { valeur: retenu.valeur, origine: 'saisie_personne', effetDebut: jour }, reponseChamp, id + ':v:' + cle);
        }
        await ecrire('POST', base + '/confirmer', { effetDebut: jour }, reponseChamp, id + ':c:' + cle);
      }
    } catch {
      setRefus(true);
      return;
    }
    idValidation.current = nouvelleCle();
    setFini(true);
    await client.invalidateQueries({ queryKey: ['lecture', '/profil'] });
  }

  return (
    <section>
      <h1>{e39.titre}</h1>
      <p>{e39.mention}</p>
      <p>{e39.intro}</p>
      {refus ? <p role="alert">{e39.refus}</p> : null}
      {fini ? <p role="status">{e39.valide}</p> : null}
      {[...conflits].map(([cle, options]) => (
        <fieldset key={cle} data-conflit={cle}>
          <legend>{intitule(cle) + ' : ' + e39.contradiction.consigne}</legend>
          {options.map((o, i) => (
            <label key={i}>
              <input type="radio" name={'choix-' + cle} checked={choix[cle] === i} onChange={() => setChoix({ ...choix, [cle]: i })} />
              {texte(o.valeur)}
            </label>
          ))}
        </fieldset>
      ))}
      {[...enTete.filter((c) => !conflits.has(c.cle)), ...reste].map((c) => (
        <Ligne key={c.cle + ':' + texte(c.valeur)} champ={c} />
      ))}
      <button type="button" disabled={manque} onClick={() => void valider()}>
        {e39.boutons.valider}
      </button>
    </section>
  );
}
