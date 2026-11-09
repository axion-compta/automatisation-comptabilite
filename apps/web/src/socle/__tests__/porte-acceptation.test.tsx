// @vitest-environment jsdom
// Fiche L07-T30 : porte d'acceptation des documents contractuels.
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { demarrerNoeud } from '../../../../../packages/faux-serveur/src/noeud.js';
import { abonnement } from '../../../../../packages/textes/src/ecrans/abonnement.js';
import { acceptation } from '../../../../../packages/textes/src/ecrans/acceptation.js';
import type { DefinitionEcran } from '../ecrans.js';
import { creerRouteur } from '../routeur.js';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let racine: Root | null = null;
let serveur: { fermer: () => void } | null = null;
afterEach(() => {
  act(() => racine?.unmount());
  serveur?.fermer();
  racine = null;
  serveur = null;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const ecran = (id: string, chemin: string, texte: string): DefinitionEcran => ({ id, chemin, composant: () => <p id={id}>{texte}</p>, groupe: 'autre', titre: texte });
const ECRANS = [ecran('a', '/banque', 'Écran fictif banque'), ecran('d', '/reglages/donnees', 'Écran fictif données')];
const attendre = async (ms = 150): Promise<void> => {
  await act(async () => void (await new Promise((r) => setTimeout(r, ms))));
};

async function monter(scenario: string | null, url: string): Promise<HTMLElement> {
  serveur = demarrerNoeud(scenario === null ? {} : { scenarioAbonnement: scenario });
  const routeur = creerRouteur(ECRANS, createMemoryHistory({ initialEntries: [url] }));
  const hote = document.body.appendChild(document.createElement('div'));
  racine = createRoot(hote);
  await act(async () => {
    racine?.render(<RouterProvider router={routeur} />);
  });
  await attendre();
  return hote;
}
const principal = (h: HTMLElement): Element => h.querySelector('main') as Element;
const bouton = (h: HTMLElement): HTMLButtonElement => [...h.querySelectorAll('button')].find((b) => b.textContent === acceptation.bouton) as HTMLButtonElement;
const casea = (h: HTMLElement): HTMLInputElement => h.querySelector('input[type="checkbox"]') as HTMLInputElement;
const cliquer = (el: Element): void => {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
};

describe('porte d’acceptation', () => {
  it('rien-a-accepter-ecran-normal', async () => {
    const h = await monter('cgv=acceptees', '/banque');
    expect(principal(h).textContent).toBe('Écran fictif banque');
    expect(bouton(h)).toBeUndefined();
  });

  it('a-accepter-porte-affichee', async () => {
    const h = await monter('cgv=a_accepter', '/banque');
    expect(principal(h).querySelector('#a')).toBeNull();
    expect(principal(h).querySelector('h1')?.textContent).toBe(acceptation.titre);
    const t = principal(h).textContent ?? '';
    expect(t).toContain(acceptation.types['cgv']);
    expect(t).toContain(acceptation.version + ' 2');
    expect(t).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(t).toContain(acceptation.case);
  });

  it('mes-donnees-toujours-ouvert', async () => {
    const h = await monter('cgv=a_accepter', '/reglages/donnees');
    expect(principal(h).textContent).toBe('Écran fictif données');
  });

  it('bouton-desactive-sans-case', async () => {
    const h = await monter('cgv=a_accepter', '/banque');
    expect(bouton(h).disabled).toBe(true);
    cliquer(casea(h));
    expect(bouton(h).disabled).toBe(false);
    cliquer(casea(h));
    expect(bouton(h).disabled).toBe(true);
  });

  it('accepter-puis-ecran-demande', async () => {
    const h = await monter('cgv=a_accepter', '/banque');
    cliquer(casea(h));
    cliquer(bouton(h));
    await attendre(300);
    expect(principal(h).textContent).toBe('Écran fictif banque');
  });

  it('version-perimee-message-et-relecture', async () => {
    const h = await monter('cgv=a_accepter', '/banque');
    const vrai = fetch;
    let lectures = 0;
    vi.stubGlobal('fetch', (u: string | URL | Request, i?: RequestInit) => {
      if (i?.method === 'POST') return Promise.resolve(new Response(JSON.stringify({ code: 'VERSION_PERIMEE' }), { status: 409 }));
      lectures += 1;
      return vrai(u, i);
    });
    cliquer(casea(h));
    cliquer(bouton(h));
    await attendre(300);
    expect(principal(h).textContent).toContain(abonnement.erreurs.VERSION_PERIMEE);
    expect(lectures).toBeGreaterThan(0);
  });

  it('erreur-de-lecture-ne-bloque-pas', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('réseau coupé')));
    const routeur = creerRouteur(ECRANS, createMemoryHistory({ initialEntries: ['/banque'] }));
    const hote = document.body.appendChild(document.createElement('div'));
    racine = createRoot(hote);
    await act(async () => {
      racine?.render(<RouterProvider router={routeur} />);
    });
    await attendre(500);
    expect(principal(hote).textContent).toBe('Écran fictif banque');
  });
});
