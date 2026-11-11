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
const E = t.erreurs;
const CODES: Record<string, string> = { DEJA_TRAITEE: E.dejaTraitee, TRANSITION_INTERDITE: E.transitionInterdite, ISSUE_NON_PERMISE: E.issueNonPermise, MOTIF_MANQUANT: E.motifManquant, SOURCE_MANQUANTE: E.sourceManquante };
export const messageErreur = (err: unknown): string => {
  const e = err instanceof ErreurEcriture ? err : null;
  return (e && CODES[e.code]) || (e?.statut === 0 ? fr.erreurs.reseau : fr.erreurs.generique);
};
/** Panneau « Traiter la demande » (le motif n'est jamais affiché ailleurs). */
export function TraiterDemande({ demande, surFerme, surTraitee }: { demande: DemandeVue; surFerme: () => void; surTraitee: () => void }) {
  const issues = ISSUES_PAR_DROIT[demande.type];
  const [issue, setIssue] = useState<string>(issues[0] ?? '');
  const [texte, setTexte] = useState({ motif: '', source: '' });
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
    const manques = refus ? [...(texte.motif.trim() ? [] : [E.motifManquant]), ...(texte.source.trim() ? [] : [E.sourceManquante])] : [];
    setErreurs(manques);
    if (manques.length > 0) return;
    enCours.current = true;
    setEnvoi(true);
    const corps = { issue, ...(refus ? { motif: texte.motif.trim(), source: texte.source.trim() } : {}), ...(avecAutres ? { inclure_autres_personnes: autres } : {}) };
    try {
      await ecrire('POST', `/personnes/demandes/${encodeURIComponent(demande.id)}/traitement`, corps, Reponse, cle.current);
      surTraitee();
    } catch (err) {
      if (err instanceof ErreurEcriture && err.statut >= 400 && err.statut < 500) cle.current = nouvelleCle();
      setErreurs([messageErreur(err)]);
      enCours.current = false;
      setEnvoi(false);
    }
  }
  return (
    <form aria-labelledby="e50-traiter" onSubmit={valider} onKeyDown={(e) => e.key === 'Escape' && surFerme()}>
      <h3 id="e50-traiter">{t.traiter.titre}</h3>
      <p>{t.types[demande.type]}</p>
      <label>{t.traiter.issue}<select ref={premier} name="issue" value={issue} onChange={(e) => setIssue(e.target.value)} style={{ minHeight: 24 }}>{issues.map((i) => <option key={i} value={i}>{t.issues[i]}</option>)}</select></label>
      {issue === 'a_effacer' ? <p>{t.aEffacerExplication}</p> : null}
      {refus ? (
        (['motif', 'source'] as const).map((n) => (
          <label key={n}>
            {t.traiter[n]}
            <input name={n} type="text" autoComplete="off" value={texte[n]} onChange={(e) => setTexte({ ...texte, [n]: e.target.value })} style={{ minHeight: 24 }} />
          </label>
        ))
      ) : null}
      {avecAutres ? <label><input name="autresPersonnes" type="checkbox" checked={autres} onChange={(e) => setAutres(e.target.checked)} />{t.traiter.autresPersonnes}<small>{t.traiter.autresPersonnesAide}</small></label> : null}
      {erreurs.length > 0 ? <ul role="alert">{erreurs.map((m) => <li key={m}>{m}</li>)}</ul> : null}
      <Bouton type="submit" desactive={envoi}>{t.traiter.valider}</Bouton><Bouton variante="discret" onClick={surFerme}>{t.traiter.annuler}</Bouton>
    </form>
  );
}
