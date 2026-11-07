import { Link, Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import { socle } from '../../../../packages/textes/src/ecrans/socle.js';
import { Palette } from '../commandes/Palette.js';
import { FournisseurDonnees } from '../donnees/lecture.js';
import { BarreMobile } from './BarreMobile.js';
import { MENU_BUREAU, estActive } from './menu.js';
import './socle.css';

/** Coque de l'application : menu de bureau, barre du bas (téléphone), zone principale, palette. */
export function Coque() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <FournisseurDonnees>
      <div className="coque">
        <main className="coque-principal">
          <Outlet />
        </main>
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
