// @vitest-environment jsdom
// Fiche L05-T53 : M04 « La discussion » en plein écran, retour vers la page précédente.
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { e25 } from '../../../../../../packages/textes/src/ecrans/e25.js';
import { creerRouteur } from '../../../socle/routeur.js';
import { route } from '../route.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  racine = null;
  document.body.innerHTML = '';
});

describe('m04', () => {
  it('la route déclare /discussion', () => {
    expect([route.id, route.chemin]).toEqual(['m04', '/discussion']);
  });
  it('m04-plein-ecran-et-retour', async () => {
    const histo = createMemoryHistory({ initialEntries: ['/mois', '/discussion'], initialIndex: 1 });
    const routeur = creerRouteur([route], histo);
    const hote = document.body.appendChild(document.createElement('div'));
    racine = createRoot(hote);
    await act(async () => void racine?.render(<RouterProvider router={routeur} />));
    expect(hote.querySelector('.m04-plein-ecran h1')?.textContent).toBe(e25.mobile.titre);
    expect(hote.querySelector('.m04-plein-ecran section.axion-discussion')).not.toBeNull();
    expect(hote.querySelectorAll('aside.colonne-discussion')).toHaveLength(0);
    const retour = [...hote.querySelectorAll('button')].find((b) => b.textContent === e25.mobile.retour) as HTMLElement;
    await act(async () => void retour.click());
    expect(histo.location.pathname).toBe('/mois');
    expect(hote.querySelector('.m04-plein-ecran')).toBeNull();
  });
});
