import { Link, Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import { useState } from 'react';
import { e25 } from '../../../../packages/textes/src/ecrans/e25.js';
import { socle } from '../../../../packages/textes/src/ecrans/socle.js';
import { Discussion } from '../chat/Discussion.js';
import { Palette } from '../commandes/Palette.js';
import { FournisseurDonnees } from '../donnees/lecture.js';
import { BandeauAcces } from './BandeauAcces.js';
import { BarreMobile } from './BarreMobile.js';
import { MENU_BUREAU, estActive } from './menu.js';
import './socle.css';

export const CHEMIN_DISCUSSION = '/discussion';
/** Écran technique d'essai (tests de pannes) : pas de colonne, son bouton « Envoyer » doit rester unique. */
const CHEMIN_ESSAI = '/essai';

/** Coque de l'application : menu de bureau, barre du bas (téléphone), zone principale, palette. */
export function Coque() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [replie, setReplie] = useState(false);
  const basculer = () => {
    // État en mémoire du composant seulement : rien n'est écrit dans le navigateur.
    setReplie(!replie);
  };
  return (
    <FournisseurDonnees>
      <div className="coque">
        <BandeauAcces />
        <main className="coque-principal">
          <Outlet />
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
        <nav className="menu-bureau" aria-label={socle.navigation.titre}>
          {MENU_BUREAU.map((e) => (
            <Link key={e.id} to={e.chemin} aria-current={estActive(e.chemin, pathname) ? 'page' : undefined}>
              {e.libelle}
            </Link>
          ))}
        </nav>
        <BarreMobile />
        <Palette onAller={(chemin) => void router.navigate({ to: chemin })} />
      </div>
    </FournisseurDonnees>
  );
}
