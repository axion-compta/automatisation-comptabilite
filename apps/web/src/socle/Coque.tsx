import { Link, Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { e25 } from '../../../../packages/textes/src/ecrans/e25.js';
import { socle } from '../../../../packages/textes/src/ecrans/socle.js';
import { Discussion } from '../chat/Discussion.js';
import { LETTRES_PAR_DEFAUT, installerLettres } from '../commandes/lettres.js';
import { Palette, ouvrirPalette } from '../commandes/Palette.js';
import { FournisseurDonnees } from '../donnees/lecture.js';
import { FournisseurPreferences, usePreference } from '../donnees/preferences.js';
import { BandeauAcces } from './BandeauAcces.js';
import { BarreMobile } from './BarreMobile.js';
import { Cloche } from './Cloche.js';
import { Compteur, useCompteursMenu } from './Compteur.js';
import { PorteAcceptation } from './PorteAcceptation.js';
import { MENU_BUREAU, estActive } from './menu.js';
import './socle.css';

export const CHEMIN_DISCUSSION = '/discussion';
/** Écran technique d'essai (tests de pannes) : pas de colonne, son bouton « Envoyer » doit rester unique. */
const CHEMIN_ESSAI = '/essai';

function BoutonCloche({ ouvert, surBasculer }: { ouvert: boolean; surBasculer: () => void }) {
  return (
    <button type="button" className="coque-cloche" aria-haspopup="dialog" aria-expanded={ouvert} onClick={surBasculer}>
      {socle.cloche}
    </button>
  );
}

/** Coque de l'application : menu de bureau, barre du bas (téléphone), zone principale, palette. */
export function Coque() {
  return (
    <FournisseurDonnees>
      <FournisseurPreferences>
        <CoqueInterne />
      </FournisseurPreferences>
    </FournisseurDonnees>
  );
}

function CoqueInterne() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [replie, setReplie] = useState(false);
  const [clocheOuverte, setClocheOuverte] = useState(false);
  const { exercice, parEntree } = useCompteursMenu();
  useEffect(() => {
    const ouvrir = () => setClocheOuverte(true);
    window.addEventListener('ouvrir-cloche', ouvrir);
    return () => window.removeEventListener('ouvrir-cloche', ouvrir);
  }, []);
  const [racc] = usePreference<{ actifs: boolean; remap: Record<string, string> }>('raccourcis');
  const [menuEtat, ecrireMenuEtat] = usePreference<'ouvert' | 'reduit'>('menu_etat');
  const reduit = menuEtat === 'reduit';
  const reglage = useRef(racc);
  reglage.current = racc;
  useEffect(() => {
    const lettre = (action: keyof typeof LETTRES_PAR_DEFAUT): string => reglage.current?.remap[action] ?? LETTRES_PAR_DEFAUT[action];
    const actions = { [lettre('cloche')]: () => setClocheOuverte(true), [lettre('recherche')]: ouvrirPalette };
    return installerLettres(window, { actifs: () => reglage.current?.actifs !== false, actions });
  }, []);
  const basculer = () => {
    // État en mémoire du composant seulement : rien n'est écrit dans le navigateur.
    setReplie(!replie);
  };
  return (
    <>
      <div className="coque">
        <BandeauAcces />
        {exercice ? <BoutonCloche ouvert={clocheOuverte} surBasculer={() => setClocheOuverte(!clocheOuverte)} /> : null}
        {exercice ? <Cloche exercice={exercice} ouvert={clocheOuverte} surFermer={() => setClocheOuverte(false)} /> : null}
        <main className="coque-principal">
          <PorteAcceptation><Outlet /></PorteAcceptation>
        </main>
        {pathname !== CHEMIN_DISCUSSION && pathname !== CHEMIN_ESSAI && (
          <aside className="colonne-discussion" data-replie={replie ? 'oui' : 'non'}>
            <button type="button" className="colonne-bascule" aria-expanded={!replie} aria-controls="colonne-discussion-corps" onClick={basculer}>
              {e25.titre}
            </button>
            <div id="colonne-discussion-corps" hidden={replie}>
              <Discussion onOuvrirVue={() => void router.navigate({ to: '/' })} />
            </div>
          </aside>
        )}
        <div className="menu-groupe" data-etat={reduit ? 'reduit' : 'ouvert'}>
          <button type="button" className="menu-reduire" aria-pressed={reduit} onClick={() => ecrireMenuEtat(reduit ? 'ouvert' : 'reduit')}>
            {reduit ? socle.navigation.agrandir : socle.navigation.reduire}
          </button>
          <nav className="menu-bureau" aria-label={socle.navigation.titre}>
            {MENU_BUREAU.map((e) => (
              <Link key={e.id} to={e.chemin} aria-current={estActive(e.chemin, pathname) ? 'page' : undefined}>
                {e.libelle}
                <Compteur compteur={parEntree[e.id]} />
              </Link>
            ))}
          </nav>
        </div>
        <BarreMobile compteurs={parEntree} />
        <Palette onAller={(chemin) => void router.navigate({ to: chemin })} />
      </div>
    </>
  );
}
