import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { chat } from '../../../../packages/textes/src/ecrans/chat.js';
import { usePreference } from '../donnees/preferences.js';

export type EtatChat = 'reduit' | 'normal' | 'elargi' | 'plein';
const ETATS: EtatChat[] = ['reduit', 'normal', 'elargi', 'plein'];
const MIN_PCT = 20;
const MAX_PCT = 50;
const PAS_PCT = 5;
const borner = (n: number): number => Math.min(MAX_PCT, Math.max(MIN_PCT, n));

/** Largeur CSS de chaque état : 56 px, 380 px, pourcentage choisi (50 % au plus), pleine largeur. */
export function largeurDe(etat: EtatChat, pct: number): string {
  if (etat === 'reduit') return '56px';
  if (etat === 'normal') return '380px';
  if (etat === 'plein') return '100%';
  return `${borner(pct)}%`;
}

/**
 * Panneau du chat. L'état est mémorisé par appareil (usePreference). Sans choix de la personne :
 * `elargi` au premier lancement, `normal` une fois l'installation guidée terminée.
 */
export function PanneauChat({ children, installationTerminee = false }: { children?: ReactNode; installationTerminee?: boolean }) {
  const [choisi, ecrireEtat] = usePreference<EtatChat>('chat_etat');
  const [pctChoisi, ecrirePct] = usePreference<number>('chat_largeur_pct');
  const etat: EtatChat = choisi && ETATS.includes(choisi) ? choisi : installationTerminee ? 'normal' : 'elargi';
  const pct = borner(pctChoisi ?? MAX_PCT);
  const regler = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    ecrirePct(borner(pct + (e.key === 'ArrowRight' ? PAS_PCT : -PAS_PCT)));
  };
  return (
    <aside data-testid="panneau-chat" data-etat={etat} aria-label={chat.panneau.nom} style={{ width: largeurDe(etat, pct) }}>
      <div role="toolbar" aria-label={chat.panneau.nom}>
        {ETATS.filter((e) => e !== etat).map((e) => (
          <button key={e} type="button" onClick={() => ecrireEtat(e)}>
            {chat.panneau.etats[e]}
          </button>
        ))}
      </div>
      {etat === 'elargi' && (
        <div role="separator" aria-orientation="vertical" aria-label={chat.panneau.poignee} aria-valuemin={MIN_PCT} aria-valuemax={MAX_PCT} aria-valuenow={pct} tabIndex={0} onKeyDown={regler} />
      )}
      {etat !== 'reduit' && <div>{children}</div>}
    </aside>
  );
}

/** Une source de l'omnibarre (recherche, conversations) : titres à afficher dans son groupe. */
export type Source = { nom: string; groupe: 'recherche' | 'conversations'; chercher: (q: string) => Promise<string[]> };
type Resultat = { groupe: Source['groupe']; titres: string[] };

/** Appelle toutes les sources en parallèle, assemble les groupes ; une source en panne n'efface pas les autres. */
export function Omnibarre({ sources }: { sources: Source[] }) {
  const [groupes, setGroupes] = useState<Resultat[]>([]);
  const [pannes, setPannes] = useState<string[]>([]);
  const [lance, setLance] = useState(false);
  const rang = useRef(0);
  const saisir = async (q: string) => {
    const moi = ++rang.current;
    if (q.trim() === '') return (setGroupes([]), setPannes([]), setLance(false));
    const reponses = await Promise.allSettled(sources.map((s) => s.chercher(q)));
    if (moi !== rang.current) return;
    const ok: Resultat[] = [];
    const ko: string[] = [];
    reponses.forEach((r, i) => {
      const s = sources[i]!;
      if (r.status === 'rejected') ko.push(s.nom);
      else if (r.value.length > 0) ok.push({ groupe: s.groupe, titres: r.value });
    });
    setGroupes(ok);
    setPannes(ko);
    setLance(true);
  };
  return (
    <div>
      <label>
        {chat.omnibarre.etiquette}
        <input type="search" onChange={(e) => void saisir(e.target.value)} />
      </label>
      <div role="status">
        {pannes.map((nom) => (
          <p key={nom}>{chat.omnibarre.sourceEnPanne.replace('{nom}', nom)}</p>
        ))}
        {lance && groupes.length === 0 && pannes.length === 0 && <p>{chat.omnibarre.rien}</p>}
      </div>
      {groupes.map((g) => (
        <section key={g.groupe}>
          <h3>{chat.omnibarre.groupes[g.groupe]}</h3>
          <ul>
            {g.titres.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
