// @vitest-environment jsdom
// Fiche L01-T46 : un seul <main> par page, posé par la coque.
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { demarrerNoeud } from '../../../../../packages/faux-serveur/src/noeud.js';
import { ecransDecouverts } from '../ecrans.js';
import { creerRouteur } from '../routeur.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let serveur: { fermer: () => void };
beforeAll(() => void (serveur = demarrerNoeud()));
afterAll(() => serveur.fermer());
let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  racine = null;
  document.body.innerHTML = '';
});

async function afficher(url: string): Promise<HTMLElement> {
  const routeur = creerRouteur(ecransDecouverts(), createMemoryHistory({ initialEntries: [url] }));
  const hote = document.body.appendChild(document.createElement('div'));
  racine = createRoot(hote);
  await act(async () => {
    racine?.render(<RouterProvider router={routeur} />);
  });
  await act(async () => void (await new Promise((r) => setTimeout(r, 100))));
  return hote;
}

describe('un seul main', () => {
  it('la découverte trouve les écrans n03, n04 et e44', () => {
    const ids = ecransDecouverts().map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(['n03', 'n04', 'e44']));
  });
  it('accueil : exactement un main', async () => {
    const hote = await afficher('/');
    expect(hote.querySelectorAll('main').length).toBe(1);
    expect(hote.querySelector('main h1')).not.toBeNull();
  });
  it('page en préparation : exactement un main', async () => {
    const hote = await afficher('/chemin-inconnu');
    expect(hote.querySelectorAll('main').length).toBe(1);
    expect(hote.querySelector('main h1')).not.toBeNull();
  });
  it.each(ecransDecouverts().map((e) => [e.id, e.chemin] as const))('écran %s : exactement un main', async (_id, chemin) => {
    const hote = await afficher(chemin);
    expect(hote.querySelectorAll('main').length).toBe(1);
    expect(hote.querySelector('main h1')).not.toBeNull();
  });
});
