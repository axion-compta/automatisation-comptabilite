import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { EtatFinContrat } from '../../../../../packages/contrat/src/domaines/fin-contrat.js';
import { abonnement } from '../../../../../packages/textes/src/ecrans/abonnement.js';
import { e50 } from '../../../../../packages/textes/src/ecrans/e50.js';
import { EtatChargement, EtatErreur } from '../../../../../packages/ui/src/composants/Etats.js';
import { formaterDateAffiche } from '../../../../../packages/ui/src/format/affichage.js';
import { ecrire, ErreurEcriture, nouvelleCle } from '../../api.js';
import { useLecture } from '../../donnees/lecture.js';
import { lienPortail } from '../../socle/liens.js';

const t = e50.fin;
const LONGUEUR_MAX_MOTIF = 500;
const COURTE = 12;
const avec = (modele: string, valeurs: Record<string, string>): string => modele.replace(/\{(\w+)\}/g, (m, k: string) => valeurs[k] ?? m);
const messageErreur = (e: unknown): string => {
  const code = e instanceof ErreurEcriture ? e.code : '';
  return Object.hasOwn(abonnement.erreurs, code) ? (abonnement.erreurs as Record<string, string>)[code]! : e50.erreurs.generique;
};

/** Confirmation de l'accusé : focus piégé dans la boîte, Échap ferme. */
function Confirmation({ envoi, erreur, confirmer, fermer }: { envoi: boolean; erreur: string | null; confirmer: () => void; fermer: () => void }) {
  const idTitre = useId();
  const boite = useRef<HTMLDialogElement>(null);
  useEffect(() => boite.current?.querySelector('button')?.focus(), []);
  const clavier = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') return fermer();
    const b = [...(boite.current?.querySelectorAll('button:not(:disabled)') ?? [])] as HTMLElement[];
    if (ev.key === 'Tab' && document.activeElement === b[ev.shiftKey ? 0 : b.length - 1]) { ev.preventDefault(); b[ev.shiftKey ? b.length - 1 : 0]?.focus(); }
  };
  return (
    <dialog open role="dialog" aria-modal="true" aria-labelledby={idTitre} ref={boite} onKeyDown={clavier}>
      <h3 id={idTitre}>{e50.confirmation.titre}</h3>
      <p>{e50.confirmation.texte}</p>
      <button type="button" onClick={fermer}>{e50.confirmation.annuler}</button>
      <button type="button" disabled={envoi} onClick={confirmer}>{envoi ? e50.confirmation.envoi : e50.confirmation.confirmer}</button>
      {erreur ? <p role="alert">{erreur}</p> : null}
    </dialog>
  );
}

type Change = (e: EtatFinContrat) => void;
/** Envoi d'une écriture : attente et erreur par code ; vrai si elle a abouti. */
function useEnvoi(change: Change) {
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const lancer = async (chemin: string, corps: unknown, cle: string): Promise<boolean> => {
    setEnvoi(true);
    setErreur(null);
    try { change(await ecrire('POST', chemin, corps, EtatFinContrat, cle)); return true; }
    catch (e) { setErreur(messageErreur(e)); return false; }
    finally { setEnvoi(false); }
  };
  return { envoi, erreur, lancer, effacer: () => setErreur(null) };
}

/** Bloc gel : poser ou lever, motif obligatoire (jamais envoyé ailleurs qu'à la route). */
function Gel({ etat, change }: { etat: EtatFinContrat; change: Change }) {
  const [motif, setMotif] = useState('');
  const { envoi, erreur, lancer } = useEnvoi(change);
  const actif = etat.gel.actif;
  const envoyer = async () => {
    if (await lancer(actif ? '/fin-contrat/gel/levee' : '/fin-contrat/gel', { motif: motif.trim() }, nouvelleCle())) setMotif('');
  };
  return (
    <div data-bloc="gel">
      <h3>{e50.gel.titre}</h3>
      {actif ? <p>{e50.gel.actif}</p> : null}
      <label>{e50.gel.motif}<textarea value={motif} maxLength={LONGUEUR_MAX_MOTIF} onChange={(ev) => setMotif(ev.target.value)} /></label>
      <p>{avec(e50.gel.compteur, { n: String(motif.length), max: String(LONGUEUR_MAX_MOTIF) })}</p>
      <button type="button" disabled={motif.trim() === '' || envoi} onClick={() => void envoyer()}>{actif ? e50.gel.lever : e50.gel.poser}</button>
      {erreur ? <p role="alert">{erreur}</p> : null}
    </div>
  );
}

function Remis({ etat, change }: { etat: EtatFinContrat; change: Change }) {
  const empreinte = etat.manifeste_empreinte ?? '';
  const [entiere, setEntiere] = useState(false);
  const [cle, setCle] = useState<string | null>(null);
  const { envoi, erreur, lancer, effacer } = useEnvoi(change);
  const confirmer = async () => {
    if (cle !== null && (await lancer('/fin-contrat/accuse', { manifeste_empreinte: empreinte }, cle))) setCle(null);
  };
  return (
    <>
      <p>{avec(t.empreinte, { empreinte: entiere ? empreinte : empreinte.slice(0, COURTE) })}</p>
      <button type="button" aria-expanded={entiere} onClick={() => setEntiere((v) => !v)}>{entiere ? t.masquerEmpreinte : t.voirEmpreinte}</button>
      <button type="button" onClick={() => { effacer(); setCle(nouvelleCle()); }}>{t.accuser}</button>
      {cle !== null ? <Confirmation envoi={envoi} erreur={erreur} confirmer={() => void confirmer()} fermer={() => setCle(null)} /> : null}
    </>
  );
}

function Corps({ etat, change }: { etat: EtatFinContrat; change: Change }) {
  const href = lienPortail('fin_contrat');
  if (etat.statut === 'aucune') return href ? <a href={href}>{t.demander}</a> : <p>{t.contact}</p>;
  const gele = etat.gel.actif || etat.gel_console;
  return (
    <>
      {etat.statut === 'preavis' && etat.date_fin ? <p>{avec(t.preavis, { date: formaterDateAffiche(etat.date_fin) })}</p> : null}
      {etat.statut === 'remis' ? <Remis etat={etat} change={change} /> : null}
      {etat.statut === 'accuse' && gele ? <p>{t.effacementSuspendu}</p> : null}
      {etat.statut === 'accuse' && !gele && etat.efface_prevu_le ? <p>{avec(t.effacement, { date: formaterDateAffiche(etat.efface_prevu_le) })}</p> : null}
      <p>{t.conservation}</p>
      <Gel etat={etat} change={change} />
    </>
  );
}

/** Section « fin de contrat » de l'écran E50. */
export function FinDeContrat() {
  const lecture = useLecture('/fin-contrat', EtatFinContrat);
  const [maj, setMaj] = useState<EtatFinContrat | null>(null);
  const etat = maj ?? lecture.donnees;
  let contenu;
  if (lecture.etat === 'erreur') contenu = <EtatErreur message={e50.etats.erreur} />;
  else if (!etat) contenu = <EtatChargement libelle={e50.etats.chargement} />;
  else contenu = <Corps etat={etat} change={setMaj} />;
  return <section aria-labelledby="e50-fin"><h2 id="e50-fin">{t.titre}</h2>{contenu}</section>;
}
