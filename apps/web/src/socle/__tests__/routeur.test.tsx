// @vitest-environment jsdom
// Fiche L01-T32 : routeur, écrans découverts, page en préparation.
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { socle } from '../../../../../packages/textes/src/ecrans/socle.js';
import { ecransDecouverts, verifierEcrans, type DefinitionEcran } from '../ecrans.js';
import { creerRouteur } from '../routeur.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let racine: Root | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  racine = null;
  document.body.innerHTML = '';
});

const def = (id: string, chemin: string, titre = 'Écran ' + id): DefinitionEcran => ({
  id,
  chemin,
  titre,
  groupe: 'menu',
  composant: () => <p data-testid={'ecran-' + id}>contenu {id}</p>,
});

async function afficher(ecrans: DefinitionEcran[], url: string): Promise<HTMLElement> {
  const routeur = creerRouteur(ecrans, createMemoryHistory({ initialEntries: [url] }));
  const hote = document.createElement('div');
  document.body.append(hote);
  racine = createRoot(hote);
  await act(async () => {
    racine?.render(<RouterProvider router={routeur} />);
  });
  return hote;
}

describe('verifierEcrans', () => {
  it('doublon-de-chemin-refuse', () => {
    expect(() => verifierEcrans([def('a', '/x'), def('b', '/x')])).toThrow('chemin en double');
    expect(() => verifierEcrans([def('a', '/x'), def('b', '/y')])).not.toThrow();
  });
  it('doublon-d-id-refuse', () => {
    expect(() => verifierEcrans([def('a', '/x'), def('a', '/y')])).toThrow('id en double');
  });
  it('chemin-sans-barre-refuse', () => {
    expect(() => verifierEcrans([def('a', 'x')])).toThrow('doit commencer par /');
  });
  it('chemin-reserve-refuse', () => {
    expect(() => creerRouteur([def('a', '/essai')])).toThrow('chemin en double');
    expect(() => creerRouteur([def('a', '/')])).toThrow('chemin en double');
  });
  it('chemin-vide-refuse', () => {
    expect(() => verifierEcrans([def('a', '')])).toThrow('doit commencer par /');
  });
  it('ordre-inverse-meme-verdict', () => {
    expect(() => verifierEcrans([def('b', '/y'), def('a', '/x')])).not.toThrow();
    expect(() => verifierEcrans([def('b', '/x'), def('a', '/x')])).toThrow('chemin en double');
  });
  it('ecrans-decouverts-valides', () => {
    expect(() => verifierEcrans(ecransDecouverts())).not.toThrow();
  });
  it('liste-vide-acceptee', async () => {
    expect(() => verifierEcrans([])).not.toThrow();
    const hote = await afficher([], '/');
    expect(hote.querySelector('h1')?.textContent).toBe(socle.accueil.titre);
    expect(hote.querySelectorAll('li a')).toHaveLength(0);
  });
});

describe('routeur', () => {
  it('route-inconnue-page-en-preparation', async () => {
    const hote = await afficher([def('a', '/a')], '/nexiste-pas');
    expect(hote.querySelector('h1')?.textContent).toBe(socle.enPreparation.titre);
    const lien = hote.querySelector('a');
    expect(lien?.getAttribute('href')).toBe('/');
  });
  it('accueil-liste-les-ecrans', async () => {
    const hote = await afficher([def('a', '/a', 'Alpha'), def('b', '/b', 'Beta')], '/');
    expect(hote.querySelector('h1')?.textContent).toBe(socle.accueil.titre);
    const liens = [...hote.querySelectorAll('li a')].map((l) => [l.textContent, l.getAttribute('href')]);
    expect(liens).toEqual([
      ['Alpha', '/a'],
      ['Beta', '/b'],
    ]);
  });
  it('route-d-un-ecran-rendue', async () => {
    const hote = await afficher([def('a', '/a'), def('b', '/b')], '/b');
    expect(hote.querySelector('[data-testid="ecran-b"]')?.textContent).toBe('contenu b');
    expect(hote.querySelector('[data-testid="ecran-a"]')).toBeNull();
  });
  it('essai-garde-son-ecran', async () => {
    const hote = await afficher([], '/essai');
    expect(hote.querySelector('h1')?.textContent).toBe('Écran de test');
  });
});
