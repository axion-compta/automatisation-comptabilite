import { Link, useRouterState } from '@tanstack/react-router';
import { useState } from 'react';
import { socle } from '../../../../packages/textes/src/ecrans/socle.js';
import { ouvrirPalette } from '../commandes/Palette.js';
import { BARRE_MOBILE, MENU_PLUS, estActive } from './menu.js';

/** Barre du bas (téléphone) : 4 entrées + « Plus » (panneau), et le bouton « Discuter » toujours visible. */
export function BarreMobile() {
  const [plusOuvert, setPlusOuvert] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const courant = (chemin: string): 'page' | undefined => (estActive(chemin, pathname) ? 'page' : undefined);

  return (
    <div className="barre-mobile">
      <button type="button" className="barre-discuter" onClick={() => ouvrirPalette()}>
        {socle.discuter}
      </button>
      {plusOuvert && (
        <div className="barre-plus" id="barre-plus">
          {MENU_PLUS.map((e) => (
            <Link key={e.id} to={e.chemin} aria-current={courant(e.chemin)} onClick={() => setPlusOuvert(false)}>
              {e.libelle}
            </Link>
          ))}
        </div>
      )}
      <nav aria-label={socle.navigation.titre}>
        {BARRE_MOBILE.map((e) => (
          <Link key={e.id} to={e.chemin} aria-current={courant(e.chemin)}>
            {e.libelle}
          </Link>
        ))}
        <button type="button" aria-expanded={plusOuvert} aria-controls="barre-plus" onClick={() => setPlusOuvert(!plusOuvert)}>
          {socle.barre.plus}
        </button>
      </nav>
    </div>
  );
}
