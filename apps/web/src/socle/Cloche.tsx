import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { JOURS_REPORT, ReponseAlertes } from '../../../../packages/contrat/src/domaines/alertes.js';
import { ReponseNotifications } from '../../../../packages/contrat/src/domaines/notifications.js';
import { t08 } from '../../../../packages/textes/src/ecrans/t08.js';
import { Bouton } from '../../../../packages/ui/src/composants/Bouton.js';
import { CarteAlerte } from '../../../../packages/ui/src/composants/CarteAlerte.js';
import { EtatChargement, EtatErreur } from '../../../../packages/ui/src/composants/Etats.js';
import { ErreurLecture } from '../api.js';
import { agirSurAlerte, marquerNotification, type ActionAlerte } from '../donnees/actions-alerte.js';
import { relireApresAction } from '../donnees/interrogation.js';
import { useLecture } from '../donnees/lecture.js';
import './cloche.css';

/** Réglages d'interface : durée du bouton « Annuler » (alignée sur le serveur) et taille minimale du motif. */
export const DELAI_ANNULATION_MS = 10_000;
export const MOTIF_MIN = 5;
const titres: Record<string, string> = t08.alertes.titres;
const FOCALISABLES = 'button:not([disabled]), input:not([disabled])';
const jours = (n: number): string => t08.alertes.jours.replace('{n}', String(n));
type Annulable = { id: string; version: number };
type PropsTiroir = { exercice: string; surFermer: () => void };

function Tiroir({ exercice, surFermer }: PropsTiroir) {
  const client = useQueryClient();
  const racine = '/exercices/' + encodeURIComponent(exercice);
  const alertes = useLecture(racine + '/alertes?etat=ouverte', ReponseAlertes);
  const notifications = useLecture('/notifications', ReponseNotifications);
  const [message, setMessage] = useState('');
  const [annulable, setAnnulable] = useState<Annulable | null>(null);
  const boite = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const avant = document.activeElement as HTMLElement | null;
    boite.current?.querySelector<HTMLElement>(FOCALISABLES)?.focus();
    return () => avant?.focus();
  }, []);
  useEffect(() => {
    if (!annulable) return;
    const minuterie = setTimeout(() => setAnnulable(null), DELAI_ANNULATION_MS);
    return () => clearTimeout(minuterie);
  }, [annulable]);

  async function agir(id: string, action: ActionAlerte, version: number, extra: { jours?: number; motif?: string } = {}) {
    try {
      const r = await agirSurAlerte(exercice, id, action, { ...extra, version }, client);
      setMessage(t08.messages[action === 'reporter' ? 'reportee' : action === 'ignorer' ? 'ignoree' : 'annulee']);
      setAnnulable(action === 'annuler' ? null : { id, version: r.body.version });
    } catch (e) {
      setAnnulable(null);
      if (e instanceof ErreurLecture && e.code === 'conflit') await relireApresAction(client, [racine + '/alertes']);
      setMessage(e instanceof ErreurLecture && e.code === 'conflit' ? t08.messages.conflit : t08.messages.erreur);
    }
  }
  const lire = (id: string) => void marquerNotification(id, client).catch(() => setMessage(t08.messages.erreur));

  function clavier(e: React.KeyboardEvent) {
    if (e.key === 'Escape') return void (e.stopPropagation(), surFermer());
    if (e.key !== 'Tab') return;
    const liste = [...(boite.current?.querySelectorAll<HTMLElement>(FOCALISABLES) ?? [])];
    const [sortie, entree] = e.shiftKey ? [liste[0], liste.at(-1)] : [liste.at(-1), liste[0]];
    if (document.activeElement !== sortie) return;
    e.preventDefault();
    entree?.focus();
  }
  const notes = notifications.donnees?.body ?? [];
  return (
    <div className="cloche" role="dialog" aria-modal="true" aria-labelledby="cloche-titre" ref={boite} onKeyDown={clavier}>
      <header className="cloche__entete"><h2 id="cloche-titre">{t08.titre}</h2><Bouton variante="discret" onClick={surFermer}>{t08.fermer}</Bouton></header>
      <div role="status" className="cloche__message">
        {message}
        {annulable ? <Bouton variante="discret" onClick={() => void agir(annulable.id, 'annuler', annulable.version)}>{t08.messages.annuler}</Bouton> : null}
      </div>
      <section aria-label={t08.alertes.titre}>
        <h3>{t08.alertes.titre}</h3>
        {alertes.etat === 'chargement' ? <EtatChargement libelle={t08.etats.chargement} /> : null}
        {alertes.etat === 'erreur' ? <EtatErreur message={t08.etats.erreur} /> : null}
        {alertes.etat === 'vide' ? <p>{t08.alertes.vide}</p> : null}
        {(alertes.donnees?.body ?? []).map((a) => (
          <CarteAlerte key={a.id} alerte={{ id: a.id, gravite: a.gravite, titre: titres[a.titreCode] ?? t08.alertes.sansTitre, ...(a.echeanceLe ? { echeanceLe: a.echeanceLe } : {}) }}
            textes={{ ...t08.alertes, jours }} joursReport={[...JOURS_REPORT]} motifMin={MOTIF_MIN}
            surReporter={(n) => void agir(a.id, 'reporter', a.version, { jours: n })} surIgnorer={(motif) => void agir(a.id, 'ignorer', a.version, { motif })} />
        ))}
      </section>
      <section aria-label={t08.notifications.titre}>
        <h3>{t08.notifications.titre}</h3>
        {notifications.etat === 'vide' ? <p>{t08.notifications.vide}</p> : null}
        {notes.length > 0 ? <Bouton variante="discret" onClick={() => lire('tout')}>{t08.notifications.toutLire}</Bouton> : null}
        <ul>
          {notes.map((n) => (
            <li key={n.id} className={n.lueLe ? 'cloche__lue' : 'cloche__non-lue'}>
              {titres[n.titreCode] ?? t08.alertes.sansTitre} <span>{n.lueLe ? t08.notifications.lue : t08.notifications.nonLue}</span>
              {n.lueLe ? null : <Bouton variante="discret" onClick={() => lire(n.id)}>{t08.notifications.lue}</Bouton>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Tiroir des alertes et notifications (T08) ; monté dans la coque par L15-T53. */
export function Cloche({ ouvert, ...reste }: PropsTiroir & { ouvert: boolean }) {
  return ouvert ? <Tiroir {...reste} /> : null;
}
