import { useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { DemandeVue } from '../../../../../packages/contrat/src/domaines/personnes.js';
import { ISSUES_PAR_DROIT } from '../../../../../packages/noyau/src/rgpd/types.js';
import { fr } from '../../../../../packages/textes/src/fr.js';
import { e50Personnes } from '../../../../../packages/textes/src/ecrans/e50-personnes.js';
import { Bouton } from '../../../../../packages/ui/src/composants/Bouton.js';
import { ErreurEcriture, ecrire, nouvelleCle } from '../../api.js';

const t = e50Personnes;
const Reponse = z.object({ body: DemandeVue });
const REFUS = ['refus_conservation', 'refus_gel'];
const CODES: Record<string, string> = {
  DEJA_TRAITEE: t.erreurs.dejaTraitee, TRANSITION_INTERDITE: t.erreurs.transitionInterdite, ISSUE_NON_PERMISE: t.erreurs.issueNonPermise,
  MOTIF_MANQUANT: t.erreurs.motifManquant, SOURCE_MANQUANTE: t.erreurs.sourceManquante,
};
const MIN = { minHeight: 24 };

/** Message d'une écriture refusée : code connu, sinon réseau coupé ou erreur générique. */
export const messageErreur = (err: unknown): string => {
  const e = err instanceof ErreurEcriture ? err : null;
  return (e && CODES[e.code]) || (e?.statut === 0 ? fr.erreurs.reseau : fr.erreurs.generique);
};

type Props = { demande: DemandeVue; surFerme: () => void; surTraitee: () => void };

/** Panneau « Traiter la demande » : issue, motif et source (refus), autres personnes. Le motif n'est jamais affiché ailleurs. */
export function TraiterDemande({ demande, surFerme, surTraitee }: Props) {
  const issues = ISSUES_PAR_DROIT[demande.type];
  const [issue, setIssue] = useState<string>(issues[0] ?? '');
  const [motif, setMotif] = useState('');
  const [source, setSource] = useState('');
  const [autres, setAutres] = useState(false);
  const [erreurs, setErreurs] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const enCours = useRef(false);
  const cle = useRef(nouvelleCle());
  const premier = useRef<HTMLSelectElement>(null);
  useEffect(() => premier.current?.focus(), []);
  const refus = REFUS.includes(issue);
  const avecAutres = demande.type === 'acces' || demande.type === 'portabilite';
  async function valider(e: FormEvent) {
    e.preventDefault();
    if (enCours.current) return;
    const manques = [...(refus && !motif.trim() ? [t.erreurs.motifManquant] : []), ...(refus && !source.trim() ? [t.erreurs.sourceManquante] : [])];
    setErreurs(manques);
    if (manques.length > 0) return;
    enCours.current = true;
    setEnvoi(true);
    const corps = { issue, ...(refus ? { motif: motif.trim(), source: source.trim() } : {}), ...(avecAutres ? { inclure_autres_personnes: autres } : {}) };
    try {
      await ecrire('POST', `/personnes/demandes/${encodeURIComponent(demande.id)}/traitement`, corps, Reponse, cle.current);
      surTraitee();
    } catch (err) {
      const e4 = err instanceof ErreurEcriture ? err : null;
      if (e4 && e4.statut >= 400 && e4.statut < 500) cle.current = nouvelleCle();
      setErreurs([messageErreur(err)]);
      enCours.current = false;
      setEnvoi(false);
    }
  }
  return (
    <form aria-labelledby="e50-traiter" onSubmit={valider} onKeyDown={(e) => e.key === 'Escape' && surFerme()}>
      <h3 id="e50-traiter">{t.traiter.titre}</h3>
      <p>{t.types[demande.type]}</p>
      <label>
        {t.traiter.issue}
        <select ref={premier} name="issue" value={issue} onChange={(e) => setIssue(e.target.value)} style={MIN}>
          {issues.map((i) => <option key={i} value={i}>{t.issues[i]}</option>)}
        </select>
      </label>
      {issue === 'a_effacer' ? <p>{t.aEffacerExplication}</p> : null}
      {refus ? (
        <>
          <label>
            {t.traiter.motif}
            <input name="motif" type="text" autoComplete="off" value={motif} onChange={(e) => setMotif(e.target.value)} style={MIN} />
          </label>
          <label>
            {t.traiter.source}
            <input name="source" type="text" autoComplete="off" value={source} onChange={(e) => setSource(e.target.value)} style={MIN} />
          </label>
        </>
      ) : null}
      {avecAutres ? (
        <label>
          <input name="autresPersonnes" type="checkbox" checked={autres} onChange={(e) => setAutres(e.target.checked)} />
          {t.traiter.autresPersonnes}
          <small>{t.traiter.autresPersonnesAide}</small>
        </label>
      ) : null}
      {erreurs.length > 0 ? (
        <ul role="alert">
          {erreurs.map((m) => <li key={m}>{m}</li>)}
        </ul>
      ) : null}
      <Bouton type="submit" desactive={envoi}>{t.traiter.valider}</Bouton>
      <Bouton variante="discret" onClick={surFerme}>{t.traiter.annuler}</Bouton>
    </form>
  );
}
