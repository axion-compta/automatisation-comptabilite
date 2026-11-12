// Panneau Discussion (E25, fiche L05-T52) : saisie, Stop, étapes, cartes, propositions, toast, « Pourquoi ? ».
import { useRef, useState, type KeyboardEvent } from 'react';
import { e25 } from '../../../../packages/textes/src/ecrans/e25.js';
import { Bouton } from '../../../../packages/ui/src/composants/Bouton.js';
import type { EtatCarteAction } from '../../../../packages/ui/src/composants/CarteAction.js';
import { ToastAnnulation } from '../../../../packages/ui/src/composants/ToastAnnulation.js';
import { annulerProposition, appliquerProposition, arreterTour, ecouterTour, ErreurLecture, lirePourquoi, nouvelleCle } from '../api.js';
import type { Evenement } from '../../../../packages/contrat/src/chat/evenements.js';
import { analyser, COMMANDES } from '../commandes/barre-oblique.js';
import { arreter, envoyer, ETAT_INITIAL, reduire, type EtatConversation } from './etat.js';
import { MessageDiscussion, type ReponsePourquoi } from './Message.js';
import './discussion.css';

export type DiscussionProps = { societe?: string; onOuvrirVue: () => void; dureeAnnulationMs?: number };
const ERREUR_PAR_STATUT: Record<number, keyof typeof e25.erreurs> = { 403: 'acteur_non_humain', 409: 'proposition_expiree', 423: 'niveau_ferme' };
const SOCIETE_DEFAUT = 'societe_fictive';
const sansModele = (code?: string) => code === 'ia_indisponible' || code?.startsWith('budget_') === true;

export function Discussion({ societe, onOuvrirVue, dureeAnnulationMs = 0 }: DiscussionProps) {
  const soc = societe ?? SOCIETE_DEFAUT;
  const [etat, setEtat] = useState<EtatConversation>(ETAT_INITIAL);
  const [saisie, setSaisie] = useState('');
  const [alerte, setAlerte] = useState('');
  const [etats, setEtats] = useState<Record<string, EtatCarteAction>>({});
  const [pourquoi, setPourquoi] = useState<Record<string, ReponsePourquoi>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const cours = useRef<{ controle: AbortController; messageId: string } | null>(null);
  const conversation = useRef(crypto.randomUUID());
  const dernierTexte = useRef('');
  const dernier = [...etat.messages].reverse().find((m) => m.auteur === 'axion');
  const modeSansModele = dernier?.auteur === 'axion' && sansModele(dernier.tour.erreur);

  async function lancer(texte: string, nouveau: boolean) {
    const demande = { message_id: crypto.randomUUID(), conversation_id: societe ? `${conversation.current}:${societe}` : conversation.current, texte, puces: [], canal: 'clavier' as const };
    const controle = new AbortController();
    [cours.current, dernierTexte.current] = [{ controle, messageId: demande.message_id }, texte];
    setAlerte('');
    setEnCours(true);
    setEtat((e) => ({ ...(nouveau ? envoyer(e, texte) : e), dernierId: -1 }));
    let dernierId = 0;
    try {
      for (let essai = 0; essai < 2; essai++) {
        const r = await ecouterTour(soc, demande, { surEvenement: (ev: Evenement) => setEtat((e) => reduire(e, ev)), signal: controle.signal, ...(essai > 0 ? { dernierId } : {}) });
        dernierId = r.dernierId;
        if (r.fin !== 'coupe') break;
      }
    } catch { setAlerte(e25.erreurs.hors_schema.message); }
    if (cours.current?.messageId === demande.message_id) { cours.current = null; setEnCours(false); setEtat((e) => (e.tourEnCours ? arreter(e) : e)); }
  }

  function soumettre() {
    const t = saisie.trim();
    const a = analyser(t);
    if (t === '' || enCours) return;
    if (a !== null && 'inconnue' in a) return setAlerte(e25.commandeInconnue.replace('{nom}', a.inconnue));
    setSaisie('');
    void lancer(t, true);
  }
  function stop() {
    const c = cours.current;
    if (c) { c.controle.abort(); setEtat(arreter); void arreterTour(soc, c.messageId).catch(() => undefined); }
  }
  async function appliquer(id: string) {
    await appliquerProposition(soc, id, nouvelleCle()).then(
      () => (setEtats((s) => ({ ...s, [id]: 'appliquee' })), setToast(id)),
      (e: unknown) => setAlerte(e25.erreurs[(e instanceof ErreurLecture && ERREUR_PAR_STATUT[e.statut]) || 'hors_schema'].message),
    );
  }
  async function annulerToast() {
    const id = toast;
    setToast(null);
    if (id !== null) await annulerProposition(soc, id, nouvelleCle()).then(() => setEtats((s) => ({ ...s, [id]: 'expiree' })), () => setAlerte(e25.erreurs.annulation_expiree.message));
  }
  const surTouche = (e: KeyboardEvent) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), soumettre());
  const actions = {
    etats, pourquoi, enCours, onOuvrirVue,
    onAppliquer: (id: string) => void appliquer(id),
    // Refuser range la carte dans « Plus tard » : elle reste affichée, rien n'est supprimé.
    onRefuser: (id: string) => setEtats((s) => ({ ...s, [id]: 'plus_tard' })),
    onModifier: (id: string) => setEtats((s) => ({ ...s, [id]: 'modification' })),
    onRouvrir: (id: string) => setEtats((s) => ({ ...s, [id]: 'a_valider' })),
    onPourquoi: (id: string) => void lirePourquoi(soc, id).then((r) => setPourquoi((p) => ({ ...p, [id]: r })), () => setAlerte(e25.pourquoi.nonDisponible)),
    onChoix: (code: string) => void lancer(code, true),
    onRegenerer: () => void lancer(dernierTexte.current, false),
    onCopier: (t: string) => void navigator.clipboard?.writeText(t).catch(() => undefined),
  };
  return (
    <section className="axion-discussion" aria-label={e25.titre}>
      <div className="axion-discussion__fil" role="log" aria-live="polite">
        {etat.messages.map((m, i) => <MessageDiscussion key={i} message={m} actions={actions} />)}
        {etat.tourEnCours && <MessageDiscussion message={{ auteur: 'axion', tour: etat.tourEnCours }} actions={actions} />}
      </div>
      {modeSansModele && (
        <div role="status" className="axion-discussion__sans-modele">
          <p>{e25.modeSansModele}</p>
          <p>{e25.commandesDisponibles}</p>
          {COMMANDES.map((c) => <Bouton key={c.nom} variante="discret" onClick={() => setSaisie(`/${c.nom} `)}>{c.nom}</Bouton>)}
        </div>
      )}
      {toast !== null && <ToastAnnulation key={toast} dureeMs={dureeAnnulationMs} libelleAnnuler={e25.toast.annuler} texteRestant={(n) => (n > 1 ? e25.toast.secondesRestantes : e25.toast.secondeRestante).replace('{n}', String(n))} onAnnuler={() => void annulerToast()} onFin={() => setToast(null)} />}
      {alerte !== '' && <p role="alert">{alerte}</p>}
      <div className="axion-discussion__saisie">
        <label htmlFor="axion-discussion-saisie">{e25.saisie.libelle}</label>
        <textarea id="axion-discussion-saisie" value={saisie} placeholder={e25.saisie.indication} onChange={(e) => setSaisie(e.target.value)} onKeyDown={surTouche} />
        {enCours ? <Bouton variante="discret" onClick={stop}>{e25.stop}</Bouton> : <Bouton onClick={soumettre}>{e25.envoyer}</Bouton>}
      </div>
    </section>
  );
}
