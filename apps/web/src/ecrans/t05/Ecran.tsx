import { useState } from 'react';
import { z } from 'zod';
import { t05 } from '../../../../../packages/textes/src/ecrans/t05.js';
import { TermeSchema } from '../../../../../packages/contrat/src/domaines/calendrier.js';
import { validerPreference } from '../../../../../packages/noyau/src/preferences/valider.js';
import { EtatChargement, EtatErreur } from '../../../../../packages/ui/src/composants/Etats.js';
import { useLecture } from '../../donnees/lecture.js';
import { FournisseurPreferences, usePreference } from '../../donnees/preferences.js';
import './t05.css';

type Mode = 'simple' | 'comptable';
type Raccourcis = { actifs: boolean; remap: Record<string, string> };
type Resume = { actif: boolean; heure: string };
const MODES: Mode[] = ['simple', 'comptable'];
const CATEGORIES = ['a_valider', 'echeance', 'urgent', 'cabinet'] as const;
const HEURE_PAR_DEFAUT = '08:00';
const NB_TERMES = 3;
/** Termes montrés d'abord : ceux dont le mot change selon le mode (le reste suit dans l'ordre du serveur). */
const TERMES_PRIORITAIRES = ['resultat'];
const priorite = (code: string) => Number(!TERMES_PRIORITAIRES.includes(code));
const SchemaVocabulaire = z.object({ body: z.array(TermeSchema) });

function Apercu({ mode }: { mode: Mode }) {
  const lecture = useLecture('/vocabulaire?mode=' + mode, SchemaVocabulaire);
  if (lecture.etat === 'chargement') return <EtatChargement libelle={t05.etats.chargement} />;
  if (lecture.etat === 'erreur' || !lecture.donnees) return <EtatErreur message={t05.etats.erreur} />;
  return <ul data-vocabulaire={mode}>{[...lecture.donnees.body].sort((a, b) => priorite(a.code) - priorite(b.code)).slice(0, NB_TERMES).map((t) => <li key={t.code}>{t.mot}</li>)}</ul>;
}

/** La coque ne monte pas encore FournisseurPreferences : l'écran embarque le sien (à retirer quand la coque le fournit). */
export const Ecran = () => <FournisseurPreferences><Preferences /></FournisseurPreferences>;

function Preferences() {
  const [modeBrut, ecrireMode] = usePreference<Mode>('mode');
  const [raccBrut, ecrireRacc] = usePreference<Raccourcis>('raccourcis');
  const [catBrut, ecrireCat] = usePreference<string[]>('notif_categories');
  const [resumeBrut, ecrireResume] = usePreference<Resume>('resume_email');
  const [usageBrut, ecrireUsage] = usePreference<string>('usage_mesure');
  const [brouillon, setBrouillon] = useState<string | null>(null);
  const [heureInvalide, setHeureInvalide] = useState(false);
  const mode = modeBrut ?? 'simple';
  const racc = raccBrut ?? { actifs: true, remap: {} };
  const categories = catBrut ?? [...CATEGORIES];
  const resume = resumeBrut ?? { actif: true, heure: HEURE_PAR_DEFAUT };

  function changerHeure(heure: string) {
    setBrouillon(heure);
    try {
      validerPreference('resume_email', { actif: resume.actif, heure }, 'tous');
    } catch {
      return setHeureInvalide(true);
    }
    setHeureInvalide(false);
    ecrireResume({ ...resume, heure });
  }
  const basculer = (code: string) => ecrireCat(categories.includes(code) ? categories.filter((c) => c !== code) : [...categories, code]);

  return (
    <div className="axion-t05">
      <h1>{t05.titre}</h1>
      <section aria-labelledby="t05-affichage">
        <h2 id="t05-affichage">{t05.affichage.titre}</h2>
        <fieldset>
          <legend>{t05.affichage.mode}</legend>
          {MODES.map((m) => (
            <label key={m}>
              <input type="radio" name="t05-mode" checked={mode === m} onChange={() => ecrireMode(m)} />
              {t05.affichage[m]}
            </label>
          ))}
        </fieldset>
        <p className="axion-t05__aide">{t05.affichage.aide}</p>
        <h3>{t05.affichage.apercu}</h3>
        <Apercu mode={mode} />
      </section>
      <section aria-labelledby="t05-clavier">
        <h2 id="t05-clavier">{t05.clavier.titre}</h2>
        <label>
          <input type="checkbox" checked={racc.actifs} onChange={(e) => ecrireRacc({ ...racc, actifs: e.target.checked })} />
          {t05.clavier.raccourcis}
        </label>
      </section>
      <section aria-labelledby="t05-notifications">
        <h2 id="t05-notifications">{t05.notifications.titre}</h2>
        <fieldset>
          <legend>{t05.notifications.categories}</legend>
          {CATEGORIES.map((c) => (
            <label key={c}>
              <input type="checkbox" checked={categories.includes(c)} onChange={() => basculer(c)} />
              {t05.notifications[c]}
            </label>
          ))}
        </fieldset>
        <label>
          <input type="checkbox" checked={resume.actif} onChange={(e) => ecrireResume({ ...resume, actif: e.target.checked })} />
          {t05.notifications.resume}
        </label>
        <p className="axion-t05__aide">{t05.notifications.resumeAide}</p>
        <label>
          {t05.notifications.heure}
          <input type="text" inputMode="numeric" value={brouillon ?? resume.heure} aria-invalid={heureInvalide} onChange={(e) => changerHeure(e.target.value)} />
        </label>
        {heureInvalide && <p role="alert">{t05.notifications.heureInvalide}</p>}
      </section>
      <section aria-labelledby="t05-usage">
        <h2 id="t05-usage">{t05.usage.titre}</h2>
        <label>
          <input type="checkbox" checked={usageBrut !== 'desactivee'} onChange={(e) => ecrireUsage(e.target.checked ? 'active' : 'desactivee')} />
          {t05.usage.mesure}
        </label>
        <p className="axion-t05__aide">{t05.usage.description}</p>
      </section>
    </div>
  );
}
